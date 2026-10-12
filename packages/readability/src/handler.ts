import { toolHandler } from '@v1nvn/agentic-core';

import { toErrorResult } from './errors.js';
import { logger } from './logger.js';

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export const tool = toolHandler<CallToolResult>(logger, toErrorResult);
