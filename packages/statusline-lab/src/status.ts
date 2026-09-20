import { statSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

import {
  isOurMember,
  memberCommand,
  parseClusters,
  parseSettings,
  readOrNull,
  SETTINGS_KEYS,
  type SettingsKey,
} from './configure.js';
import {
  capturePath,
  readKeyConfig,
  type ResolvedRuntime,
  resolveRuntime,
  type ScriptConfig,
} from './resolve.js';
import { readBackup } from './restore.js';

export interface StatusOptions {
  readonly home: string;
}

export interface StatusResult {
  readonly healthy: boolean;
  readonly rows: readonly string[];
}

const INSTALL_FIX = 'claude plugin install statusline-lab@agentic';

type KeyState =
  | { readonly command: null | string; readonly kind: 'foreign' }
  | { readonly kind: 'absent' }
  | { readonly kind: 'ours' };

function keyState(key: SettingsKey, value: unknown): KeyState {
  if (value === undefined) {
    return { kind: 'absent' };
  }
  if (isOurMember(key, value)) {
    return { kind: 'ours' };
  }
  return { kind: 'foreign', command: memberCommand(value) };
}

function keyRow(key: SettingsKey, state: KeyState, detail = ''): string {
  if (state.kind === 'ours') {
    return `${key}: ours${detail === '' ? '' : ` — ${detail}`}`;
  }
  if (state.kind === 'absent') {
    return `${key}: absent — fix: rerun configure --fallback=existing`;
  }
  return `${key}: foreign${state.command === null ? '' : ` (${state.command})`} — fix: rerun configure --force`;
}

function layoutItemsOf(layout: string): readonly string[] {
  const items: string[] = [];
  for (const cluster of parseClusters(layout)) {
    for (const item of cluster) {
      if (!items.includes(item)) {
        items.push(item);
      }
    }
  }
  return items;
}

function configDetail(config: ScriptConfig): string {
  if (config.layout === null) {
    return '';
  }
  const assignments = layoutItemsOf(config.layout)
    .filter(item => Object.hasOwn(config.values, item))
    .map(item => `${item}=${config.values[item]}`);
  return [`layout='${config.layout}'`, ...assignments].join(' ');
}

function driftFindings(
  config: ScriptConfig,
  runtime: ResolvedRuntime,
): readonly string[] {
  if (config.layout === null) {
    return [];
  }
  const byItem = new Map(runtime.items.map(entry => [entry.item, entry]));
  const findings: string[] = [];
  for (const item of layoutItemsOf(config.layout)) {
    const entry = byItem.get(item);
    if (entry === undefined) {
      findings.push(`unknown item '${item}'`);
      continue;
    }
    const alt = Object.hasOwn(config.values, item) ? config.values[item] : null;
    if (alt !== null && !entry.alternatives.includes(alt)) {
      findings.push(`unknown variant '${alt}' for '${item}'`);
    }
  }
  return findings;
}

function runtimeRow(runtime: null | ResolvedRuntime): string {
  if (runtime === null) {
    return `runtime: missing — fix: ${INSTALL_FIX}`;
  }
  const version = basename(dirname(runtime.dir));
  return `runtime: ${version} — ${runtime.items.length} items`;
}

function configRow(findings: readonly string[]): string {
  if (findings.length === 0) {
    return 'config: no drift';
  }
  return `config: drift — ${findings.join(', ')} — fix: rerun configure --fallback=existing`;
}

function backupRow(home: string): string {
  const backup = readBackup(home);
  if (backup === null) {
    return 'backup: absent';
  }
  const saved = SETTINGS_KEYS.filter(key => backup.keys[key] !== undefined);
  const parts = [
    ...(backup.createdFile ? ['created settings.json'] : []),
    saved.length > 0 ? `saved ${saved.join(', ')}` : 'saved nothing',
  ];
  return `backup: present — ${parts.join(', ')}`;
}

function ageText(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) {
    return `${Math.floor(ms / 1000)}s`;
  }
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }
  return `${Math.floor(hours / 24)}d`;
}

function captureText(home: string, surface: 'main' | 'tick'): string {
  try {
    const age = ageText(
      Date.now() - statSync(capturePath(home, surface)).mtimeMs,
    );
    return `${age} ago`;
  } catch {
    return 'absent';
  }
}

function capturesRow(home: string): string {
  const surfaces = (['main', 'tick'] as const).map(
    surface => `${surface} ${captureText(home, surface)}`,
  );
  return `captures: ${surfaces.join(', ')}`;
}

function settingsMembers(home: string): Record<string, unknown> {
  const file = join(home, '.claude', 'settings.json');
  const raw = readOrNull(file);
  return raw === null ? {} : parseSettings(file, raw);
}

function resolveOrNull(home: string): null | ResolvedRuntime {
  try {
    return resolveRuntime({ home });
  } catch {
    return null;
  }
}

export function status(options: StatusOptions): StatusResult {
  const runtime = resolveOrNull(options.home);
  const members = settingsMembers(options.home);
  const main = keyState('statusLine', members.statusLine);
  const subagent = keyState('subagentStatusLine', members.subagentStatusLine);
  const config = readKeyConfig(options.home);
  const findings =
    runtime === null || main.kind !== 'ours'
      ? []
      : driftFindings(config, runtime);

  const rows = [
    runtimeRow(runtime),
    keyRow('statusLine', main, configDetail(config)),
    keyRow('subagentStatusLine', subagent),
    ...(runtime !== null && main.kind === 'ours' ? [configRow(findings)] : []),
    backupRow(options.home),
    capturesRow(options.home),
  ];
  const healthy =
    runtime !== null &&
    main.kind === 'ours' &&
    subagent.kind === 'ours' &&
    findings.length === 0;
  return { healthy, rows: [...rows, healthy ? 'healthy' : 'unhealthy'] };
}
