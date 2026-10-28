import type { Overlay, Ruling, Seq, Step } from './schema.ts';

import { esc, type Stage, stripTags } from './html.ts';
import { KINDS } from './schema.ts';

const KIND_TEXT: Record<(typeof KINDS)[number], string> = {
  call: 'a call or a reply',
  check: 'a read or a check',
  fail: 'an error',
  money: 'money moves',
  store: 'a write that lasts',
};

type Cell = null | number | string;

function full(v: string, owner: string): string {
  return /^[a-z]$/.test(v) && owner ? owner + v : v;
}

function overlayFor(
  st: Step,
  view: string,
  owner: string,
): Overlay | undefined {
  if (view === 'today' || st.o === undefined) {
    return undefined;
  }
  for (const [v, ov] of Object.entries(st.o)) {
    if (full(v, owner) === view) {
      return ov;
    }
  }
  return undefined;
}

// A step the view's option adds (`in`) or reshapes (`o`).
function changedIn(st: Step, view: string, owner: string): boolean {
  return (
    view !== 'today' &&
    ((st.in?.map(v => full(v, owner)).includes(view) ?? false) ||
      overlayFor(st, view, owner) !== undefined)
  );
}

// A step that happens in the view: everything the chain holds, minus steps
// that exist only in other options (`in`) and steps the view strikes (`del`).
function runsIn(st: Step, view: string, owner: string): boolean {
  return (
    !elsewhere(st, view, owner) && overlayFor(st, view, owner)?.a !== 'del'
  );
}

function elsewhere(st: Step, view: string, owner: string): boolean {
  return (
    st.in !== undefined &&
    (view === 'today' || !st.in.map(v => full(v, owner)).includes(view))
  );
}

function legendHtml(d: Seq, hasDeltas: boolean): string {
  const used = new Set(d.steps.map(st => st.k));
  const kinds = KINDS.filter(k => used.has(k)).map(
    k =>
      `<span style="--k:var(--k-${k})"><i${k === 'check' ? ' class="dash"' : ''}></i>${KIND_TEXT[k]}</span>`,
  );
  const sw = hasDeltas
    ? '<span><b class="sw"></b>what this option changes</span>'
    : '';
  return `<div class="legend">${kinds.join('')}${sw}</div>`;
}

const GHOST_H = 28;
const CHAR_W = 6.4;
const SMALL_CHAR_W = 5.8;
const GHOST_CHAR_W = 6.6;
const LINE_H = 15;
const WAS_H = 16;

function wrap(text: string, width: number, charW = CHAR_W): string[] {
  const max = Math.max(8, Math.floor(width / charW));
  const lines: string[] = [];
  let line = '';
  for (const w of text.split(' ')) {
    if (line !== '' && line.length + 1 + w.length > max) {
      lines.push(line);
      line = w;
    } else {
      line = line === '' ? w : `${line} ${w}`;
    }
  }
  return [...lines, line];
}

type Mark = 'changed' | 'gone' | 'new' | 'same' | 'today';

interface Row {
  ghost: null | string;
  lines: string[];
  mark: Mark;
  n: number;
  st: Step;
  was: string[];
}

// Every chain number is drawn in every view: a step only other options run
// is a quiet row naming it; the rest draw whole, with an option's own steps
// banded and today's text kept under the one it replaced.
function seqSvg(d: Seq, owner: string, view: string, cap: string): string {
  const L = d.lanes.length;
  const G = 92;
  const LW = 170;
  const BW = 108;
  const nb = d.ledger?.length ?? 0;
  const gap = nb ? 18 : 0;
  const lanesW = G + L * LW;
  const W = lanesW + gap + nb * BW + 8;
  const top = 96;
  const labelW = Math.min(lanesW - G - 16, LW * 2 - 20);
  const shown: Row[] = d.steps.map((st, i) => {
    const n = i + 1;
    if (elsewhere(st, view, owner)) {
      const only = (st.in ?? []).map(v => full(v, owner).slice(-1)).join(', ');
      return {
        ghost: `only in ${only}: ${st.x}`,
        lines: [],
        mark: 'same',
        n,
        st,
        was: [],
      };
    }
    const ov = overlayFor(st, view, owner);
    const mark: Mark =
      view === 'today'
        ? 'today'
        : st.in !== undefined
          ? 'new'
          : ov?.a === 'del'
            ? 'gone'
            : ov
              ? 'changed'
              : 'same';
    const label = ov?.x ?? st.x ?? '';
    return {
      ghost: null,
      lines: wrap(label, st.f === st.t ? LW * 1.95 - 30 : labelW),
      mark,
      n,
      st,
      was:
        mark === 'changed' && label !== st.x
          ? wrap(`was ${st.x}`, labelW, SMALL_CHAR_W)
          : [],
    };
  });
  function X(i: number): number {
    return G + LW * (i + 0.5);
  }
  function bx(j: number): number {
    return lanesW + gap + BW * (j + 0.5);
  }
  function fmt(v: Cell): string {
    return typeof v === 'number' ? v.toLocaleString('en-US') : String(v);
  }
  function ghostRow(n: number, tag: string, y0: number): string {
    const y = y0 + GHOST_H / 2;
    const tagEnd = 26 + tag.length * GHOST_CHAR_W;
    return (
      `<g class="ghost"><text class="num" x="14" y="${y + 4}" text-anchor="middle">${n}</text>` +
      `<text class="ghosttag" x="26" y="${y + 3.5}">${esc(tag)}</text>` +
      (tagEnd + 10 < lanesW - 8
        ? `<line class="ghostrule" x1="${tagEnd + 10}" y1="${y}" x2="${lanesW - 8}" y2="${y}"/>`
        : '') +
      '</g>'
    );
  }
  const rows = shown.map(({ ghost, lines, st, was }) => {
    if (ghost !== null) {
      return GHOST_H;
    }
    const ov = overlayFor(st, view, owner);
    const s = ov?.s ?? st.s;
    return (
      40 +
      (lines.length - 1) * LINE_H +
      (s ? 14 : 0) +
      was.length * WAS_H +
      (ov?.n ? 16 : 0)
    );
  });
  const H = top + rows.reduce((a, b) => a + b, 0) + 12;
  let out = `<svg class="seq" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img"${cap ? ` aria-label="${esc(stripTags(cap))}"` : ''}>`;
  if (nb) {
    out += `<rect class="ledger-bg" x="${lanesW + gap - 6}" y="8" width="${nb * BW + 12}" height="${H - 14}" rx="4"/>`;
  }
  {
    let y0 = top;
    shown.forEach((row, i) => {
      if (row.ghost === null && row.mark !== 'same' && row.mark !== 'today') {
        out += `<rect class="band" x="4" y="${y0 + 2}" width="${lanesW - 4}" height="${rows[i] - 4}" rx="3"/>`;
      }
      y0 += rows[i];
    });
  }
  d.lanes.forEach((a, i) => {
    out += `<line class="life" x1="${X(i)}" y1="56" x2="${X(i)}" y2="${H - 8}"/>`;
    const parts = a.split('\n');
    out +=
      `<g class="actor"><rect x="${X(i) - LW / 2 + 8}" y="12" width="${LW - 16}" height="44" rx="4"/>` +
      parts
        .map(
          (p, k) =>
            `<text x="${X(i)}" y="${parts.length > 1 ? 30 + k * 15 : 39}" text-anchor="middle">${esc(p)}</text>`,
        )
        .join('') +
      '</g>';
  });
  (d.ledger ?? []).forEach((b, j) => {
    b.split('\n').forEach(
      (t, k) =>
        (out += `<text class="balh" x="${bx(j)}" y="${32 + k * 14}" text-anchor="middle">${esc(t)}</text>`),
    );
  });
  if (nb) {
    out += `<text class="num" x="4" y="${top - 6}">start</text>`;
    (d.start ?? []).forEach(
      (v, j) =>
        (out += `<text class="bal" x="${bx(j)}" y="${top - 6}" text-anchor="middle">${esc(fmt(v))}</text>`),
    );
  }
  const prev: Cell[] = (d.start ?? []).slice();
  const bals = new Map<Step, { post: Cell[]; pre: Cell[] }>();
  for (const st of d.steps) {
    if (!runsIn(st, view, owner)) {
      continue;
    }
    const b = overlayFor(st, view, owner)?.b ?? st.b;
    if (b === undefined) {
      continue;
    }
    const pre = prev.slice();
    b.forEach((raw, j) => {
      prev[j] = raw ?? prev[j] ?? null;
    });
    bals.set(st, { pre, post: prev.slice() });
  }
  let y0 = top;
  shown.forEach((row, i) => {
    if (row.ghost !== null) {
      out += ghostRow(row.n, row.ghost, y0);
      y0 += rows[i];
      return;
    }
    const { lines, mark, n, st, was } = row;
    const ov = overlayFor(st, view, owner);
    const gone = mark === 'gone';
    const sub = ov?.s ?? st.s;
    const extra = (lines.length - 1) * LINE_H;
    const lineW = Math.max(...lines.map(l => l.length)) * CHAR_W;
    const tag = mark === 'today' || mark === 'same' ? null : mark;
    const cls = gone ? 'gone' : mark === 'same' ? 'same' : '';
    out += `<g${cls ? ` class="${cls}"` : ''}>`;
    let y: number;
    let ly: number;
    let cx: number;
    if (st.f === st.t) {
      y = y0 + 22 + extra / 2;
      const w = Math.min(
        LW * 1.95,
        Math.max(lineW, (sub ?? '').length * CHAR_W) + 30,
      );
      cx = Math.max(G + w / 2, Math.min(lanesW - w / 2, X(st.f)));
      const h = 26 + extra + (sub ? 10 : 0);
      const t0 = y - h / 2 + 17;
      out +=
        `<g class="self k-${st.k}"><rect x="${cx - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="${Math.min(h / 2, 13)}"/>` +
        lines
          .map(
            (l, k) =>
              `<text x="${cx}" y="${t0 + k * LINE_H}" text-anchor="middle">${esc(l)}</text>`,
          )
          .join('') +
        (sub
          ? `<text class="sub" x="${cx}" y="${t0 + extra + 15}" text-anchor="middle">${esc(sub)}</text>`
          : '') +
        '</g>';
      if (gone) {
        out += `<line class="strike" x1="${cx - w / 2 + 8}" y1="${y}" x2="${cx + w / 2 - 8}" y2="${y}"/>`;
      }
      ly = y + h / 2 + 12;
    } else {
      y = y0 + 22 + extra;
      const x1 = X(st.f);
      const x2 = X(st.t);
      const r = x2 > x1;
      cx = Math.max(G + lineW / 2, Math.min(lanesW - lineW / 2, (x1 + x2) / 2));
      const tip = r ? x2 - 4 : x2 + 4;
      const hd = r
        ? `${x2},${y} ${x2 - 9},${y - 5} ${x2 - 9},${y + 5}`
        : `${x2},${y} ${x2 + 9},${y - 5} ${x2 + 9},${y + 5}`;
      out +=
        `<g class="e k-${st.k}"><line x1="${x1}" y1="${y}" x2="${tip}" y2="${y}"/><polygon class="head" points="${hd}"/>` +
        lines
          .map(
            (l, k) =>
              `<text x="${cx}" y="${y - 8 - (lines.length - 1 - k) * LINE_H}" text-anchor="middle">${esc(l)}</text>`,
          )
          .join('') +
        (sub
          ? `<text class="sub" x="${cx}" y="${y + 16}" text-anchor="middle">${esc(sub)}</text>`
          : '') +
        '</g>';
      if (gone) {
        out += `<line class="strike" x1="${cx - lineW / 2}" y1="${y - 12}" x2="${cx + lineW / 2}" y2="${y - 12}"/>`;
      }
      ly = y + (sub ? 30 : 18);
    }
    out += `<text class="num" x="14" y="${y + 4}" text-anchor="middle">${n}</text>`;
    if (tag) {
      out += `<g class="tg tg-${tag}"><rect x="26" y="${y - 9}" width="58" height="18" rx="4"/><text x="55" y="${y + 4}" text-anchor="middle">${tag}</text></g>`;
    }
    out += '</g>';
    for (const [k, l] of was.entries()) {
      const old = k === 0 ? l.slice('was '.length) : l;
      const half = (l.length * SMALL_CHAR_W) / 2;
      const wx = Math.max(G + half, Math.min(lanesW - half, cx));
      out += `<text class="was" x="${wx}" y="${ly}" text-anchor="middle">${k === 0 ? 'was ' : ''}<tspan class="old">${esc(old)}</tspan></text>`;
      ly += WAS_H;
    }
    if (ov?.n) {
      const ncx = Math.max(G + 160, Math.min(lanesW - 160, cx));
      out += `<text class="note" x="${ncx}" y="${ly}" text-anchor="middle">${esc(ov.n)}</text>`;
    }
    const bal = bals.get(st);
    if (bal !== undefined) {
      bal.post.forEach((v, j) => {
        const chg = v !== (bal.pre[j] ?? null);
        out += `<text class="bal${chg ? ' chg' : ''}" x="${bx(j)}" y="${y + 4}" text-anchor="middle">${esc(fmt(v))}</text>`;
      });
    }
    y0 += rows[i];
  });
  return out + '</svg>';
}

export function seqView(
  q: Ruling,
  id: string,
  view: string,
): Stage | undefined {
  const d = q.seq;
  if (d === undefined) {
    return undefined;
  }
  const capKey = Object.keys(d.caps ?? {}).find(k => full(k, id) === view);
  const cap = capKey === undefined ? d.cap : d.caps?.[capKey];
  const hasDeltas = d.steps.some(st => changedIn(st, view, id));
  return {
    body: `${legendHtml(d, hasDeltas)}<div class="scroll">${seqSvg(d, id, view, cap ?? '')}</div>`,
    cap: cap ?? '',
  };
}
