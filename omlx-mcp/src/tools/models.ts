import { z } from 'zod';

import type { ToolHandle } from '../server.js';

import { loadConfig } from '../config.js';
import { toErrorResult } from '../errors.js';
import { logger } from '../logger.js';
import { omlxGet } from '../omlx.js';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

interface ModelsListResponse {
  data?: {
    id?: string;
  }[];
}

interface ModelStatus {
  actual_size?: null | number;
  engine_type?: null | string;
  estimated_size?: null | number;
  id?: string;
  is_loading?: boolean;
  loaded?: boolean;
  max_context_window?: null | number;
  max_tokens?: null | number;
}

interface ModelsStatusResponse {
  loaded_count?: number;
  model_count?: number;
  models?: ModelStatus[];
}

export interface ModelSummary {
  context_window: null | number;
  engine_type: null | string;
  id: string;
  loaded: boolean;
  loading: boolean;
  max_output_tokens: null | number;
  size_bytes: null | number;
}

export const modelsOutputSchema = {
  loaded_count: z
    .number()
    .int()
    .describe('How many models are currently in memory.'),
  model_count: z
    .number()
    .int()
    .describe('How many models are installed on disk.'),
  models: z
    .array(
      z.object({
        context_window: z
          .number()
          .int()
          .nullable()
          .describe('Maximum context window in tokens.'),
        engine_type: z
          .string()
          .nullable()
          .describe('Engine class, e.g. "vlm" for vision-language models.'),
        id: z
          .string()
          .describe('Model id — the `model` argument for ask/ask_structured.'),
        loaded: z
          .boolean()
          .describe('Whether the model is resident in memory.'),
        loading: z
          .boolean()
          .describe('Whether the model is loading right now.'),
        max_output_tokens: z
          .number()
          .int()
          .nullable()
          .describe('Maximum output tokens for a single generation.'),
        size_bytes: z
          .number()
          .int()
          .nullable()
          .describe('Model size on disk in bytes.'),
      }),
    )
    .describe('Installed models, sorted by id.'),
};

export const MODELS_TOOL_DESCRIPTION = `List the models installed on the local omlx server with loaded state, context window, output cap, and size on disk — the source of truth for the \`model\` argument of \`ask\`/\`ask_structured\`. Read-only: load/unload stay out on purpose, the server LRU-manages the model pool itself.`;

function summarize(status: ModelStatus): ModelSummary {
  return {
    context_window: status.max_context_window ?? null,
    engine_type: status.engine_type ?? null,
    id: status.id ?? '',
    loaded: status.loaded ?? false,
    loading: status.is_loading ?? false,
    max_output_tokens: status.max_tokens ?? null,
    size_bytes: status.actual_size ?? status.estimated_size ?? null,
  };
}

function formatBytes(bytes: null | number): string {
  if (bytes === null) {
    return 'size ?';
  }
  return `size ${(bytes / 1e9).toFixed(1)} GB`;
}

function renderModels(models: readonly ModelSummary[]): string {
  return models
    .map(
      model =>
        `${model.id}  ${model.loading ? 'loading' : model.loaded ? 'loaded' : 'unloaded'}  ${
          model.engine_type ?? 'engine ?'
        }  context ${model.context_window ?? '?'}  out ${model.max_output_tokens ?? '?'}  ${formatBytes(model.size_bytes)}`,
    )
    .join('\n');
}

export async function runModels(): Promise<CallToolResult> {
  const config = loadConfig();
  const [list, status] = await Promise.all([
    omlxGet<ModelsListResponse>(config, '/v1/models'),
    omlxGet<ModelsStatusResponse>(config, '/v1/models/status'),
  ]);

  const models = (status.models ?? [])
    .map(summarize)
    .sort((a, b) => a.id.localeCompare(b.id));
  if (models.length === 0 && (list.data ?? []).length > 0) {
    // Status lagged the install; keep the ids visible at minimum.
    for (const entry of list.data ?? []) {
      if (entry.id && !models.some(model => model.id === entry.id)) {
        models.push({
          context_window: null,
          engine_type: null,
          id: entry.id,
          loaded: false,
          loading: false,
          max_output_tokens: null,
          size_bytes: null,
        });
      }
    }
  }

  const text = renderModels(models);
  return {
    content: [{ text, type: 'text' }],
    structuredContent: {
      loaded_count: status.loaded_count ?? 0,
      model_count: status.model_count ?? models.length,
      models,
    },
  };
}

export function modelsHandler(): Promise<CallToolResult> {
  return runModels().catch((err: unknown) => {
    logger.error(
      `models failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return toErrorResult(err);
  });
}

export function registerModelsTool(server: McpServer): ToolHandle {
  return server.registerTool(
    'models',
    {
      title: 'List installed local models',
      description: MODELS_TOOL_DESCRIPTION,
      inputSchema: {},
      outputSchema: modelsOutputSchema,
    },
    modelsHandler,
  );
}
