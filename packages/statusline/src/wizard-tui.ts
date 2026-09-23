import type { RenderSpec } from './payloads.js';
import type { WizardDeps } from './wizard.js';

import { runtimeRenderer } from './payloads.js';

function nextKey(buffer: string): readonly [string, string] | undefined {
  if (buffer === '') {
    return undefined;
  }
  const head = buffer[0];
  if (head !== '\x1b') {
    return [head, buffer.slice(1)];
  }
  if (buffer.length < 3) {
    return undefined;
  }
  if (buffer[1] === '[' && 'ABCD'.includes(buffer[2])) {
    return [buffer.slice(0, 3), buffer.slice(3)];
  }
  return ['', buffer.slice(1)];
}

export function terminalDeps(
  input: NodeJS.ReadStream = process.stdin,
  output: NodeJS.WriteStream = process.stdout,
): WizardDeps {
  return {
    async *readKeys(): AsyncGenerator<string> {
      const chunks: string[] = [];
      const waiters: (() => void)[] = [];
      const state = { closed: false };
      function notify(): void {
        for (const wake of waiters.splice(0)) {
          wake();
        }
      }
      function onData(chunk: Buffer): void {
        chunks.push(chunk.toString('utf8'));
        notify();
      }
      function onEnd(): void {
        state.closed = true;
        notify();
      }
      input.on('data', onData);
      input.on('end', onEnd);
      input.on('close', onEnd);
      if (input.isTTY) {
        input.setRawMode(true);
      }
      input.resume();
      try {
        let buffer = '';
        for (;;) {
          for (
            let chunk = chunks.shift();
            chunk !== undefined;
            chunk = chunks.shift()
          ) {
            buffer += chunk;
          }
          while (buffer !== '') {
            const next = nextKey(buffer);
            if (next === undefined) {
              break;
            }
            buffer = next[1];
            if (next[0] !== '') {
              yield next[0];
            }
          }
          if (state.closed && chunks.length === 0) {
            return;
          }
          await new Promise<void>(resolve => {
            waiters.push(resolve);
          });
        }
      } finally {
        if (input.isTTY) {
          input.setRawMode(false);
        }
        input.pause();
        input.off('data', onData);
        input.off('end', onEnd);
        input.off('close', onEnd);
      }
    },
    render(frame: string): void {
      output.write(`\x1b[2J\x1b[H${frame}\n`);
    },
    preview(spec: RenderSpec): string {
      return runtimeRenderer(spec);
    },
  };
}
