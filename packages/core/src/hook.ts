import { statSync } from 'node:fs';

export interface HookEvent {
  cwd?: string;
  session_id?: string;
  transcript_path?: string;
}

/**
 * Read the Claude Code hook event JSON from stdin; empty or unparseable input
 * yields an empty event, never a thrown error — a hook must always answer.
 */
export function readHookEvent(
  stream: NodeJS.ReadableStream = process.stdin,
): Promise<HookEvent> {
  return new Promise(resolve => {
    let data = '';
    stream.setEncoding('utf8');
    stream.on('data', (chunk: string) => {
      data += chunk;
    });
    stream.on('end', () => {
      try {
        resolve(JSON.parse(data) as HookEvent);
      } catch {
        resolve({});
      }
    });
    stream.on('error', () => {
      resolve({});
    });
  });
}

/**
 * Which transcript lastReply should read, per the hook event: transcript_path
 * when it names a real file, else session_id, else nothing (lastReply then
 * falls back to the newest session for the current project).
 */
export function replyTarget(event: HookEvent): string | undefined {
  if (event.transcript_path !== undefined && isFile(event.transcript_path)) {
    return event.transcript_path;
  }
  return event.session_id || undefined;
}

function isFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

/**
 * Print the UserPromptExpansion decision for a zero-token command: `block`
 * keeps the command from reaching the model, with the output as the `reason`.
 */
export function emitHookBlock(reason: string): void {
  process.stdout.write(`${JSON.stringify({ decision: 'block', reason })}\n`);
}
