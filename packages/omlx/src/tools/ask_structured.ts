import { z } from 'zod';

import type { ToolHandle } from '../server.ts';

import { loadConfig } from '../config.ts';
import { OmlxError } from '../errors.ts';
import { tool } from '../handler.ts';
import { askInputShape, chatCompletion } from './ask.ts';
import {
  buildChatCompletionRequest,
  type ChatCompletionRequest,
} from './chat.ts';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export const askStructuredInputShape = {
  ...askInputShape,
  schema: z
    .record(z.string(), z.unknown())
    .describe(
      'JSON Schema (draft-agnostic object) the output must match — e.g. {"type":"object","properties":{"files":{"type":"array","items":{"type":"string"}}},"required":["files"]}. Top-level arrays and scalars work too.',
    ),
  schema_name: z
    .string()
    .describe('Wire metadata name for the schema.')
    .default('response'),
};

export const askStructuredInputSchema = z.object(askStructuredInputShape);

export const askStructuredOutputSchema = {
  model: z.string().describe('The model id that produced the result.'),
  reasoning_fallback: z
    .boolean()
    .describe(
      'True when the model produced no content — `result` is then unparsed reasoning text.',
    ),
  result: z.unknown().describe('The parsed JSON value returned by the model.'),
};

export const ASK_STRUCTURED_TOOL_DESCRIPTION = `Ask the local Qwen3.8-27B on this Mac with schema-constrained output — the response must match the \`schema\` JSON Schema, returned as parsed JSON, not prose. Free, private, unlimited, ~28 tok/s, 256K context. Prefer this over asking \`ask\` for JSON whenever the shape is known: entities from logs, frontmatter, tables from prose, bbox JSON from a screenshot (give file paths in \`images\`), classification tags. Keep schemas shallow — deep nesting and long enums tax a 27B model. Do NOT route hard reasoning or multi-file analysis here — quality is a step down from cloud models.`;

async function runAskStructured(
  input: z.infer<typeof askStructuredInputSchema>,
): Promise<CallToolResult> {
  const config = loadConfig();
  const request: ChatCompletionRequest = buildChatCompletionRequest(
    config,
    input,
    {
      json_schema: { name: input.schema_name, schema: input.schema },
      type: 'json_schema',
    },
  );

  const completion = await chatCompletion(config, request);
  let parsed: unknown;
  try {
    parsed = JSON.parse(completion.answer);
  } catch (err) {
    throw new OmlxError(
      `omlx returned non-JSON despite json_schema — first 200 chars: ${completion.answer.slice(0, 200)}; retry, or loosen the schema`,
      { cause: err },
    );
  }
  return {
    content: [{ text: JSON.stringify(parsed, null, 2), type: 'text' }],
    structuredContent: {
      model: completion.model,
      reasoning_fallback: completion.reasoning_fallback,
      result: parsed,
    },
  };
}

export const askStructuredHandler = tool(
  'ask_structured',
  runAskStructured,
  askStructuredInputSchema,
);

export function registerAskStructuredTool(server: McpServer): ToolHandle {
  return server.registerTool(
    'ask_structured',
    {
      title: 'Ask the local model for structured output',
      description: ASK_STRUCTURED_TOOL_DESCRIPTION,
      inputSchema: askStructuredInputShape,
      outputSchema: askStructuredOutputSchema,
    },
    askStructuredHandler,
  );
}
