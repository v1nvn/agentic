import { parseQuietly } from '@v1nvn/agentic-core';
import { Command, InvalidArgumentError, Option } from 'commander';

import { extractArticleFromHtml } from './tools/extract.js';
import { readHtmlFile } from './tools/html-source.js';

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { Readable } from 'node:stream';

type CliFormat = 'html' | 'json' | 'md';

export interface ParsedArgs {
  readonly file: string | undefined;
  readonly format: CliFormat;
  readonly maxChars: number | undefined;
}

const FORMATS: readonly CliFormat[] = ['html', 'json', 'md'];

function parseMaxChars(value: string): number {
  const n = Number(value);
  if (!Number.isInteger(n)) {
    throw new InvalidArgumentError('must be an integer');
  }
  return n;
}

export function buildProgram(): Command {
  return new Command('readability-mcp extract')
    .argument('[file]', 'HTML file; stdin when omitted')
    .addOption(
      new Option('--format <fmt>', 'output format')
        .choices(FORMATS)
        .default('md'),
    )
    .option('--max-chars <n>', 'truncate the output', parseMaxChars);
}

export function parseArgs(argv: readonly string[]): ParsedArgs | undefined {
  const program = parseQuietly(buildProgram(), argv.slice(1));
  if (program === undefined) {
    return undefined;
  }
  const { format, maxChars } = program.opts<{
    format: CliFormat;
    maxChars: number | undefined;
  }>();
  return { file: program.args.at(0), format, maxChars };
}

// The stream is injected rather than reading process.stdin directly so the
// path is testable. Chunks may be Buffer (process.stdin) or string
// (Readable.from), so both are handled.
export async function readHtml(
  file: string | undefined,
  stream: Readable,
): Promise<string> {
  if (file !== undefined) {
    return readHtmlFile(file);
  }
  const chunks: string[] = [];
  for await (const chunk of stream) {
    if (typeof chunk === 'string') {
      chunks.push(chunk);
    } else {
      chunks.push(Buffer.from(chunk as Uint8Array).toString('utf8'));
    }
  }
  return chunks.join('');
}

function payloadText(result: CallToolResult): string {
  const first = result.content.at(0);
  return first !== undefined && 'text' in first ? first.text : '';
}

export async function runCli(argv: readonly string[]): Promise<number> {
  if (argv[0] !== 'extract') {
    process.stderr.write(buildProgram().helpInformation());
    return 2;
  }

  const parsed = parseArgs(argv);
  if (parsed === undefined) {
    process.stderr.write(buildProgram().helpInformation());
    return 2;
  }

  try {
    const html = await readHtml(parsed.file, process.stdin);
    // json reuses the markdown pipeline; the structured object is serialized below.
    const pipelineFormat = parsed.format === 'html' ? 'html' : 'markdown';
    const result = extractArticleFromHtml({
      html,
      format: pipelineFormat,
      ...(parsed.maxChars !== undefined ? { maxChars: parsed.maxChars } : {}),
    });

    if (result.isError) {
      process.stderr.write(`${payloadText(result)}\n`);
      return 1;
    }

    if (parsed.format === 'json') {
      process.stdout.write(
        `${JSON.stringify(result.structuredContent, null, 2)}\n`,
      );
    } else {
      process.stdout.write(`${payloadText(result)}\n`);
    }
    return 0;
  } catch (err) {
    process.stderr.write(
      `${err instanceof Error ? err.message : String(err)}\n`,
    );
    return 1;
  }
}
