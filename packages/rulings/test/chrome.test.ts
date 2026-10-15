import vm from 'node:vm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { chromeScript } from '../src/chrome.ts';

// The chrome ships as static script text, so its behavior is tested by
// running the real bytes in a vm against a small fake DOM.
class ClassList extends Array<string> {
  add(c: string): void {
    if (!this.includes(c)) this.push(c);
  }
  remove(c: string): void {
    const i = this.indexOf(c);
    if (i >= 0) this.splice(i, 1);
  }
  toggle(c: string, on?: boolean): void {
    (on === undefined ? !this.contains(c) : on) ? this.add(c) : this.remove(c);
  }
  contains(c: string): boolean {
    return this.includes(c);
  }
}

interface FakeEvent {
  target: El;
}

class El {
  tag: string;
  attrs: Record<string, string> = {};
  classes = new ClassList();
  parent: El | null = null;
  handlers: Record<string, ((e: FakeEvent) => void)[]> = {};
  innerHTML = '';
  textContent = '';
  value = '';
  style: Record<string, string> = {};
  constructor(tag: string, classes: string[] = []) {
    this.tag = tag;
    for (const c of classes) this.classes.add(c);
  }
  get id(): string {
    return this.attrs.id ?? '';
  }
  get classList(): ClassList {
    return this.classes;
  }
  get scrollHeight(): number {
    return Math.max(34, this.value.split('\n').length * 20);
  }
  getAttribute(n: string): string | null {
    return n in this.attrs ? this.attrs[n] : null;
  }
  setAttribute(n: string, v: string): void {
    this.attrs[n] = v;
  }
  removeAttribute(n: string): void {
    delete this.attrs[n];
  }
  addEventListener(t: string, h: (e: FakeEvent) => void): void {
    (this.handlers[t] ??= []).push(h);
  }
  appendChild(c: El): void {
    c.parent = this;
  }
  removeChild(c: El): void {
    c.parent = null;
  }
  select(): void {}
  matches(sel: string): boolean {
    return sel.split(',').some(part => {
      const s = part.trim();
      if (s.startsWith('.')) return this.classes.includes(s.slice(1));
      if (s.startsWith('[')) return s.replace(/^\[|\]$/g, '') in this.attrs;
      return this.tag === s;
    });
  }
  closest(sel: string): El | null {
    let n: El | null = this;
    while (n !== null) {
      if (n.matches(sel)) return n;
      n = n.parent;
    }
    return null;
  }
}

class FakeIO {
  static last: FakeIO | null = null;
  cb: (ents: { target: El; isIntersecting: boolean }[]) => void;
  constructor(cb: FakeIO['cb']) {
    this.cb = cb;
    FakeIO.last = this;
  }
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

interface Harness {
  cardA: El;
  cardB: El;
  sum: El;
  notesIn: El;
  copyBtn: El;
  link1: El;
  sec1: El;
  docClick(e: FakeEvent): void;
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
  const sum = new El('div');
  sum.setAttribute('id', 'picks');
  const notesIn = new El('textarea');
  notesIn.setAttribute('id', 'rulings-notes');
  const copyBtn = new El('button');
  copyBtn.setAttribute('id', 'copy-answer');
  copyBtn.textContent = 'Copy answer';
  const link1 = new El('a', ['rl']);
  link1.setAttribute('href', '#r-G1');
  const link2 = new El('a', ['rl']);
  link2.setAttribute('href', '#r-G2');
  const sec1 = new El('section');
  sec1.setAttribute('id', 'r-G1');
  const sec2 = new El('section');
  sec2.setAttribute('id', 'r-G2');
  const byId = [sum, notesIn, copyBtn];
  const picks = [cardA, cardB];
  const doc = {
    body,
    click: [] as ((e: FakeEvent) => void)[],
    addEventListener(_t: string, h: (e: FakeEvent) => void): void {
      this.click.push(h);
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
    },
  };
  const code = chromeScript()
    .replace(/^<script>\n/, '')
    .replace(/<\/script>$/, '');
  vm.runInNewContext(code, sandbox);
  return {
    cardA,
    cardB,
    sum,
    notesIn,
    copyBtn,
    link1,
    sec1,
    docClick: (e: FakeEvent): void => {
      doc.click.forEach(h => h(e));
      for (const h of e.target.handlers.click ?? []) h(e);
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
