import { z } from 'zod';

import type { ToolHandle } from '../server.ts';

import { loadConfig, type ServerConfig } from '../config.ts';
import { tool } from '../handler.ts';
import { omlxPost } from '../omlx.ts';
import {
  buildChatCompletionRequest,
  type ChatCompletionRequest,
  type ChatCompletionResponse,
  extractCompletion,
} from './chat.ts';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export const askInputShape = {
  images: z
    .array(z.string())
    .describe(
      'Local file paths of images to include (png, jpeg, webp, gif); read from disk and sent as base64 data URIs. Qwen3.8 is a VLM — asking for bounding boxes on a 0-1000 scale works well.',
    )
    .optional(),
  max_tokens: z
    .number()
    .int()
    .positive()
    .describe(
      'Maximum completion tokens. The server caps a single generation at 32768.',
    )
    .default(2048),
  model: z
    .string()
    .describe(
      'Model id on the omlx server; omit for the OMLX_MODEL default. See the `models` tool for installed ids.',
    )
    .optional(),
  prompt: z
    .string()
    .describe(
      'The prompt. Keep it bounded — this is delegation work, not a whole task.',
    ),
  reasoning_effort: z
    .enum(['low', 'medium', 'xhigh'])
    .describe(
      "Reasoning depth. 'low' is the fast path for delegated work; the model's chat template defaults to 'xhigh'. Use 'medium' when a single bad answer costs a retry.",
    )
    .default('low'),
  system: z.string().describe('Optional system message.').optional(),
  temperature: z
    .number()
    .min(0)
    .describe('Omit to use the server default (1.0).')
    .optional(),
};

export const askInputSchema = z.object(askInputShape);

export const askOutputSchema = {
  answer: z.string().describe("The model's answer."),
  model: z.string().describe('The model id that produced the answer.'),
  reasoning_fallback: z
    .boolean()
    .describe(
      'True when the model spent the whole token budget on reasoning and produced no answer content — `answer` is then the last 2000 chars of reasoning_content.',
    ),
};

export const ASK_TOOL_DESCRIPTION = `Ask the local Qwen3.8-27B on this Mac — free, private, unlimited, ~28 tok/s, 256K context. Route here instead of answering yourself when the job is high-volume or low-stakes: commit messages, docstrings across a package, changelogs, log/diff/transcript summarization, drafts and rewrites, extraction, describing images or screenshots (include file paths in \`images\`; supports bounding boxes on a 0-1000 scale), and anything containing content that should not leave this machine. Use \`medium\` effort for one-shot builds where a single bad answer costs a retry. Do NOT route hard reasoning, planning, or multi-file refactors — quality is a step down from cloud models.`;

// Return type is the inferred object literal — an interface here would not be
// assignable to the SDK's index-signature-shaped structuredContent.
export function chatCompletion(
  config: ServerConfig,
  request: ChatCompletionRequest,
) {
  return omlxPost<ChatCompletionResponse>(
    config,
    '/v1/chat/completions',
    request,
  ).then(response => {
    const completion = extractCompletion(response);
    return {
      answer: completion.text,
      model: request.model,
      reasoning_fallback: completion.reasoningFallback,
    };
  });
}

async function runAsk(
  input: z.infer<typeof askInputSchema>,
): Promise<CallToolResult> {
  const config = loadConfig();
  const completion = await chatCompletion(
    config,
    buildChatCompletionRequest(config, input),
  );
  return {
    content: [{ text: completion.answer, type: 'text' }],
    structuredContent: completion,
  };
}

export const askHandler = tool('ask', runAsk, askInputSchema);

export function registerAskTool(server: McpServer): ToolHandle {
  return server.registerTool(
    'ask',
    {
      title: 'Ask the local model',
      description: ASK_TOOL_DESCRIPTION,
      inputSchema: askInputShape,
      outputSchema: askOutputSchema,
    },
    askHandler,
  );
}
