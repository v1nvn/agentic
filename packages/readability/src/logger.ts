import { Logger } from '@v1nvn/agentic-core';

import { loadConfig } from './config.js';

export const logger = new Logger(loadConfig().logLevel);
