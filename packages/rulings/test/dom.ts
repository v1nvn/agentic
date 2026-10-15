// The fake DOM the chrome tests run the real emitted script bytes against.
export interface FakeEvent {
  target: El;
  detail?: number;
  key?: string;
  preventDefault?: () => void;
}

export class ClassList extends Array<string> {
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

export class El {
  tag: string;
  attrs: Record<string, string> = {};
  classes = new ClassList();
  parent: El | null = null;
  handlers: Record<string, ((e: FakeEvent) => void)[]> = {};
  children: El[] = [];
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
    this.children.push(c);
  }
  removeChild(c: El): void {
    c.parent = null;
  }
  select(): void {}
  // A scripted card.click() — what the keydown handler fires — dispatches
  // with detail 0, where a real mouse click carries detail >= 1.
  static clickSink: ((e: FakeEvent) => void) | null = null;
  click(): void {
    El.clickSink?.({ target: this, detail: 0 });
  }
  querySelector(sel: string): El | null {
    const name = sel.startsWith('.') ? sel.slice(1) : sel;
    return this.children.find(c => c.classes.includes(name)) ?? null;
  }
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

export class FakeIO {
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
