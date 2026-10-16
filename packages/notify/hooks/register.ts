/**
 * The notify mod: a permission prompt and a true-done turn each become one
 * native macOS banner — repo and session named, the engine's own message or
 * the reply's closing line carried, a sound per class. A stop with background
 * work or a scheduled wakeup in flight is a pause, not a finish: it stays
 * silent.
 */

import type { EngineInterface, On } from 'claude-code';

const BANNER_CAP = 120;
const SOUNDS = { done: 'Glass', permission: 'Funk' } as const;

/** The AppleScript string literal for `text`: backslash and quote escaped. */
function quoted(text: string): string {
  return `"${text.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
}

function banner(
  kind: keyof typeof SOUNDS,
  title: string,
  subtitle: string,
  message: string,
): readonly string[] {
  return [
    'osascript',
    '-e',
    `display notification ${quoted(message)} with title ${quoted(title)} subtitle ${quoted(subtitle)} sound name ${quoted(SOUNDS[kind])}`,
  ];
}

function closingLine(message: string | undefined): string {
  const line = (message ?? '')
    .split('\n')
    .map(line => line.trim())
    .find(line => line !== '');
  if (line === undefined) {
    return 'Turn finished';
  }
  return line.length > BANNER_CAP ? `${line.slice(0, BANNER_CAP - 1)}…` : line;
}

interface BannerFacts {
  readonly cwd: string;
  readonly session_id: string;
}

/** The registry entry's name when it is this session's, a non-empty string. */
function registryName(text: string, sessionId: string): string | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return undefined;
  }
  const { sessionId: id, name } = parsed as {
    name?: unknown;
    sessionId?: unknown;
  };
  return id === sessionId && typeof name === 'string' && name !== ''
    ? name
    : undefined;
}

/**
 * The session's title — the one the engine itself shows — from its live
 * registry, `~/.claude/sessions/<pid>.json`, freshest entry first; the short
 * id when no entry names it.
 */
async function sessionTitle(
  $: EngineInterface,
  sessionId: string,
): Promise<string> {
  const fallback = `session ${sessionId.slice(0, 6)}`;
  const home = await $.env.get('HOME');
  if (home === undefined) {
    return fallback;
  }
  const dir = `${home}/.claude/sessions`;
  const entries = await $.fs.list(dir).catch(() => undefined);
  const files = [...(entries ?? [])]
    .filter(entry => entry.kind === 'file' && entry.name.endsWith('.json'))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
  for (const file of files) {
    const text = await $.fs.read(`${dir}/${file.name}`).catch(() => undefined);
    if (text === undefined) {
      continue;
    }
    const name = registryName(text, sessionId);
    if (name !== undefined) {
      return name;
    }
  }
  return fallback;
}

async function post(
  $: EngineInterface,
  e: BannerFacts,
  kind: keyof typeof SOUNDS,
  message: string,
): Promise<void> {
  const repo = e.cwd.split('/').filter(Boolean).at(-1) ?? e.cwd;
  const result = await $.process.run(
    banner(
      kind,
      `${repo} · ${kind}`,
      await sessionTitle($, e.session_id),
      message,
    ),
  );
  if (result.exitCode !== 0) {
    $.ui.log(`notify: osascript exited ${result.exitCode}: ${result.stderr}`, {
      to: 'debug',
    });
  }
}

export function register(on: On): void {
  on(
    'classic.Notification',
    { notification_type: 'permission_prompt' },
    async ($: EngineInterface, e, next) => {
      await post($, e, 'permission', e.message).catch(() => undefined);
      return next(e);
    },
  );

  on('classic.Stop', async ($: EngineInterface, e, next) => {
    if (
      (e.background_tasks?.length ?? 0) + (e.session_crons?.length ?? 0) ===
      0
    ) {
      await post($, e, 'done', closingLine(e.last_assistant_message)).catch(
        () => undefined,
      );
    }
    return next(e);
  });
}
