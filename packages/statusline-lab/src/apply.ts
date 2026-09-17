import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export interface ApplyOptions {
  readonly dryRun?: boolean;
  readonly force?: boolean;
  readonly home: string;
}

export type ApplyAction = 'add' | 'keep' | 'refuse' | 'repoint' | 'write';

export type ApplyTarget = 'statusLine' | 'subagentStatusLine' | 'trampoline';

export interface ApplyStep {
  readonly action: ApplyAction;
  readonly target: ApplyTarget;
}

export interface ApplyResult {
  readonly steps: readonly ApplyStep[];
}

const TRAMPOLINE_COMMAND = '~/.claude/statusline-command.sh';
const TRAMPOLINE_MARKER = '# statusline-lab trampoline';
const SETTINGS_KEYS: readonly ApplyTarget[] = [
  'statusLine',
  'subagentStatusLine',
];
const SETTINGS_VALUE = JSON.stringify({
  type: 'command',
  command: TRAMPOLINE_COMMAND,
});

const TRAMPOLINE = `${TRAMPOLINE_MARKER}
b=statusline.sh
[ "$1" = --subagent ] && b=subagent.sh
p=$(jq -r '.plugins["statusline@agentic"][0].installPath // empty' "$HOME/.claude/plugins/installed_plugins.json" 2>/dev/null)
if [ -z "$p" ]; then
    p=$(printf '%s\\n' "$HOME"/.claude/plugins/cache/agentic/statusline/*/ | sort -V | tail -1)
    p=\${p%/}
fi
[ -n "$p" ] || exit 0
[ -f "$p/bin/$b" ] || exit 0
exec bash "$p/bin/$b" "$@"
`;

function readOrNull(file: string): string | undefined {
  try {
    return readFileSync(file, 'utf8');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined;
    }
    throw e;
  }
}

function parseSettings(file: string, raw: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`${file} is not valid JSON`, { cause: e });
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${file} does not hold a settings object`);
  }
  return parsed as Record<string, unknown>;
}

function keyAction(value: unknown, force: boolean): ApplyAction {
  if (value === undefined) {
    return 'add';
  }
  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, unknown>;
    if (
      Object.keys(record).length === 2 &&
      record.type === 'command' &&
      record.command === TRAMPOLINE_COMMAND
    ) {
      return 'keep';
    }
  }
  return force ? 'repoint' : 'refuse';
}

function insertMembers(raw: string, keys: readonly string[]): string {
  const close = raw.lastIndexOf('}');
  if (close === -1) {
    throw new Error('settings.json has no closing brace to splice into');
  }
  let at = close;
  while (at > 0 && /\s/.test(raw[at - 1] ?? '')) {
    at -= 1;
  }
  const members = keys.map(key => `"${key}": ${SETTINGS_VALUE}`).join(',\n  ');
  const comma = raw.replace(/\s/g, '') === '{}' ? '' : ',';
  return `${raw.slice(0, at)}${comma}\n  ${members}${raw.slice(at)}`;
}

function repointMember(raw: string, key: string): string {
  const member = new RegExp(
    `("${key}"\\s*:\\s*)(?:null|true|false|-?\\d+(?:\\.\\d+)?|"(?:[^"\\\\]|\\\\.)*"|\\{[^{}]*\\})`,
  );
  if (!member.test(raw)) {
    throw new Error(
      `cannot find the "${key}" member to repoint in settings.json`,
    );
  }
  return raw.replace(
    member,
    (_match, head: string) => `${head}${SETTINGS_VALUE}`,
  );
}

export function apply({
  home,
  force = false,
  dryRun = false,
}: ApplyOptions): ApplyResult {
  const trampolineFile = join(home, '.claude', 'statusline-command.sh');
  const settingsFile = join(home, '.claude', 'settings.json');

  const trampolineRaw = readOrNull(trampolineFile);
  const trampolineAction: ApplyAction =
    trampolineRaw === undefined
      ? 'write'
      : trampolineRaw.split('\n')[0] === TRAMPOLINE_MARKER
        ? 'keep'
        : force
          ? 'write'
          : 'refuse';

  const settingsRaw = readOrNull(settingsFile);
  const settings =
    settingsRaw === undefined
      ? undefined
      : parseSettings(settingsFile, settingsRaw);
  const keySteps = SETTINGS_KEYS.map(key => ({
    target: key,
    action: keyAction(settings?.[key], force),
  }));
  const steps: readonly ApplyStep[] = [
    { target: 'trampoline', action: trampolineAction },
    ...keySteps,
  ];
  if (dryRun) {
    return { steps };
  }

  if (trampolineAction === 'write') {
    mkdirSync(dirname(trampolineFile), { recursive: true });
    writeFileSync(trampolineFile, TRAMPOLINE);
    chmodSync(trampolineFile, 0o755);
  }
  const adds = keySteps
    .filter(step => step.action === 'add')
    .map(step => step.target);
  const repoints = keySteps
    .filter(step => step.action === 'repoint')
    .map(step => step.target);
  if (settingsRaw === undefined) {
    if (adds.length > 0) {
      mkdirSync(dirname(settingsFile), { recursive: true });
      writeFileSync(
        settingsFile,
        `{\n  "statusLine": ${SETTINGS_VALUE},\n  "subagentStatusLine": ${SETTINGS_VALUE}\n}\n`,
      );
    }
  } else if (adds.length > 0 || repoints.length > 0) {
    let text = adds.length > 0 ? insertMembers(settingsRaw, adds) : settingsRaw;
    for (const key of repoints) {
      text = repointMember(text, key);
    }
    writeFileSync(settingsFile, text);
  }
  return { steps };
}
