import { loggerFromEnv } from '@v1nvn/agentic-core';

export const logger = loggerFromEnv(process.env, 'READABILITY_LOG_LEVEL');
