import { parseArgv } from './argv.js';
import { capturePayload } from './capture.js';
import { renderStatusline } from './engine.js';
import { renderPanel } from './panel.js';
import { resolvePaint } from './theme.js';

// The render.mjs entry the settings keys spawn: decisions ride argv, ambient
// state rides env — NO_COLOR, COLUMNS, HOME stay environment because the
// host shell owns them.

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let payload = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk: string) => {
      payload += chunk;
    });
    process.stdin.on('end', () => {
      resolve(payload);
    });
    process.stdin.on('error', reject);
  });
}

// The bash string rule on COLUMNS (unset, empty, or non-digit -> the engine's
// 200) survives the port: Claude Code exports width as a string env var.
function columnsFromEnv(text: string | undefined): number | undefined {
  if (text === undefined || text === '' || !/^\d+$/.test(text)) {
    return undefined;
  }
  return Number(text);
}

async function main(): Promise<void> {
  const argv = parseArgv(process.argv.slice(2));
  for (const warning of argv.warnings) {
    process.stderr.write(`${warning}\n`);
  }
  const payload = await readStdin();
  const env = process.env;
  const home = env.HOME ?? '';
  const noColor = (env.NO_COLOR ?? '') !== '';
  const now = argv.now ?? Math.floor(Date.now() / 1000);
  const paint = resolvePaint(argv);
  if (argv.mode === 'subagent') {
    capturePayload(home, 'tick', payload);
    process.stdout.write(
      renderPanel({
        layout: paint.layout,
        now,
        payload,
        picks: paint.picks,
        noColor,
      }),
    );
    return;
  }
  capturePayload(home, 'main', payload);
  const columns = columnsFromEnv(env.COLUMNS);
  process.stdout.write(
    renderStatusline({
      home,
      now,
      payload,
      picks: paint.picks,
      noColor,
      layout: paint.layout,
      ...(columns === undefined ? {} : { columns }),
    }),
  );
}

await main();
