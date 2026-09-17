import { join } from 'node:path';

export function installedPluginsFile(home: string): string {
  return join(home, '.claude', 'plugins', 'installed_plugins.json');
}

export function statuslineCacheRoot(home: string): string {
  return join(home, '.claude', 'plugins', 'cache', 'agentic', 'statusline');
}
