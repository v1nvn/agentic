import { JSDOM } from 'jsdom';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';

import { buildPage, loadPageFile } from '../src/page.ts';

const EXAMPLE = fileURLToPath(
  new URL('../src/example.page.js', import.meta.url),
);
const KEY = 'rulings-testril-pr251';
const HTML = buildPage(loadPageFile(EXAMPLE));

interface Boot {
  stored?: Record<string, string>;
  writeText?: (t: string) => Promise<void>;
}

function boot({ stored = {}, writeText }: Boot = {}) {
  const dom = new JSDOM(HTML, {
    runScripts: 'dangerously',
    url: 'https://rulings.test/',
    beforeParse(w) {
      for (const [k, v] of Object.entries(stored)) w.localStorage.setItem(k, v);
      if (writeText)
        Object.defineProperty(w.navigator, 'clipboard', {
          value: { writeText },
        });
    },
  });
  const doc = dom.window.document;
  const $ = <T extends Element = HTMLElement>(sel: string): T => {
    const el = doc.querySelector<T>(sel);
    if (el === null) throw new Error(`no ${sel}`);
    return el;
  };
  const shown = (id: string): string[] =>
    [...doc.querySelectorAll(`#r-${id} .vw:not([hidden])`)].map(
      v => v.getAttribute('data-view') ?? '',
    );
  const picked = (id: string): string | undefined =>
    doc.querySelector<HTMLInputElement>(`input[name="${id}"]:checked`)?.value;
  const saved = (): { picks: Record<string, string> } | null =>
    JSON.parse(dom.window.localStorage.getItem(KEY) ?? 'null');
  const type = (sel: string, value: string): void => {
    const el = $(sel) as HTMLInputElement;
    el.value = value;
    el.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  };
  const hover = (sel: string): void => {
    $(sel).dispatchEvent(
      new dom.window.MouseEvent('mouseover', { bubbles: true }),
    );
  };
  const leave = (sel: string): void => {
    $(sel).dispatchEvent(new dom.window.MouseEvent('mouseleave'));
  };
  return { $, doc, dom, hover, leave, picked, saved, shown, type };
}

const cell = (id: string, k: string): string =>
  `#r-${id} .card tbody td[data-k="${k}"]`;
const button = (id: string, k: string): string =>
  `#r-${id} input[data-pick="${id}${k}"]`;

describe('picking', () => {
  it('a click anywhere in a column picks it; a second click unpicks', () => {
    const p = boot();
    p.$(cell('G4', 'b')).click();
    expect(p.picked('G4')).toBe('b');
    expect(p.saved()?.picks).toEqual({ G4: 'b' });
    expect(p.$(cell('G4', 'b')).classList.contains('picked')).toBe(true);
    p.$(`#r-G4 .card thead th[data-k="b"]`).click();
    expect(p.picked('G4')).toBeUndefined();
    expect(p.saved()?.picks).toEqual({});
  });

  it('the Pick button picks and, pressed again, unpicks', () => {
    const p = boot();
    p.$(button('G5', 'a')).click();
    expect(p.picked('G5')).toBe('a');
    p.$(button('G5', 'a')).click();
    expect(p.picked('G5')).toBeUndefined();
  });

  it('holds one pick per ruling', () => {
    const p = boot();
    p.$(cell('G5', 'a')).click();
    p.$(cell('G5', 'b')).click();
    expect(p.saved()?.picks).toEqual({ G5: 'b' });
    expect(p.doc.querySelectorAll('#r-G5 .picked[data-k="a"]').length).toBe(0);
  });

  it('None of these fit picks n', () => {
    const p = boot();
    p.$(button('G5', 'n')).click();
    expect(p.saved()?.picks).toEqual({ G5: 'n' });
  });

  it('a click that ends a text selection picks nothing', () => {
    const p = boot();
    p.dom.window.getSelection = () =>
      ({ toString: () => 'selected words' }) as Selection;
    p.$(cell('G5', 'a')).dispatchEvent(
      new p.dom.window.MouseEvent('click', { bubbles: true, detail: 1 }),
    );
    expect(p.picked('G5')).toBeUndefined();
  });
});

describe('the picture', () => {
  it('a wide picture opens on today, and a pick shows the picked option', () => {
    const p = boot();
    expect(p.shown('G2')).toEqual(['today']);
    p.$(cell('G2', 'b')).click();
    expect(p.shown('G2')).toEqual(['G2b']);
  });

  it('hovering a column previews its picture; leaving the card restores the pick', () => {
    const p = boot();
    p.$(cell('G2', 'a')).click();
    p.hover(cell('G2', 'b'));
    expect(p.shown('G2')).toEqual(['G2b']);
    expect(p.$(cell('G2', 'b')).classList.contains('hov')).toBe(true);
    p.leave('#r-G2 .card');
    expect(p.shown('G2')).toEqual(['G2a']);
    expect(p.doc.querySelectorAll('#r-G2 .hov').length).toBe(0);
  });

  it('the today option’s column shows today’s picture', () => {
    const p = boot();
    p.$(cell('G1', 'b')).click();
    p.hover(cell('G1', 'a'));
    expect(p.shown('G1')).toEqual(['today']);
  });

  it('a switch button shows its view', () => {
    const p = boot();
    p.$('#r-G4 .vt[data-view="G4b"]').click();
    expect(p.shown('G4')).toEqual(['G4b']);
    expect(p.$('#r-G4 .vt[data-view="G4b"]').getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  it('a reload reopens the picked option’s picture', () => {
    const p = boot({
      stored: {
        [KEY]: JSON.stringify({ picks: { G4: 'b' }, onotes: {}, note: '' }),
      },
    });
    expect(p.picked('G4')).toBe('b');
    expect(p.shown('G4')).toEqual(['G4b']);
  });
});

describe('the answer', () => {
  it('copies picks with their notes, a note without a pick, then the page note', async () => {
    const writes: string[] = [];
    const p = boot({
      writeText: t => {
        writes.push(t);
        return Promise.resolve();
      },
    });
    p.$(cell('G1', 'b')).click();
    p.$(cell('G2', 'a')).click();
    p.type('.rnote[data-note="G1"]', 'keep it');
    p.type('.rnote[data-note="G4"]', 'ask ops first');
    p.type('#rulings-notes', 'ship Friday');
    expect(p.$('#picks').textContent).toBe('G1b×G2a×');
    p.$('#copy-answer').click();
    await vi.waitFor(() =>
      expect(p.$('#copy-answer').textContent).toBe('Copied'),
    );
    expect(writes).toEqual([
      'G1b — keep it, G2a, G4 — ask ops first\n\nship Friday',
    ]);
  });

  it('a chip’s × unpicks', () => {
    const p = boot();
    p.$(cell('G5', 'a')).click();
    p.$('[data-unpick="G5"]').click();
    expect(p.picked('G5')).toBeUndefined();
  });

  it('Copy rests until there is an answer; the page note alone wakes it', () => {
    const p = boot({ writeText: () => Promise.resolve() });
    expect(p.$<HTMLButtonElement>('#copy-answer').disabled).toBe(true);
    p.type('#rulings-notes', 'ship Friday');
    expect(p.$<HTMLButtonElement>('#copy-answer').disabled).toBe(false);
  });

  it('settles a hanging clipboard within its bound', async () => {
    const p = boot({ writeText: () => new Promise(() => {}) });
    p.$(cell('G5', 'a')).click();
    p.$('#copy-answer').click();
    await vi.waitFor(
      () =>
        expect(p.$('#copy-answer').textContent).toBe(
          'Copy failed. Copy the summary by hand.',
        ),
      { timeout: 3000 },
    );
  });

  it('shows a one-line hint when it restores a session, and not on a fresh page', () => {
    expect(boot().$('#rulings-hint').hidden).toBe(true);
    const p = boot({
      stored: {
        [KEY]: JSON.stringify({ picks: { G1: 'b' }, onotes: {}, note: '' }),
      },
    });
    expect(p.$('#rulings-hint').hidden).toBe(false);
  });
});
