import { readFileSync } from 'node:fs';

import { type OmlxConfig } from '../config.js';
import { OmlxError } from '../errors.js';

export interface ChatCompletionInput {
  images?: readonly string[];
  max_tokens: number;
  model?: string;
  prompt: string;
  reasoning_effort?: string;
  system?: string;
  temperature?: number;
}

export interface ChatMessage {
  content: ContentPart[] | string;
  role: 'system' | 'user';
}

export interface ChatCompletionResponse {
  choices?: {
    message?: {
      content?: null | string;
      reasoning_content?: null | string;
    };
  }[];
}

export interface ContentPart {
  image_url?: { url: string };
  text?: string;
  type: 'image_url' | 'text';
}

export interface ResponseFormatJsonSchema {
  name: string;
  schema: Record<string, unknown>;
}

export interface ResponseFormat {
  json_schema?: ResponseFormatJsonSchema;
  type: 'json_object' | 'json_schema' | 'text';
}

export interface ChatCompletionRequest {
  max_tokens: number;
  messages: ChatMessage[];
  model: string;
  reasoning_effort?: string;
  response_format?: ResponseFormat;
  temperature?: number;
}

export interface ChatCompletionRequest {
  max_tokens: number;
  messages: ChatMessage[];
  model: string;
  reasoning_effort?: string;
  response_format?: ResponseFormat;
  temperature?: number;
}

export interface Completion {
  reasoningFallback: boolean;
  text: string;
}

const MIME_SIGNATURES: readonly (readonly [
  magic: readonly number[],
  mime: string,
])[] = [
  [[0x89, 0x50, 0x4e, 0x47], 'image/png'],
  [[0xff, 0xd8, 0xff], 'image/jpeg'],
  [[0x47, 0x49, 0x46, 0x38], 'image/gif'],
  [[0x52, 0x49, 0x46, 0x46], 'image/webp'],
];

function detectMime(bytes: Buffer, path: string): string {
  const mime = MIME_SIGNATURES.find(([magic]) =>
    magic.every((byte, i) => bytes[i] === byte),
  )?.[1];
  if (!mime) {
    throw new OmlxError(
      `unsupported image format at ${path} — expected png, jpeg, webp, or gif`,
    );
  }
  // RIFF is a container; only accept it when the payload is actually WEBP.
  if (
    mime === 'image/webp' &&
    bytes.subarray(8, 12).toString('ascii') !== 'WEBP'
  ) {
    throw new OmlxError(
      `unsupported image format at ${path} — expected png, jpeg, webp, or gif`,
    );
  }
  return mime;
}

export function readImagePart(path: string): ContentPart {
  const bytes = readFileSync(path);
  const mime = detectMime(bytes, path);
  return {
    image_url: { url: `data:${mime};base64,${bytes.toString('base64')}` },
    type: 'image_url',
  };
}

export function buildUserContent(
  prompt: string,
  images: readonly string[] | undefined,
): ContentPart[] | string {
  if (!images || images.length === 0) {
    return prompt;
  }
  return [
    { text: prompt, type: 'text' },
    ...images.map(path => readImagePart(path)),
  ];
}

export function buildChatCompletionRequest(
  config: OmlxConfig,
  input: ChatCompletionInput,
  responseFormat?: ResponseFormat,
): ChatCompletionRequest {
  const messages: ChatMessage[] = [];
  if (input.system) {
    messages.push({ content: input.system, role: 'system' });
  }
  messages.push({
    content: buildUserContent(input.prompt, input.images),
    role: 'user',
  });
  return {
    max_tokens: input.max_tokens,
    messages,
    model: input.model ?? config.model,
    reasoning_effort: input.reasoning_effort,
    response_format: responseFormat,
    temperature: input.temperature,
  };
}

// The empty-answer fallback: reasoning models can spend the entire token
// budget on reasoning_content and emit nothing for content; the reasoning
// tail is the only signal the call produced.
export function extractCompletion(
  response: ChatCompletionResponse,
): Completion {
  const message = response.choices?.[0]?.message;
  const content = message?.content?.trim();
  if (content) {
    return { reasoningFallback: false, text: content };
  }
  const reasoning = message?.reasoning_content;
  if (!reasoning) {
    throw new OmlxError(
      'omlx returned an empty completion — no content and no reasoning_content; retry with a higher max_tokens',
    );
  }
  return { reasoningFallback: true, text: reasoning.slice(-2000) };
}
