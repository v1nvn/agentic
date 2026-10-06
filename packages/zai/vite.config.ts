import { modVite } from '@v1nvn/agentic-core/vite';

export default ({ mode }: { mode: string }) =>
  modVite(mode, { standalone: { mode: 'usage', name: 'usage' } });
