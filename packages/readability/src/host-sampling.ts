// The one seam to the HOST's model via MCP `sampling/createMessage`
// (server→client request). The server never embeds a model and never calls a
// provider directly — every LLM call is delegated to the connected client,
// which picks the model and may prompt the user first. Gating on the
// capability happens at registration (server.ts), not here.

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Host models — and the human-in-the-loop approval MCP allows before each
// call — routinely take longer than the SDK's 60s request default.
const SAMPLING_TIMEOUT_MS = 300_000;

export interface HostSampleInput {
  readonly maxTokens: number;
  readonly systemPrompt: string;
  readonly userText: string;
}

export async function sampleText(
  server: McpServer,
  args: HostSampleInput,
): Promise<string> {
  const result = await server.server.createMessage(
    {
      messages: [
        {
          role: 'user',
          content: { type: 'text', text: args.userText },
        },
      ],
      systemPrompt: args.systemPrompt,
      maxTokens: args.maxTokens,
    },
    { timeout: SAMPLING_TIMEOUT_MS },
  );
  if (result.content.type !== 'text') {
    throw new Error(
      `host sampling returned non-text content (${result.content.type})`,
    );
  }
  return result.content.text;
}

// createMessage has no structured-output field, so JSON proposals are
// negotiated in prose: the prompt demands strict JSON, and the reply is
// tolerated past code fences before the caller's schema takes over.
export class SuggestParseError extends Error {
  constructor(
    message: string,
    readonly rawText: string,
  ) {
    super(message);
  }
}

export function extractJsonReply(text: string): unknown {
  const withoutFences = text.replace(
    /^[\s\S]*?```(?:json)?\s*\n?([\s\S]*?)\n?```[\s\S]*$/,
    '$1',
  );
  const trimmed = withoutFences.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        // Fall through to the error below.
      }
    }
    throw new SuggestParseError(
      `host sampling returned text that does not parse as JSON (${trimmed.slice(0, 80)}…)`,
      trimmed,
    );
  }
}

export async function sampleJson(
  server: McpServer,
  args: HostSampleInput,
): Promise<unknown> {
  return extractJsonReply(await sampleText(server, args));
}
