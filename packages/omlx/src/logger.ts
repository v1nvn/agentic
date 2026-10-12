import { loggerFromEnv } from '@v1nvn/agentic-core';

export const logger = loggerFromEnv(process.env, 'OMLX_LOG_LEVEL');
