import {
  existsSync,
  readdirSync,
  rmdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

import {
  isObject,
  isOurMember,
  readOrNull,
  removeMembers,
  rootMemberValueSpan,
  SETTINGS_KEYS,
  type SettingsBackup,
  type SettingsKey,
} from './configure.js';
import { backupPath, DATA_REL } from './resolve.js';

export interface RestoreOptions {
  readonly dryRun?: boolean;
  readonly force?: boolean;
  readonly home: string;
}

export type RestoreResult =
  | { mode: 'dry-run'; text: string }
  | { mode: 'nothing'; text: string }
  | { mode: 'restored'; text: string };

type KeyAction =
  | { readonly key: SettingsKey; readonly kind: 'remove' }
  | {
      readonly key: SettingsKey;
      readonly kind: 'splice';
      readonly text: string;
    };

export function readBackup(home: string): null | SettingsBackup {
  const file = backupPath(home);
  const raw = readOrNull(file);
  if (raw === null) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`${file} is not valid JSON`, { cause: e });
  }
  if (
    !isObject(parsed) ||
    typeof parsed.createdFile !== 'boolean' ||
    !isObject(parsed.keys)
  ) {
    throw new Error(`${file} is not a lab backup`);
  }
  const keys: Partial<Record<SettingsKey, string>> = {};
  for (const key of SETTINGS_KEYS) {
    const saved = parsed.keys[key];
    if (typeof saved === 'string') {
      keys[key] = saved;
    }
  }
  return { createdFile: parsed.createdFile, keys };
}

function rmdirIfEmpty(dir: string): void {
  try {
    rmdirSync(dir);
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code !== 'ENOTEMPTY' && code !== 'ENOENT' && code !== 'ENOTDIR') {
      throw e;
    }
  }
}

function clearCaptures(dir: string): void {
  if (!existsSync(dir)) {
    return;
  }
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isFile()) {
      rmSync(join(dir, entry.name), { force: true });
    }
  }
  rmdirIfEmpty(dir);
}

function planActions(
  raw: string,
  backup: null | SettingsBackup,
  force: boolean,
): readonly KeyAction[] {
  const actions: KeyAction[] = [];
  for (const key of SETTINGS_KEYS) {
    const span = rootMemberValueSpan(raw, key);
    if (span === null) {
      continue;
    }
    const memberRaw = raw.slice(span[0], span[1]);
    const saved = backup === null ? undefined : backup.keys[key];
    if (isOurMember(key, JSON.parse(memberRaw))) {
      actions.push(
        saved === undefined
          ? { kind: 'remove', key }
          : { kind: 'splice', key, text: saved },
      );
    } else if (saved !== undefined && memberRaw !== saved) {
      if (!force) {
        throw new Error(
          `settings.json ${key} changed since the lab took it over — rerun with --force to put the saved value back`,
        );
      }
      actions.push({ kind: 'splice', key, text: saved });
    }
  }
  return actions;
}

export function restore(options: RestoreOptions): RestoreResult {
  const settings = join(options.home, '.claude', 'settings.json');
  const backup = readBackup(options.home);
  const raw = readOrNull(settings);

  const actions =
    raw === null ? [] : planActions(raw, backup, options.force ?? false);
  const removals: SettingsKey[] = [];
  const splices: { key: SettingsKey; text: string }[] = [];
  for (const action of actions) {
    if (action.kind === 'remove') {
      removals.push(action.key);
    } else {
      splices.push(action);
    }
  }

  let next: null | string = raw;
  let deleteFile = false;
  if (actions.length > 0 && raw !== null) {
    let text = removals.length > 0 ? removeMembers(raw, removals) : raw;
    for (const splice of splices) {
      const span = rootMemberValueSpan(text, splice.key);
      if (span === null) {
        throw new Error(
          `cannot find the "${splice.key}" member to restore in settings.json`,
        );
      }
      text = `${text.slice(0, span[0])}${splice.text}${text.slice(span[1])}`;
    }
    const membersLeft = Object.keys(JSON.parse(text) as object).length;
    if (backup !== null && backup.createdFile && membersLeft === 0) {
      deleteFile = true;
      next = null;
    } else {
      next = text;
    }
  }

  const dataDir = join(options.home, DATA_REL);
  const capturesDir = join(dataDir, 'captures');
  const backupFile = backupPath(options.home);
  if (
    actions.length === 0 &&
    !existsSync(backupFile) &&
    !existsSync(capturesDir)
  ) {
    return {
      mode: 'nothing',
      text: 'nothing to restore — no lab keys in settings.json, no backup, no captures',
    };
  }

  if (options.dryRun) {
    const lines = ['restore plan — nothing written'];
    for (const action of actions) {
      lines.push(
        action.kind === 'remove'
          ? `  remove ${action.key} (absent before the lab)`
          : `  splice the saved ${action.key} value back`,
      );
    }
    if (deleteFile) {
      lines.push(
        '  delete settings.json (the lab created it and it is now empty)',
      );
    }
    if (existsSync(capturesDir)) {
      lines.push('  delete captures/');
    }
    if (existsSync(backupFile)) {
      lines.push('  delete backup.json');
    }
    lines.push('  remove the data dir if empty');
    return { mode: 'dry-run', text: lines.join('\n') };
  }

  if (deleteFile) {
    rmSync(settings, { force: true });
  } else if (next !== null && actions.length > 0) {
    writeFileSync(settings, next);
  }
  clearCaptures(capturesDir);
  rmSync(backupFile, { force: true });
  rmdirIfEmpty(dataDir);
  let line: string;
  if (deleteFile) {
    line = 'restored — settings.json is gone, exactly as before the lab';
  } else if (actions.length > 0) {
    line = 'keys restored — settings.json holds its pre-lab values again';
  } else {
    line = 'lab data cleaned — no lab keys in settings.json';
  }
  return { mode: 'restored', text: line };
}
