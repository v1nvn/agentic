import vm from 'node:vm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { chromeScript } from '../src/chrome.ts';
import { El, FakeIO, type FakeEvent } from './dom.ts';

interface Harness {
  cardA: El;
  cardB: El;
  cardC: El;
  card2: El;
  secG1: El;
  rowA: El;
  discA: El;
  rowB: El;
  discB: El;
  vtB: El;
  noneRow: El;
  noneDisc: El;
  rnote: El;
  wrapToday: El;
  stage: El;
  foldSum: El;
  wrapB: El;
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
  const cardC = new El('section', ['view', 'o-c']);
  cardC.setAttribute('data-pick', 'G1c');
  cardC.parent = body;
  const secG1 = new El('section');
  secG1.setAttribute('id', 'r-G1');
  secG1.parent = body;
  const rowA = new El('div', ['vrow', 'o-a']);
  rowA.setAttribute('data-view', 'today');
  rowA.setAttribute('data-needs', 'G2a');
  rowA.parent = secG1;
  const discA = new El('button', ['lt', 'disc', 'o-a']);
  discA.setAttribute('data-pick', 'G1a');
  rowA.appendChild(discA);
  const rowB = new El('div', ['vrow', 'o-b']);
  rowB.setAttribute('data-view', 'G1b');
  rowB.parent = secG1;
  const discB = new El('button', ['lt', 'disc', 'o-b']);
  discB.setAttribute('data-pick', 'G1b');
  rowB.appendChild(discB);
  const vtB = new El('span', ['vt']);
  vtB.parent = rowB;
  const noneRow = new El('div', ['vrow', 'none']);
  noneRow.setAttribute('data-pick', 'G1n');
  noneRow.parent = secG1;
  const noneDisc = new El('button', ['lt', 'disc', 'none']);
  noneDisc.setAttribute('data-pick', 'G1n');
  noneRow.appendChild(noneDisc);
  const rnote = new El('input');
  rnote.setAttribute('data-note', 'G1');
  rnote.parent = secG1;
  const wrapToday = new El('div', ['stage-wrap', 'o-a']);
  wrapToday.setAttribute('data-view', 'today');
  wrapToday.setAttribute('data-pick', 'G1a');
  wrapToday.parent = secG1;
  const stage = new El('div', ['stage']);
  stage.parent = wrapToday;
  const foldSum = new El('summary');
  foldSum.parent = wrapToday;
  const wrapB = new El('div', ['stage-wrap', 'o-b']);
  wrapB.setAttribute('data-view', 'G1b');
  wrapB.setAttribute('data-pick', 'G1b');
  wrapB.setAttribute('hidden', '');
  wrapB.parent = secG1;
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
  const picks = [cardA, cardB, cardC, card2];
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
          return [...picks, discA, discB, noneRow, noneDisc];
        case '[data-needs]':
          return [rowA];
        case '.stage-wrap':
          return [wrapToday, wrapB];
        case '.vrow':
          return [rowA, rowB, noneRow];
        case '.rnote':
          return [rnote];
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
    cardC,
    card2,
    secG1,
    rowA,
    discA,
    rowB,
    discB,
    vtB,
    noneRow,
    noneDisc,
    rnote,
    wrapToday,
    stage,
    foldSum,
    wrapB,
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
    h.select('gain text selected by dragging');
    h.docClick({ target: h.vtB });
    expect(JSON.parse(h.storage.get('k') ?? '{}').picks).toEqual({ G1: 'b' });
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

describe('the row picks and shows', () => {
  it('picks and shows on a row-body click; the second click unpicks and the view stays', () => {
    const h = harness();
    h.docClick({ target: h.vtB });
    expect(h.sum.innerHTML).toContain('G1b');
    expect(h.wrapB.getAttribute('hidden')).toBeNull();
    expect(h.wrapToday.getAttribute('hidden')).toBe('');
    expect(h.rowB.getAttribute('aria-current')).toBe('true');
    expect(h.rowB.classList.contains('look')).toBe(true);
    h.docClick({ target: h.vtB });
    expect(h.sum.innerHTML).toContain('no picks yet — pick a letter');
    expect(h.wrapB.getAttribute('hidden')).toBeNull();
    expect(h.rowB.getAttribute('aria-current')).toBe('true');
  });

  it('moves the ruling’s single pick a→b: storage holds exactly one letter', () => {
    const h = harness();
    h.docClick({ target: h.rowA });
    h.docClick({ target: h.rowB });
    expect(JSON.parse(h.storage.get('k') ?? '{}').picks).toEqual({ G1: 'b' });
    expect(h.wrapB.getAttribute('hidden')).toBeNull();
    expect(h.wrapToday.getAttribute('hidden')).toBe('');
    expect(h.rowA.getAttribute('aria-current')).toBeNull();
    expect(h.rowB.getAttribute('aria-current')).toBe('true');
  });

  it('picks and shows on the disc click, by mouse and by keyboard', () => {
    const h = harness();
    h.docClick({ target: h.discB });
    expect(h.sum.innerHTML).toContain('G1b');
    expect(h.wrapB.getAttribute('hidden')).toBeNull();
    expect(h.rowB.getAttribute('aria-current')).toBe('true');
    h.keyDown({ key: 'Enter', target: h.rowA });
    expect(h.sum.innerHTML).toContain('G1a');
    expect(h.wrapToday.getAttribute('hidden')).toBeNull();
    expect(h.wrapB.getAttribute('hidden')).toBe('');
    h.keyDown({ key: ' ', target: h.discA });
    expect(h.sum.innerHTML).toContain('no picks yet — pick a letter');
    expect(h.wrapToday.getAttribute('hidden')).toBeNull();
  });

  it('picks from the shown picture and keeps the view', () => {
    const h = harness();
    h.docClick({ target: h.stage });
    expect(h.sum.innerHTML).toContain('G1a');
    expect(h.wrapToday.getAttribute('hidden')).toBeNull();
    expect(h.rowA.getAttribute('aria-current')).toBe('true');
    expect(h.rowB.getAttribute('aria-current')).toBeNull();
  });

  it('never picks through a fold summary', () => {
    const h = harness();
    h.docClick({ target: h.foldSum });
    expect(h.sum.innerHTML).toContain('no picks yet — pick a letter');
  });

  it('never picks through a fold summary on the keyboard either', () => {
    const h = harness();
    h.keyDown({ key: ' ', target: h.foldSum });
    expect(h.sum.innerHTML).toContain('no picks yet — pick a letter');
    expect(h.storage.size).toBe(0);
    h.keyDown({ key: 'Enter', target: h.foldSum });
    expect(h.sum.innerHTML).toContain('no picks yet — pick a letter');
    expect(h.storage.size).toBe(0);
  });

});

describe('restore on load', () => {
  it('reopens the stored pick’s view', () => {
    const storage = new Map([
      ['k', JSON.stringify({ picks: { G1: 'b' }, onotes: {}, note: '' })],
    ]);
    const h = harness({ storage });
    expect(h.wrapB.getAttribute('hidden')).toBeNull();
    expect(h.wrapToday.getAttribute('hidden')).toBe('');
    expect(h.rowB.getAttribute('aria-current')).toBe('true');
    expect(h.rowB.classList.contains('look')).toBe(true);
  });

  it('opens the first view on a none pick or with nothing stored', () => {
    const storage = new Map([
      ['k', JSON.stringify({ picks: { G1: 'n' }, onotes: {}, note: '' })],
    ]);
    const a = harness({ storage });
    expect(a.wrapToday.getAttribute('hidden')).toBeNull();
    expect(a.rowA.getAttribute('aria-current')).toBe('true');
    expect(a.rowA.classList.contains('look')).toBe(true);
    const b = harness();
    expect(b.wrapToday.getAttribute('hidden')).toBeNull();
    expect(b.wrapB.getAttribute('hidden')).toBe('');
  });
});

describe('unmet needs on the row', () => {
  it('marks the row until its need is picked', () => {
    const h = harness();
    h.docClick({ target: h.discA });
    expect(h.rowA.classList.contains('unmet')).toBe(true);
    h.docClick({ target: h.card2 });
    expect(h.rowA.classList.contains('unmet')).toBe(false);
  });
});

describe('the none row', () => {
  it('picks n from the row and the disc, and unpicks on the second click', () => {
    const h = harness();
    h.docClick({ target: h.noneRow });
    expect(h.sum.innerHTML).toContain('data-unpick="G1n"');
    expect(h.count.textContent).toBe('1 of 2 ruled');
    expect(h.noneRow.getAttribute('aria-pressed')).toBe('true');
    expect(h.noneDisc.getAttribute('aria-pressed')).toBe('true');
    h.docClick({ target: h.noneDisc });
    expect(h.sum.innerHTML).toContain('no picks yet');
    expect(h.count.textContent).toBe('0 of 2 ruled');
    expect(h.noneRow.getAttribute('aria-pressed')).toBe('false');
  });

  it('picks and unpicks from the disc on the keyboard', () => {
    const h = harness();
    h.keyDown({ key: 'Enter', target: h.noneDisc });
    expect(h.sum.innerHTML).toContain('data-unpick="G1n"');
    h.keyDown({ key: ' ', target: h.noneDisc });
    expect(h.sum.innerHTML).toContain('no picks yet');
  });

  it('never looks: it carries no view, moves no aria-current, and takes the pick', () => {
    const h = harness();
    h.keyDown({ key: 'Enter', target: h.rowB });
    expect(h.rowB.getAttribute('aria-current')).toBe('true');
    h.docClick({ target: h.noneRow });
    expect(h.noneRow.getAttribute('data-view')).toBeNull();
    expect(h.noneRow.classList.contains('look')).toBe(false);
    expect(JSON.parse(h.storage.get('k') ?? '{}').picks).toEqual({ G1: 'n' });
    expect(h.rowB.getAttribute('aria-current')).toBe('true');
    expect(h.wrapB.getAttribute('hidden')).toBeNull();
  });
});

describe('the ruling note', () => {
  function type(h: Harness, text: string): void {
    h.rnote.value = text;
    for (const ih of h.rnote.handlers.input ?? []) ih({ target: h.rnote });
  }

  it('rides whichever letter is picked: the same note follows b to c', async () => {
    vi.useFakeTimers();
    const h = harness();
    type(h, 'carry this');
    h.docClick({ target: h.cardB });
    h.docClick({ target: h.copyBtn });
    await vi.advanceTimersByTimeAsync(0);
    expect(h.writes).toEqual(['G1b — carry this']);
    h.docClick({ target: h.cardC });
    h.docClick({ target: h.copyBtn });
    await vi.advanceTimersByTimeAsync(0);
    expect(h.writes).toEqual(['G1b — carry this', 'G1c — carry this']);
  });

  it('rides a none pick as G1n', async () => {
    vi.useFakeTimers();
    const h = harness();
    type(h, 'what is wanted');
    h.docClick({ target: h.noneRow });
    h.docClick({ target: h.copyBtn });
    await vi.advanceTimersByTimeAsync(0);
    expect(h.writes).toEqual(['G1n — what is wanted']);
  });

  it('with no pick still carries nothing', () => {
    const h = harness();
    type(h, 'orphan');
    h.docClick({ target: h.copyBtn });
    expect(h.copyBtn.textContent).toMatch(/no picks/i);
    expect(h.writes).toHaveLength(0);
  });

  it('restores from storage under the ruling key, and a per-pick key drops', () => {
    const storage = new Map([
      [
        'k',
        JSON.stringify({
          picks: { G1: 'b' },
          onotes: { G1: 'kept', G1a: 'stale per-pick note' },
          note: '',
        }),
      ],
    ]);
    const h = harness({ storage });
    expect(h.rnote.value).toBe('kept');
    h.rnote.value = 'kept again';
    for (const ih of h.rnote.handlers.input ?? []) ih({ target: h.rnote });
    const raw = JSON.parse(h.storage.get('k') ?? '{}') as {
      onotes: Record<string, string>;
    };
    expect(raw.onotes).toEqual({ G1: 'kept again' });
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
    expect(h.tab.textContent).toBe('close');
    h.tabClick();
    expect(h.bar.classes.contains('open')).toBe(false);
    expect(h.tab.getAttribute('aria-expanded')).toBe('false');
    expect(h.tab.textContent).toBe('2 picks');
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
    h.rnote.value = 'ruling note';
    for (const ih of h.rnote.handlers.input ?? []) ih({ target: h.rnote });
    h.notesIn.value = 'page note';
    for (const ih of h.notesIn.handlers.input ?? []) ih({ target: h.notesIn });
    const raw = JSON.parse(h.storage.get('k') ?? '{}') as Record<
      string,
      unknown
    >;
    expect(Object.keys(raw).sort()).toEqual(['note', 'onotes', 'picks']);
    expect(raw.picks).toEqual({ G1: 'b' });
    expect(raw.onotes).toEqual({ G1: 'ruling note' });
    expect(raw.note).toBe('page note');
  });
});
