import { JSDOM } from 'jsdom';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';

import { LAYOUT_KEY } from '../src/chrome.ts';
import { buildPage, loadPageFile } from '../src/page.ts';

const EXAMPLE = fileURLToPath(
  new URL('../src/example.page.js', import.meta.url),
);
const KEY = 'rulings-testril-pr251';
const HTML = buildPage(loadPageFile(EXAMPLE));

type Spy = (ents: { isIntersecting: boolean; target: Element }[]) => void;

interface Boot {
  stored?: Record<string, string>;
  writeText?: (t: string) => Promise<void>;
  spy?: (cb: Spy) => void;
}

function boot({ stored = {}, writeText, spy }: Boot = {}) {
  const dom = new JSDOM(HTML, {
    runScripts: 'dangerously',
    url: 'https://rulings.test/',
    beforeParse(w) {
      for (const [k, v] of Object.entries(stored)) w.localStorage.setItem(k, v);
      if (writeText)
        Object.defineProperty(w.navigator, 'clipboard', {
          value: { writeText },
        });
      if (spy) {
        const report = spy;
        Object.assign(w, {
          IntersectionObserver: class {
            constructor(cb: Spy) {
              report(cb);
            }
            observe(): void {}
          },
        });
      }
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
  const saved = (): { picks: Record<string, string> } | null =>
    JSON.parse(dom.window.localStorage.getItem(KEY) ?? 'null');
  const type = (sel: string, value: string): void => {
    const el = $(sel) as HTMLInputElement;
    el.value = value;
    el.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  };
  return { $, doc, dom, saved, shown, type };
}

describe('picking and previewing', () => {
  const row = (ref: string): string => `.opt[data-pick="${ref}"]`;

  it('a row click picks the option and shows its picture; a second click unpicks', () => {
    const p = boot();
    expect(p.shown('G1')).toEqual(['today']);
    p.$(`${row('G1b')} .ot-t`).click();
    expect(p.$<HTMLInputElement>(`${row('G1b')} input`).checked).toBe(true);
    expect(p.shown('G1')).toEqual(['G1b']);
    expect(p.saved()?.picks).toEqual({ G1: 'b' });
    p.$(row('G1b')).click();
    expect(p.saved()?.picks).toEqual({});
    expect(p.$<HTMLInputElement>(`${row('G1b')} input`).checked).toBe(false);
    expect(p.shown('G1')).toEqual(['G1b']);
  });

  it('holds one pick per ruling', () => {
    const p = boot();
    p.$(row('G1a')).click();
    p.$(row('G1b')).click();
    expect(p.saved()?.picks).toEqual({ G1: 'b' });
    expect(p.$<HTMLInputElement>(`${row('G1a')} input`).checked).toBe(false);
  });

  it('hovering a row previews its picture and leaving the options restores the pick', () => {
    const p = boot();
    p.$(row('G2b')).click();
    const hover = (el: HTMLElement, type: string): void => {
      el.dispatchEvent(
        new p.dom.window.MouseEvent(type, { bubbles: type === 'mouseover' }),
      );
    };
    hover(p.$(`${row('G2a')} .g`), 'mouseover');
    expect(p.shown('G2')).toEqual(['G2a']);
    expect(p.saved()?.picks).toEqual({ G2: 'b' });
    hover(p.$('#r-G2 .opts'), 'mouseleave');
    expect(p.shown('G2')).toEqual(['G2b']);
    hover(p.$(`${row('G2a')} .g`), 'mouseover');
    hover(p.$(`${row('G2n')} .ot-t`), 'mouseover');
    expect(p.shown('G2')).toEqual(['G2b']);
  });

  it('a focus preview ends when focus leaves the options', () => {
    const p = boot();
    p.$(`${row('G2a')} input`).focus();
    expect(p.shown('G2')).toEqual(['G2a']);
    p.$('.rnote[data-note="G2"]').focus();
    expect(p.shown('G2')).toEqual(['today']);
  });

  it('checking an option’s radio picks it', () => {
    const p = boot();
    const input = p.$<HTMLInputElement>(`${row('G1b')} input`);
    input.checked = true;
    input.dispatchEvent(new p.dom.window.Event('change', { bubbles: true }));
    expect(p.saved()?.picks).toEqual({ G1: 'b' });
  });

  it('the Today row shows today’s picture and picks nothing', () => {
    const p = boot();
    p.$(row('G2a')).click();
    p.$('#r-G2 .opt[data-look="today"]').click();
    expect(p.shown('G2')).toEqual(['today']);
    expect(p.saved()?.picks).toEqual({ G2: 'a' });
  });

  it('a ruling without a picture picks from its rows', () => {
    const p = boot();
    p.$(`${row('G5a')} .c`).click();
    expect(p.saved()?.picks).toEqual({ G5: 'a' });
  });

  it('None of these fit picks n and leaves the picture alone', () => {
    const p = boot();
    p.$(`${row('G1n')} .ot-t`).click();
    expect(p.$<HTMLInputElement>(`${row('G1n')} input`).checked).toBe(true);
    expect(p.saved()?.picks).toEqual({ G1: 'n' });
    expect(p.shown('G1')).toEqual(['today']);
  });

  it('marks the row whose picture is showing for assistive tech', () => {
    const p = boot();
    expect(
      p.$('#r-G1 .opt[data-look="today"]').getAttribute('aria-current'),
    ).toBe('true');
    p.$(row('G1b')).click();
    expect(p.$(row('G1b')).getAttribute('aria-current')).toBe('true');
    expect(p.$(row('G1a')).hasAttribute('aria-current')).toBe(false);
  });

  it('a click that ends a text selection picks nothing', () => {
    const p = boot();
    const title = p.$(`${row('G1b')} .ot-t`);
    p.doc.getSelection()?.selectAllChildren(title);
    title.dispatchEvent(
      new p.dom.window.MouseEvent('click', { bubbles: true, detail: 1 }),
    );
    expect(p.saved()).toBeNull();
  });

  it('accept recommended picks the group’s recommended letters', () => {
    const p = boot();
    p.$('.quick').click();
    expect(p.saved()?.picks).toEqual({ G1: 'a' });
  });
});

describe('restore on load', () => {
  it('reopens the picked option’s picture', () => {
    const p = boot({
      stored: {
        [KEY]: JSON.stringify({ picks: { G1: 'b' }, onotes: {}, note: '' }),
      },
    });
    expect(p.shown('G1')).toEqual(['G1b']);
    expect(p.$<HTMLInputElement>('[data-pick="G1b"] input').checked).toBe(true);
  });

  it('opens the first picture on a none pick', () => {
    const p = boot({
      stored: {
        [KEY]: JSON.stringify({ picks: { G1: 'n' }, onotes: {}, note: '' }),
      },
    });
    expect(p.shown('G1')).toEqual(['today']);
  });
});

describe('the layout switch', () => {
  it('stacks on press and remembers it across pages', () => {
    const p = boot();
    expect(p.doc.body.classList.contains('stacked')).toBe(false);
    p.$('[data-layout="stacked"]').click();
    expect(p.doc.body.classList.contains('stacked')).toBe(true);
    expect(p.$('[data-layout="stacked"]').getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(p.$('[data-layout="side"]').getAttribute('aria-pressed')).toBe(
      'false',
    );
    expect(p.dom.window.localStorage.getItem(LAYOUT_KEY)).toBe('stacked');
    const again = boot({ stored: { [LAYOUT_KEY]: 'stacked' } });
    expect(again.doc.body.classList.contains('stacked')).toBe(true);
  });
});

describe('the answer', () => {
  it('copies picks with their notes and unmet needs, then the page note', async () => {
    const writes: string[] = [];
    const p = boot({
      writeText: t => {
        writes.push(t);
        return Promise.resolve();
      },
    });
    p.$('[data-pick="G1b"]').click();
    p.$('[data-pick="G2a"]').click();
    p.type('.rnote[data-note="G1"]', 'keep it');
    p.type('.rnote[data-note="G4"]', 'ask ops first');
    p.type('#rulings-notes', 'ship Friday');
    expect(p.$('#r-G2 [data-pick="G2a"]').classList.contains('unmet')).toBe(
      true,
    );
    expect(p.$('#picks').textContent).toContain('needs G1a');
    p.$('#copy-answer').click();
    await vi.waitFor(() =>
      expect(p.$('#copy-answer').textContent).toBe('Copied'),
    );
    expect(writes).toEqual([
      'G1b — keep it, G2a (needs G1a), G4 — ask ops first\n\nship Friday',
    ]);
    expect(Object.keys(p.saved() ?? {}).sort()).toEqual([
      'note',
      'onotes',
      'picks',
    ]);
  });

  it('the page note alone wakes Copy', () => {
    const p = boot({ writeText: () => Promise.resolve() });
    expect(p.$<HTMLButtonElement>('#copy-answer').disabled).toBe(true);
    p.type('#rulings-notes', 'ship Friday');
    expect(p.$<HTMLButtonElement>('#copy-answer').disabled).toBe(false);
  });

  it('settles a hanging clipboard within its bound', async () => {
    const p = boot({ writeText: () => new Promise(() => {}) });
    p.$('[data-pick="G1b"]').click();
    p.$('#copy-answer').click();
    await vi.waitFor(
      () =>
        expect(p.$('#copy-answer').textContent).toBe(
          'Copy failed. Copy the summary by hand.',
        ),
      { timeout: 3000 },
    );
  });
});

describe('the page chrome', () => {
  it('counts ruled rulings, marks them in the sidebar and rests Copy until there is an answer', () => {
    const p = boot();
    expect(p.$<HTMLButtonElement>('#copy-answer').disabled).toBe(true);
    p.$('[data-pick="G1b"]').click();
    expect(p.$('#ruled-count').textContent).toBe('1 of 5 ruled');
    expect(p.$('a[href="#r-G1"]').classList.contains('ruled')).toBe(true);
    expect(p.$<HTMLButtonElement>('#copy-answer').disabled).toBe(false);
  });

  it('marks the ruling in view and shows its id alone on the narrow pill', () => {
    let cb: Spy = () => {};
    const p = boot({ spy: c => (cb = c) });
    const g4 = p.$('#r-G4');
    cb([{ isIntersecting: true, target: g4 }]);
    expect(p.$('a[href="#r-G4"]').classList.contains('here')).toBe(true);
    expect(p.$('#rulings-where').hasAttribute('hidden')).toBe(false);
    expect(p.$('#rulings-where').textContent).toBe('G4');
    cb([{ isIntersecting: false, target: g4 }]);
    expect(p.$('#rulings-where').hasAttribute('hidden')).toBe(true);
  });

  it('shows a one-line hint when it restores a session, and not on a fresh page', () => {
    const fresh = boot();
    expect(fresh.$('#rulings-hint').hidden).toBe(true);
    const p = boot({
      stored: {
        [KEY]: JSON.stringify({ picks: { G1: 'b' }, onotes: {}, note: '' }),
      },
    });
    expect(p.$('#rulings-hint').hidden).toBe(false);
    expect(p.$('#rulings-hint').textContent).toMatch(/restored/i);
  });
});
