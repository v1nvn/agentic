import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { resolveInstall } from './install-record.js';

// The deployed data-dir entry the settings keys spawn. The renderer
// self-invokes at module scope on argv and stdin, so an in-process dynamic
// import with both intact is the whole wrapper; the exits land only on paths
// that wrote nothing to stdout.
try {
  const record = resolveInstall(process.env.HOME ?? '');
  if (record.kind === 'unresolved') {
    process.stderr.write(`${record.reason}\n`);
    // eslint-disable-next-line n/no-process-exit
    process.exit(1);
  }
  await import(pathToFileURL(join(record.installPath, 'render.mjs')).href);
} catch (e) {
  process.stderr.write(`${(e as Error).message}\n`);
  // eslint-disable-next-line n/no-process-exit
  process.exit(1);
}
