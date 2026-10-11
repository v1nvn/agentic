import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from 'vitest';

import {
  bg,
  doc,
  indexed,
  line,
  plain,
  rgb,
  textOf,
  toSgr,
} from '../src/draw.js';

const root = fileURLToPath(new URL('../../..', import.meta.url));
const drawPath = join(root, 'packages/core/src/draw.ts');

// The skin's byte contract, pinned at the kit's own door: every kind's SGR
// params, the parametric constructors, and the reset rule the goldens ride on.
test('toSgr renders each ink to its exact escape bytes', () => {
  const cases: readonly [string, string][] = [
    [toSgr(line({ text: 'x', ink: 'blue' })), '\x1b[34mx\x1b[0m'],
    [toSgr(line({ text: 'x', ink: 'bold' })), '\x1b[1mx\x1b[0m'],
    [toSgr(line({ text: 'x', ink: 'brightBlack' })), '\x1b[90mx\x1b[0m'],
    [toSgr(line({ text: 'x', ink: 'cyan' })), '\x1b[36mx\x1b[0m'],
    [toSgr(line({ text: 'x', ink: 'dim' })), '\x1b[2mx\x1b[0m'],
    [toSgr(line({ text: 'x', ink: 'green' })), '\x1b[32mx\x1b[0m'],
    [toSgr(line({ text: 'x', ink: 'magenta' })), '\x1b[35mx\x1b[0m'],
    [toSgr(line({ text: 'x', ink: 'mark' })), '\x1b[1;97mx\x1b[0m'],
    [toSgr(line({ text: 'x', ink: 'plain' })), '\x1b[39mx\x1b[0m'],
    [toSgr(line({ text: 'x', ink: 'red' })), '\x1b[31mx\x1b[0m'],
    [toSgr(line({ text: 'x', ink: 'white' })), '\x1b[37mx\x1b[0m'],
    [toSgr(line({ text: 'x', ink: 'yellow' })), '\x1b[33mx\x1b[0m'],
    [
      toSgr(line({ text: 'x', ink: rgb(68, 71, 90) })),
      '\x1b[38;2;68;71;90mx\x1b[0m',
    ],
    [toSgr(line({ text: 'x', ink: indexed(231) })), '\x1b[38;5;231mx\x1b[0m'],
    [toSgr(line({ text: 'x', ink: bg(indexed(61)) })), '\x1b[48;5;61mx\x1b[0m'],
  ];
  for (const [got, want] of cases) {
    expect(got).toBe(want);
  }
});

test('the reset rule: every inked segment closes with a reset unless it carries', () => {
  expect(toSgr(line(plain('a '), { text: 'b', ink: 'red' }, plain(' c')))).toBe(
    'a \x1b[31mb\x1b[0m c',
  );
  expect(
    toSgr(line({ text: 'b', ink: 'red' }, { text: 'c', ink: 'dim' })),
  ).toBe('\x1b[31mb\x1b[0m\x1b[2mc\x1b[0m');
  expect(
    toSgr(
      line({ text: 'b', ink: 'red', carry: true }, { text: 'c', ink: 'dim' }),
    ),
  ).toBe('\x1b[31mb\x1b[2mc\x1b[0m');
  expect(
    toSgr(
      line(
        { text: '', ink: bg(indexed(61)), carry: true },
        { text: ' b ', ink: indexed(231) },
      ),
    ),
  ).toBe('\x1b[48;5;61m\x1b[38;5;231m b \x1b[0m');
  expect(toSgr(line(plain('x')))).toBe('x');
  expect(toSgr(line())).toBe('');
  expect(toSgr(doc(line(plain('x')), line(plain('y'))))).toBe('x\ny');
  expect(toSgr(doc())).toBe('');
});

test('textOf is the no-color twin: segment texts joined, lines newline-joined', () => {
  expect(
    textOf(line(plain('a '), { text: 'b', ink: 'red' }, plain(' c'))),
  ).toBe('a b c');
  expect(textOf(doc(line(plain('x')), line()))).toBe('x\n');
});

// The skin must be exhaustive: a kind added to InkKind without a toSgr branch
// fails to compile. Proven by type-checking a mutated copy of draw.ts with a
// dummy kind spliced into the union — assertNever's never parameter is the
// only thing that can reject it.
test('a new InkKind fails to compile in the skin', () => {
  const source = readFileSync(drawPath, 'utf8');
  const anchor = "  | 'yellow';";
  expect(source).toContain(anchor);
  const mutated = source.replace(anchor, "  | 'yellow'\n  | 'dummySkinKind';");
  const dir = mkdtempSync(join(tmpdir(), 'draw-skin-'));
  writeFileSync(join(dir, 'draw.ts'), mutated);
  let out = '';
  let status = 0;
  try {
    const tsc = join(root, 'node_modules', 'typescript', 'lib', 'tsc.js');
    out = execFileSync(
      process.execPath,
      [tsc, '--noEmit', '--strict', '--target', 'es2022', 'draw.ts'],
      { encoding: 'utf8', cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] },
    );
  } catch (e) {
    status = (e as { status: number }).status ?? 1;
    out = `${(e as { stdout: string }).stdout}${(e as { stderr: string }).stderr}`;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  expect(status, out).not.toBe(0);
  expect(out).toMatch(/never/);
});
