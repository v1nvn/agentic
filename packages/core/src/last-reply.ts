import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

interface ContentBlock {
  text?: string;
  type: string;
}

interface TranscriptEntry {
  message?: { content?: unknown };
  type?: string;
}

function isFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

function textBlocks(entry: TranscriptEntry): ContentBlock[] | undefined {
  const content = entry.message?.content;
  if (entry.type !== 'assistant' || !Array.isArray(content)) {
    return undefined;
  }
  const blocks = content.filter(
    (b): b is ContentBlock =>
      typeof b === 'object' &&
      b !== null &&
      (b as ContentBlock).type === 'text',
  );
  return blocks.length > 0 ? blocks : undefined;
}

/**
 * The last assistant text reply from a Claude Code session, reproducing Claude
 * Code's `/copy` byte-for-byte: the last assistant entry that contains a
 * `text` block, only its `text` block(s) (tool_use / thinking dropped), blocks
 * joined with a blank line, and no trailing newline.
 *
 * @param arg a transcript file, a session UUID under the project dir, or
 *   nothing to use the newest session for the current project.
 */
export function lastReply(arg?: string): string {
  const claudeDir = process.env.CLAUDE_DIR ?? join(homedir(), '.claude');
  // Claude Code keys transcripts under the project root with "/" → "-".
  // Prefer $CLAUDE_PROJECT_DIR (exported to hook processes) over $PWD.
  const proj = (process.env.CLAUDE_PROJECT_DIR ?? process.cwd()).replaceAll(
    '/',
    '-',
  );
  const projDir = join(claudeDir, 'projects', proj);

  let file: string | undefined;
  if (arg !== undefined) {
    file = isFile(arg) ? arg : join(projDir, `${arg}.jsonl`);
  } else if (existsSync(projDir)) {
    const newest = readdirSync(projDir)
      .filter(f => f.endsWith('.jsonl'))
      .map(f => ({ f, mtimeMs: statSync(join(projDir, f)).mtimeMs }))
      .sort((a, b) => b.mtimeMs - a.mtimeMs)
      .at(0);
    if (newest) {
      file = join(projDir, newest.f);
    }
  }

  if (file === undefined || !isFile(file)) {
    throw new Error(`no session transcript found in ${projDir}`);
  }

  let last: ContentBlock[] | undefined;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.includes('"assistant"')) {
      continue;
    }
    let entry: TranscriptEntry;
    try {
      entry = JSON.parse(line) as TranscriptEntry;
    } catch {
      continue;
    }
    const blocks = textBlocks(entry);
    if (blocks) {
      last = blocks;
    }
  }
  return (last ?? []).map(b => b.text ?? '').join('\n\n');
}
