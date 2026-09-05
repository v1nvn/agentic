/**
 * Send Markdown to the self-hosted Markdown-Viewer as a #share= URL — opens it
 * in the browser and copies the URL.
 *
 *   md-send path/to/reply.md     # from a file
 *   md-send -                    # from stdin
 *   md-send                      # from the last Claude reply (core.lastReply)
 *   md-send --view               # open read-only (no edit pane)
 *
 * Env knobs: MD_VIEWER_URL (default: https://md.v1n.space), MD_NO_OPEN=1 (skip browser).
 */

import { spawnSync } from 'node:child_process';
import { deflateSync } from 'node:zlib';

/**
 * Encode Markdown into the Markdown-Viewer share token.
 *
 * Pipeline: UTF-8 bytes → zlib deflate (RFC 1950, pako.deflate-compatible) →
 * base64url. Matches Markdown-Viewer's encodeMarkdownForShare() in script.js
 * byte-for-byte — the decoder (pako.inflate) accepts any valid zlib stream, so
 * compression level is irrelevant.
 */
export function encodeShare(markdown: string): string {
  return deflateSync(Buffer.from(markdown, 'utf8'))
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
}

export function shareUrl(markdown: string, view = false): string {
  const base = (process.env.MD_VIEWER_URL ?? 'https://md.v1n.space').replace(
    /\/+$/,
    '',
  );
  const mode = view ? '' : '&edit=1';
  // Without `edit=1` the viewer opens the snapshot read-only — preview pane
  // only, with edit and split disabled (Markdown-Viewer script.js: loadFromShareHash).
  return `${base}/#share=${encodeShare(markdown)}${mode}`;
}

function copyToClipboard(text: string): boolean {
  try {
    return (
      spawnSync('pbcopy', { input: text, stdio: ['pipe', 'ignore', 'ignore'] })
        .status === 0
    );
  } catch {
    return false;
  }
}

function openUrl(url: string): boolean {
  try {
    return spawnSync('open', [url], { stdio: 'ignore' }).status === 0;
  } catch {
    return false;
  }
}

export function statusLine(opened: boolean, copied: boolean): string {
  if (opened && copied) {
    return 'Opened in Markdown-Viewer (link copied).';
  }
  if (opened) {
    return 'Opened in Markdown-Viewer.';
  }
  if (copied) {
    return 'Markdown-Viewer link copied to clipboard.';
  }
  return 'Markdown-Viewer link ready.';
}

/** Shares the markdown and returns the status line; the URL itself is never printed. */
export function mdSend(markdown: string, view = false): string {
  const url = shareUrl(markdown, view);
  const copied = copyToClipboard(url);
  const opened = process.env.MD_NO_OPEN === undefined && openUrl(url);
  return statusLine(opened, copied);
}
