import { readFileSync, statSync } from 'node:fs';

export function readAll(stream: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    stream.setEncoding('utf8');
    stream.on('data', (chunk: string) => {
      data += chunk;
    });
    stream.on('end', () => {
      resolve(data);
    });
    stream.on('error', reject);
  });
}

export function readStdin(
  stream: NodeJS.ReadableStream = process.stdin,
): Promise<string> {
  return readAll(stream);
}

/** A markdown file's contents, with the CLI's no-such-file error. */
export function readMarkdownFile(path: string): string {
  const stats = statSync(path, { throwIfNoEntry: false });
  if (!stats?.isFile()) {
    throw new Error(`no such file: ${path}`);
  }
  return readFileSync(path, 'utf8');
}
