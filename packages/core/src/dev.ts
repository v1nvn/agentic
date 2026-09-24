// Structural stand-ins for vite's dev server and module runner — the shared
// hot-reload wiring below must not pull vite into core's runtime surface; the
// MCP packages pass their real instances through.
export interface ReloadableRunner {
  readonly evaluatedModules: { clear(): void };
  import<T>(entry: string): Promise<T>;
}

export interface WatchableDevServer {
  close(): Promise<unknown>;
  readonly watcher: {
    on(event: 'change', cb: (file: string) => void): unknown;
  };
}

const RELOAD_DEBOUNCE_MS = 150;

const IGNORED_SEGMENTS = ['/node_modules/', '/dist/', '/.git/', '/coverage/'];

function shouldReload(file: string): boolean {
  return IGNORED_SEGMENTS.every(seg => !file.includes(seg));
}

/**
 * Debounced file-change reloads, serialized via a promise chain: concurrent
 * saves never overlap, and a mid-reload save still produces a follow-up.
 */
export function watchWithReload(
  vite: WatchableDevServer,
  reload: () => Promise<void>,
): void {
  let chain: Promise<void> = Promise.resolve();
  let timer: NodeJS.Timeout | undefined;
  vite.watcher.on('change', file => {
    if (!shouldReload(file)) {
      return;
    }
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = undefined;
      chain = chain.then(reload);
    }, RELOAD_DEBOUNCE_MS);
  });
}
