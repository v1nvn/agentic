import { toolHandler } from '@v1nvn/agentic-core';

import { toErrorResult } from './errors.ts';
import { logger } from './logger.ts';

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export const tool = toolHandler<CallToolResult>(logger, toErrorResult);
