import { serverVite } from '@v1nvn/agentic-core/vite';
import { defineConfig } from 'vitest/config';

// Extraction over full-page fixtures runs multi-second even locally; CI
// runners are several times slower and the 5s default times out there.
export default defineConfig(serverVite({ testTimeout: 30_000 }));
