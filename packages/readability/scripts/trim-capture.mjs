// Slims a rendered HTML capture into a test fixture: executable scripts,
// <style>/<noscript> payloads, and base64 data URIs go; every element and
// every other attribute stays, so DOM-level behavior is unchanged.
//
//   node scripts/trim-capture.mjs <capture.html> <fixture.html>
import { readFileSync, writeFileSync } from 'node:fs';

import { JSDOM, VirtualConsole } from 'jsdom';

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error('usage: node scripts/trim-capture.mjs <capture.html> <fixture.html>');
  process.exit(1);
}

// Captures carry site CSS that jsdom cannot parse; the noise is not actionable.
const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', () => {});
const dom = new JSDOM(readFileSync(input, 'utf8'), { virtualConsole });
const { document } = dom.window;

for (const el of document.querySelectorAll(
  'script:not([type="application/ld+json"]), style, noscript',
)) {
  el.remove();
}

for (const el of document.querySelectorAll('*')) {
  for (const attr of el.attributes) {
    if (/(?:^|["\s,])data:[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]{64,}/.test(attr.value)) {
      attr.value = 'data:stripped';
    }
  }
}

const html = `<!DOCTYPE html>\n${document.documentElement.outerHTML}`;
writeFileSync(output, html);
console.log(`${input} (${readFileSync(input, 'utf8').length}) -> ${output} (${html.length})`);
