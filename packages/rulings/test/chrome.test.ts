import vm from 'node:vm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { chromeScript } from '../src/chrome.ts';
import { El, FakeIO, type FakeEvent } from './dom.ts';

// The chrome ships as static script text, so its behavior is tested by
// running the real bytes in a vm against a small fake DOM.

interface Harness {
  cardA: El;
  cardB: El;
  card2: El;
  sum: El;
  notesIn: El;
  copyBtn: El;
  bar: El;
  tab: El;
  count: El;
  where: El;
  link1: El;
  link2: El;
  sec1: El;
  docClick(e: FakeEvent): void;
  keyDown(e: FakeEvent): void;
  tabClick(): void;
  select(text: string): void;
  storage: Map<string, string>;
  writes: string[];
}

function harness(
  over: {
    storage?: Map<string, string>;
    writeText?: (t: string) => Promise<void>;
  } = {},
): Harness {
  FakeIO.last = null;
  const storage = over.storage ?? new Map();
  const body = new El('body');
  body.setAttribute('data-key', 'k');
  const cardA = new El('section', ['view', 'o-a']);
  cardA.setAttribute('data-pick', 'G1a');
  cardA.parent = body;
  const cardB = new El('section', ['view', 'o-b']);
  cardB.setAttribute('data-pick', 'G1b');
  cardB.parent = body;
  const card2 = new El('section', ['view', 'o-a']);
  card2.setAttribute('data-pick', 'G2a');
  card2.parent = body;
  const sum = new El('div');
  sum.setAttribute('id', 'picks');
  const notesIn = new El('textarea');
  notesIn.setAttribute('id', 'rulings-notes');
  const copyBtn = new El('button');
  copyBtn.setAttribute('id', 'copy-answer');
  copyBtn.textContent = 'Copy answer';
  const bar = new El('footer', ['bar']);
  bar.setAttribute('id', 'rulings-bar');
  const tab = new El('button', ['bar-tab']);
  tab.setAttribute('id', 'bar-tab');
  tab.setAttribute('aria-expanded', 'false');
  const count = new El('div', ['scount']);
  count.setAttribute('id', 'ruled-count');
  count.textContent = '0 of 2 ruled';
  const where = new El('a', ['where']);
  where.setAttribute('id', 'rulings-where');
  where.setAttribute('hidden', '');
  const link1 = new El('a', ['rl']);
  link1.setAttribute('href', '#r-G1');
  const link1T = new El('span', ['t']);
  link1T.textContent = 'Who owns a leaf block?';
  link1.appendChild(link1T);
  const link2 = new El('a', ['rl']);
  link2.setAttribute('href', '#r-G2');
  const sec1 = new El('section');
  sec1.setAttribute('id', 'r-G1');
  const sec2 = new El('section');
  sec2.setAttribute('id', 'r-G2');
  const byId = [sum, notesIn, copyBtn, bar, tab, count, where];
  const picks = [cardA, cardB, card2];
  const listeners: Record<string, ((e: FakeEvent) => void)[]> = {};
  const doc = {
    body,
    addEventListener(t: string, h: (e: FakeEvent) => void): void {
      (listeners[t] ??= []).push(h);
    },
    fire(t: string, e: FakeEvent): void {
      for (const h of listeners[t] ?? []) h(e);
    },
    getElementById(id: string): El | null {
      return byId.find(e => e.id === id) ?? null;
    },
    querySelectorAll(sel: string): El[] {
      switch (sel) {
        case '[data-pick]':
          return picks;
        case '.side a.rl':
          return [link1, link2];
        case 'section[id]':
          return [sec1, sec2];
        default:
          return [];
      }
    },
    querySelector(sel: string): El | null {
      const m = /^\[data-pick="(.+)"\]$/.exec(sel);
      return m ? (picks.find(c => c.getAttribute('data-pick') === m[1]) ?? null) : null;
    },
    createElement(tag: string): El {
      return new El(tag);
    },
    execCommand(): boolean {
      return false;
    },
  };
  const writes: string[] = [];
  const clipboard = {
    writeText:
      over.writeText ??
      ((t: string) => {
        writes.push(t);
        return Promise.resolve();
      }),
  };
  let selectionText = '';
  const sandbox = {
    document: doc,
    IntersectionObserver: FakeIO,
    navigator: { clipboard },
    localStorage: {
      getItem: (k: string): string | null => storage.get(k) ?? null,
      setItem: (k: string, v: string): void => {
        storage.set(k, v);
      },
    },
    setTimeout,
    clearTimeout,
    window: {
      getSelection: (): { toString(): string } => ({
        toString: (): string => selectionText,
      }),
      IntersectionObserver: FakeIO,
      innerHeight: 900,
    },
  };
  const code = chromeScript()
    .replace(/^<script>\n/, '')
    .replace(/<\/script>$/, '');
  El.clickSink = null;
  vm.runInNewContext(code, sandbox);
  El.clickSink = (e: FakeEvent): void => {
    doc.fire('click', e);
  };
  return {
    cardA,
    cardB,
    card2,
    sum,
    notesIn,
    copyBtn,
    bar,
    tab,
    count,
    where,
    link1,
    link2,
    sec1,
    docClick: (e: FakeEvent): void => {
      doc.fire('click', { detail: 1, ...e });
      for (const h of e.target.handlers.click ?? []) h({ detail: 1, ...e });
    },
    keyDown: (e: FakeEvent): void => {
      doc.fire('keydown', { preventDefault: () => {}, ...e });
    },
    tabClick: (): void => {
      doc.fire('click', { target: tab, detail: 1 });
      for (const h of tab.handlers.click ?? []) h({ target: tab, detail: 1 });
    },
    select: (text: string): void => {
      selectionText = text;
    },
    storage,
    writes,
  };
}

beforeEach(() => {
  FakeIO.last = null;
});
afterEach(() => {
  vi.useRealTimers();
});

describe('the sidebar scroll-spy', () => {
  it('clears the mark when its section leaves the spy band', () => {
    const h = harness();
    const io = FakeIO.last;
    if (io === null) throw new Error('fixture: no IntersectionObserver');
    io.cb([{ target: h.sec1, isIntersecting: true }]);
    expect(h.link1.classList.contains('here')).toBe(true);
    io.cb([{ target: h.sec1, isIntersecting: false }]);
    expect(h.link1.classList.contains('here')).toBe(false);
  });
});

describe('the composer chips', () => {
  it('carries the option hue on the dot, with the letter visible on it', () => {
    const h = harness();
    h.docClick({ target: h.cardB });
    expect(h.sum.innerHTML).toContain('background:var(--opt-b)');
    expect(h.sum.innerHTML).toContain('>b</span>');
  });

  it('prints the letter once: the dot carries it, the label names the ruling', () => {
    const h = harness();
    h.docClick({ target: h.cardB });
    const visible = h.sum.innerHTML.replace(
      /(data-unpick|aria-label)="[^"]*"/g,
      '',
    );
    expect(visible).toContain('>b</span>G1');
    expect(visible).not.toContain('G1b');
  });
});

describe('the copy button', () => {
  it('refuses a copy with zero picks, never saying Copied', async () => {
    vi.useFakeTimers();
    const h = harness();
    h.docClick({ target: h.copyBtn });
    expect(h.copyBtn.textContent).toMatch(/no picks/i);
    expect(h.writes).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(2000);
    expect(h.copyBtn.textContent).toBe('Copy answer');
  });

  it('still says Copied when the clipboard settles', async () => {
    vi.useFakeTimers();
    const h = harness();
    h.docClick({ target: h.cardB });
    h.docClick({ target: h.copyBtn });
    await vi.advanceTimersByTimeAsync(0);
    expect(h.copyBtn.textContent).toBe('Copied');
    expect(h.writes).toEqual(['G1b']);
  });

  it('settles a hanging clipboard within a bound instead of waiting forever', async () => {
    vi.useFakeTimers();
    const h = harness({
      writeText: () => new Promise<void>(() => {}),
    });
    h.docClick({ target: h.cardB });
    h.docClick({ target: h.copyBtn });
    await vi.advanceTimersByTimeAsync(1600);
    expect(h.copyBtn.textContent).toBe(
      'Copy failed — copy the summary by hand',
    );
  });
});

describe('the pick toggle', () => {
  it('leaves the pick unchanged when the click ends a drag-select', () => {
    const h = harness();
    h.select('caption text selected by dragging');
    h.docClick({ target: h.cardB });
    expect(h.sum.innerHTML).toContain('no picks yet');
    h.select('');
    h.docClick({ target: h.cardB });
    expect(h.sum.innerHTML).toContain('G1b');
  });

  it('lands a keyboard-activated pick while a selection is alive', () => {
    const h = harness();
    h.select('caption text selected by dragging');
    h.keyDown({ key: 'Enter', target: h.cardB });
    expect(h.sum.innerHTML).toContain('G1b');
    h.keyDown({ key: ' ', target: h.cardA });
    expect(h.sum.innerHTML).toContain('G1a');
  });
});

describe('the resting strip', () => {
  it('rests with no picks and no note, then expands on the first pick', () => {
    const h = harness();
    expect(h.bar.classes.contains('rest')).toBe(true);
    h.docClick({ target: h.cardB });
    expect(h.bar.classes.contains('rest')).toBe(false);
    h.docClick({ target: h.cardB });
    expect(h.bar.classes.contains('rest')).toBe(true);
  });

  it('does not rest over a persisted note', () => {
    const storage = new Map([
      ['k', JSON.stringify({ note: 'carry this', onotes: {}, picks: {} })],
    ]);
    const h = harness({ storage });
    expect(h.bar.classes.contains('rest')).toBe(false);
  });
});

describe('the narrow chip count', () => {
  it('counts the picks on the tab, which opens and closes the bar', () => {
    const h = harness();
    expect(h.tab.textContent).toBe('no picks yet');
    h.docClick({ target: h.cardB });
    expect(h.tab.textContent).toBe('1 pick');
    h.docClick({ target: h.card2 });
    expect(h.tab.textContent).toBe('2 picks');
    expect(h.bar.classes.contains('open')).toBe(false);
    h.tabClick();
    expect(h.bar.classes.contains('open')).toBe(true);
    expect(h.tab.getAttribute('aria-expanded')).toBe('true');
    h.tabClick();
    expect(h.bar.classes.contains('open')).toBe(false);
    expect(h.tab.getAttribute('aria-expanded')).toBe('false');
  });
});

describe('the sidebar ruled state', () => {
  it('marks each ruled ruling and states N of M ruled', () => {
    const h = harness();
    expect(h.count.textContent).toBe('0 of 2 ruled');
    h.docClick({ target: h.cardB });
    expect(h.count.textContent).toBe('1 of 2 ruled');
    expect(h.link1.classList.contains('ruled')).toBe(true);
    expect(h.link2.classList.contains('ruled')).toBe(false);
    h.docClick({ target: h.cardA });
    expect(h.count.textContent).toBe('1 of 2 ruled');
    h.docClick({ target: h.card2 });
    expect(h.count.textContent).toBe('2 of 2 ruled');
    expect(h.link2.classList.contains('ruled')).toBe(true);
    h.docClick({ target: h.cardA });
    h.docClick({ target: h.card2 });
    expect(h.count.textContent).toBe('0 of 2 ruled');
    expect(h.link1.classList.contains('ruled')).toBe(false);
    expect(h.link2.classList.contains('ruled')).toBe(false);
  });
});

describe('the narrow wayfinding pill', () => {
  it('carries the spied ruling and hides when its section leaves', () => {
    const h = harness();
    const io = FakeIO.last;
    if (io === null) throw new Error('fixture: no IntersectionObserver');
    io.cb([{ target: h.sec1, isIntersecting: true }]);
    expect(h.where.getAttribute('hidden')).toBeNull();
    expect(h.where.getAttribute('href')).toBe('#r-G1');
    expect(h.where.textContent).toContain('G1');
    expect(h.where.textContent).toContain('Who owns a leaf block?');
    io.cb([{ target: h.sec1, isIntersecting: false }]);
    expect(h.where.getAttribute('hidden')).toBe('');
  });
});

describe('the page note', () => {
  it('grows on input', () => {
    const h = harness();
    h.notesIn.value = 'l1\nl2\nl3';
    for (const ih of h.notesIn.handlers.input ?? []) ih({ target: h.notesIn });
    expect(parseFloat(h.notesIn.style.height)).toBe(60);
  });

  it('shows whole after reload', () => {
    const storage = new Map([
      ['k', JSON.stringify({ note: 'l1\nl2\nl3', onotes: {}, picks: {} })],
    ]);
    const h = harness({ storage });
    expect(h.notesIn.value).toBe('l1\nl2\nl3');
    expect(parseFloat(h.notesIn.style.height)).toBe(60);
  });

  it('reaches a tall note whole within the viewport share', () => {
    const lines = Array.from({ length: 12 }, (_, i) => `l${i}`).join('\n');
    const storage = new Map([
      ['k', JSON.stringify({ note: lines, onotes: {}, picks: {} })],
    ]);
    const h = harness({ storage });
    expect(h.notesIn.value.split('\n')).toHaveLength(12);
    expect(parseFloat(h.notesIn.style.height)).toBe(240);
  });

  it('caps the autogrow at the viewport share, not a fixed pixel height', () => {
    const lines = Array.from({ length: 100 }, (_, i) => `l${i}`).join('\n');
    const storage = new Map([
      ['k', JSON.stringify({ note: lines, onotes: {}, picks: {} })],
    ]);
    const h = harness({ storage });
    expect(parseFloat(h.notesIn.style.height)).toBe(680);
  });
});

describe('persistence', () => {
  it('keeps the storage shape {picks, onotes, note}', () => {
    const h = harness();
    h.docClick({ target: h.cardB });
    h.notesIn.value = 'page note';
    for (const ih of h.notesIn.handlers.input ?? []) ih({ target: h.notesIn });
    const raw = JSON.parse(h.storage.get('k') ?? '{}') as Record<
      string,
      unknown
    >;
    expect(Object.keys(raw).sort()).toEqual(['note', 'onotes', 'picks']);
    expect(raw.picks).toEqual({ G1: 'b' });
    expect(raw.note).toBe('page note');
  });
});
