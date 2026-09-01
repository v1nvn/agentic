import { render } from './format.js';
import { scan } from './scan.js';

try {
  console.log(render(scan()));
} catch (e) {
  console.error((e as Error).message);
  // CLIs report failure through the exit code; the rule targets libraries.
  // eslint-disable-next-line n/no-process-exit
  process.exit(1);
}
