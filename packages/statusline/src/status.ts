import { existsSync, statSync } from 'node:fs';
import { delimiter, join } from 'node:path';

import {
  isOurMember,
  memberCommand,
  parseSettings,
  readOrNull,
  SETTINGS_KEYS,
  type SettingsBackup,
  type SettingsKey,
} from './configure.js';
import { DATA_DIR } from './render/capture.js';
import { specFor } from './render/index.js';
import { resolveInstall } from './render/install-record.js';
import { layoutItemsOf } from './render/layout.js';
import {
  capturePath,
  parsePanelCommand,
  readKeyConfig,
  renderMjsPath,
  type ScriptConfig,
} from './resolve.js';
import { readBackup } from './restore.js';

export interface StatusOptions {
  readonly home: string;
  readonly path?: string;
}

export interface StatusResult {
  readonly healthy: boolean;
  readonly rows: readonly string[];
}

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
    return `${key}: absent — fix: rerun configure --theme classic`;
  }
  return `${key}: foreign${state.command === null ? '' : ` (${state.command})`} — fix: rerun configure --force --theme classic`;
}

function keyItems(config: ScriptConfig): readonly string[] {
  const layout = config.layout === null ? [] : layoutItemsOf(config.layout);
  return [...new Set([...layout, ...Object.keys(config.values)])];
}

function configDetail(config: ScriptConfig): string {
  const assignments = keyItems(config)
    .filter(item => Object.hasOwn(config.values, item))
    .map(item => `${item}=${config.values[item]}`);
  return [
    ...(config.layout === null ? [] : [`layout='${config.layout}'`]),
    ...assignments,
  ].join(' ');
}

function panelDetail(config: ScriptConfig): string {
  return [
    ...(config.theme === undefined ? [] : [`theme=${config.theme}`]),
    ...Object.entries(config.values).map(([item, alt]) => `${item}=${alt}`),
  ].join(' ');
}

// The row names what the key names — the theme plus the swaps it carries,
// never a pick-matching derivation.
function themeRow(config: ScriptConfig): readonly string[] {
  if (config.theme === undefined) {
    return [];
  }
  const swaps = Object.entries(config.values).map(
    ([item, alt]) => `+${item}=${alt}`,
  );
  return [`theme: ${[config.theme, ...swaps].join(' ')}`];
}

type DriftFinding =
  | {
      readonly alt: string;
      readonly item: string;
      readonly kind: 'unknown-variant';
    }
  | { readonly item: string; readonly kind: 'unknown-item' };

function findingText(finding: DriftFinding): string {
  return finding.kind === 'unknown-item'
    ? `unknown item '${finding.item}'`
    : `unknown variant '${finding.alt}' for '${finding.item}'`;
}

function driftFindings(config: ScriptConfig): readonly DriftFinding[] {
  const findings: DriftFinding[] = [];
  for (const item of keyItems(config)) {
    const entry = specFor(item);
    if (entry === undefined) {
      findings.push({ item, kind: 'unknown-item' });
      continue;
    }
    const alt = Object.hasOwn(config.values, item) ? config.values[item] : null;
    if (alt !== null && !entry.alternatives.includes(alt)) {
      findings.push({ alt, item, kind: 'unknown-variant' });
    }
  }
  return findings;
}

// The settings keys spawn plain `node`, not this CLI's runtime — PATH is the
// one thing the paint needs that the CLI cannot vouch for.
export function nodeOnPath(pathVar: string): null | string {
  const found = pathVar
    .split(delimiter)
    .filter(dir => dir !== '')
    .map(dir => join(dir, 'node'))
    .find(existsSync);
  return found ?? null;
}

type RendererState =
  | { readonly kind: 'missing' }
  | { readonly kind: 'resolves'; readonly version: string }
  | { readonly kind: 'unresolved'; readonly reason: string };

function rendererState(home: string): RendererState {
  if (!existsSync(renderMjsPath(home))) {
    return { kind: 'missing' };
  }
  const record = resolveInstall(home);
  return record.kind === 'resolved'
    ? { kind: 'resolves', version: record.version }
    : { kind: 'unresolved', reason: record.reason };
}

function rendererRow(state: RendererState, theme: string): string {
  if (state.kind === 'resolves') {
    return `renderer: resolves → ${state.version}`;
  }
  if (state.kind === 'missing') {
    // --force so the fix also completes on a home holding foreign keys.
    return `renderer: missing — fix: rerun configure --force --theme ${theme}`;
  }
  return `renderer: unresolved — ${state.reason} — fix: claude plugin install statusline@agentic`;
}

function configRow(findings: readonly DriftFinding[], theme: string): string {
  if (findings.length === 0) {
    return 'config: no drift';
  }
  return `config: drift — ${findings.map(findingText).join(', ')} — fix: rerun configure --theme ${theme}`;
}

function backupRow(home: string): string {
  let backup: null | SettingsBackup;
  try {
    backup = readBackup(home);
  } catch {
    return `backup: unreadable — fix: delete ~/${DATA_DIR}/backup.json`;
  }
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

export function status(options: StatusOptions): StatusResult {
  const members = settingsMembers(options.home);
  const main = keyState('statusLine', members.statusLine);
  const subagent = keyState('subagentStatusLine', members.subagentStatusLine);
  const config = readKeyConfig(options.home);
  const theme = config.theme ?? 'classic';
  const panelConfig = parsePanelCommand(
    memberCommand(members.subagentStatusLine),
  );
  const findings = main.kind === 'ours' ? driftFindings(config) : [];
  const node = nodeOnPath(options.path ?? process.env.PATH ?? '');
  const renderer = rendererState(options.home);

  const rows = [
    node === null
      ? 'node: missing — fix: install node ≥ 18 from nodejs.org, then restart Claude Code'
      : `node: on PATH (${node})`,
    rendererRow(renderer, theme),
    keyRow('statusLine', main, configDetail(config)),
    keyRow('subagentStatusLine', subagent, panelDetail(panelConfig)),
    ...(main.kind === 'ours'
      ? [configRow(findings, theme), ...themeRow(config)]
      : []),
    backupRow(options.home),
    capturesRow(options.home),
  ];
  const healthy =
    node !== null &&
    renderer.kind === 'resolves' &&
    main.kind === 'ours' &&
    subagent.kind === 'ours' &&
    findings.length === 0;
  return { healthy, rows: [...rows, healthy ? 'healthy' : 'unhealthy'] };
}
