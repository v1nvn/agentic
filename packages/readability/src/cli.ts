import {
  type CliSpec,
  describeError,
  HelpRequested,
  parseCli,
  runCli,
} from '@v1nvn/agentic-core';

import { extractArticleFromHtml } from './tools/extract.ts';
import { readHtmlFile } from './tools/html-source.ts';

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
    throw new Error('must be an integer');
  }
  return n;
}

const spec: CliSpec = {
  name: 'readability',
  usageExit: 2,
  commands: [
    {
      name: 'extract',
      description: 'extract the readable article from an HTML file',
      argument: {
        flags: '[file]',
        description: 'HTML file; stdin when omitted',
      },
      options: [
        {
          flags: '--format <fmt>',
          description: 'output format',
          choices: FORMATS,
          default: 'md',
        },
        {
          flags: '--max-chars <n>',
          description: 'truncate the output',
          parse: parseMaxChars,
        },
      ],
      run: async (options, args) => {
        try {
          const html = await readHtml(args.at(0), process.stdin);
          // json reuses the markdown pipeline; the structured object is serialized below.
          const pipelineFormat =
            options.format === 'html' ? 'html' : 'markdown';
          const result = extractArticleFromHtml({
            html,
            format: pipelineFormat,
            ...(typeof options.maxChars === 'number'
              ? { maxChars: options.maxChars }
              : {}),
          });

          if (result.isError) {
            process.stderr.write(`${payloadText(result)}\n`);
            return 1;
          }

          if (options.format === 'json') {
            process.stdout.write(
              `${JSON.stringify(result.structuredContent, null, 2)}\n`,
            );
          } else {
            process.stdout.write(`${payloadText(result)}\n`);
          }
          return 0;
        } catch (err) {
          process.stderr.write(`${describeError(err)}\n`);
          return 1;
        }
      },
    },
  ],
};

export function parseArgs(
  argv: readonly string[],
): HelpRequested | ParsedArgs | undefined {
  const parsed = parseCli(spec, argv);
  if (parsed === undefined || parsed instanceof HelpRequested) {
    return parsed;
  }
  const { format, maxChars } = parsed.options as {
    format: CliFormat;
    maxChars: number | undefined;
  };
  return { file: parsed.args.at(0), format, maxChars };
}

// The stream is injected rather than reading process.stdin directly so the
// path is testable; chunks may be Buffer or string.
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

export function runExtract(argv: readonly string[]): Promise<number> {
  return runCli(spec, argv);
}
