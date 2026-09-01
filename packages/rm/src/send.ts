/**
 * Convert Markdown to EPUB (pandoc) and push it to the reMarkable over SSH.
 *
 *   rm-send path/to/reply.md     # from a file
 *   rm-send                      # from the last Claude reply (core.lastReply)
 *
 * Env knobs: REMARKABLE_HOST (default: remarkable), REMARKABLE_DIR (default: /home/root/books)
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function timestamp(now: Date): string {
  function p(n: number): string {
    return String(n).padStart(2, '0');
  }
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())} ${p(now.getHours())}:${p(now.getMinutes())}`;
}

/** Title = first Markdown heading, else a timestamp. */
export function titleOf(markdown: string, now = new Date()): string {
  const heading = markdown.split('\n').find(line => line.startsWith('#'));
  return heading?.replace(/^#+\s*/, '') || `Claude reply ${timestamp(now)}`;
}

/** Slugify a title into a safe filename: runs of non-alphanumerics → '_', capped at 60 chars. */
export function slugify(title: string): string {
  return title.replaceAll(/[^a-zA-Z0-9]+/g, '_').slice(0, 60);
}

function run(cmd: string, args: string[]): void {
  const res = spawnSync(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  if (res.error) {
    throw new Error(`${cmd}: ${res.error.message}`);
  }
  if (res.status !== 0) {
    throw new Error(`${cmd} failed: ${res.stderr.toString().trim()}`);
  }
}

/** Returns the "Sent: …" status line; throws with the failing command's output. */
export function sendToRemarkable(markdown: string): string {
  const host = process.env.REMARKABLE_HOST ?? 'remarkable';
  const dir = process.env.REMARKABLE_DIR ?? '/home/root/books';
  const title = titleOf(markdown);
  const safe = slugify(title);

  const tmp = mkdtempSync(join(tmpdir(), 'rm-send-'));
  try {
    const mdPath = join(tmp, 'reply.md');
    const epubPath = join(tmp, `${safe}.epub`);
    writeFileSync(mdPath, markdown);
    run('pandoc', [mdPath, '-o', epubPath, '--metadata', `title=${title}`]);
    run('ssh', [host, `mkdir -p '${dir}'`]);
    run('scp', ['-q', epubPath, `${host}:${dir}/${safe}.epub`]);
    return `Sent: ${safe}.epub → ${host}:${dir}`;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
