import type { Overlay, Ruling, Seq, Step } from './schema.ts';

import { esc, stripTags, viewHeadFor } from './html.ts';
import { KINDS, seqViews } from './schema.ts';

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

function legendHtml(d: Seq, owner: string): string {
  const used = new Set(d.steps.map(st => st.k));
  const kinds = KINDS.filter(k => used.has(k)).map(
    k =>
      `<span style="--k:var(--k-${k})"><i${k === 'check' ? ' class="dash"' : ''}></i>${KIND_TEXT[k]}</span>`,
  );
  const sw = seqViews(d, owner).length
    ? '<span><b class="sw"></b>what this option changes</span>'
    : '';
  return `<div class="legend">${kinds.join('')}${sw}</div>`;
}

// An option view expands each step's overlay, keeps only steps the view owns
// (`in`) and tags those rows new / changed / gone — the two load-bearing
// features no mermaid equivalent carries.
function seqSvg(d: Seq, owner: string, view: string): string {
  const steps = d.steps.filter(st =>
    st.in
      ? view !== 'today' && st.in.map(v => full(v, owner)).includes(view)
      : true,
  );
  const L = d.lanes.length;
  const G = 92;
  const LW = 170;
  const BW = 108;
  const nb = d.ledger?.length ?? 0;
  const gap = nb ? 18 : 0;
  const lanesW = G + L * LW;
  const W = lanesW + gap + nb * BW + 8;
  const top = 96;
  function X(i: number): number {
    return G + LW * (i + 0.5);
  }
  function bx(j: number): number {
    return lanesW + gap + BW * (j + 0.5);
  }
  function fmt(v: Cell): string {
    return typeof v === 'number' ? v.toLocaleString('en-US') : String(v);
  }
  const rows = steps.map(st => {
    const ov = overlayFor(st, view, owner);
    const s = ov?.s ?? st.s;
    return 40 + (s ? 14 : 0) + (ov?.n ? 16 : 0);
  });
  const H = top + rows.reduce((a, b) => a + b, 0) + 12;
  let out = `<svg class="seq" viewBox="0 0 ${W} ${H}" style="min-width:${Math.min(W, 760)}px" role="img" aria-label="${esc(stripTags(d.cap ?? ''))}">`;
  if (nb) {
    out += `<rect class="ledger-bg" x="${lanesW + gap - 6}" y="8" width="${nb * BW + 12}" height="${H - 14}" rx="4"/>`;
  }
  let y0 = top;
  steps.forEach((st, i) => {
    if (st.in !== undefined || overlayFor(st, view, owner) !== undefined) {
      out += `<rect class="band" x="4" y="${y0 + 2}" width="${lanesW - 4}" height="${rows[i] - 4}" rx="3"/>`;
    }
    y0 += rows[i];
  });
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
  y0 = top;
  steps.forEach((st, i) => {
    const ov = overlayFor(st, view, owner);
    const gone = ov?.a === 'del';
    const isNew = st.in !== undefined;
    const label = ov?.x ?? st.x ?? '';
    const sub = ov?.s ?? st.s;
    const y = y0 + 22;
    const tag = isNew ? 'new' : gone ? 'gone' : ov ? 'changed' : null;
    out += `<g${gone ? ' class="gone"' : ''}>`;
    out += `<text class="num" x="14" y="${y + 4}" text-anchor="middle">${i + 1}</text>`;
    if (tag) {
      out += `<g class="tg tg-${tag}"><rect x="26" y="${y - 9}" width="58" height="18" rx="9"/><text x="55" y="${y + 4}" text-anchor="middle">${tag}</text></g>`;
    }
    let ly: number;
    if (st.f === st.t) {
      const w = Math.min(
        LW * 1.95,
        Math.max(label.length, (sub ?? '').length) * 6.4 + 30,
      );
      const cx = Math.max(G + w / 2, Math.min(lanesW - w / 2, X(st.f)));
      const h = sub ? 36 : 26;
      out +=
        `<g class="self k-${st.k}"><rect x="${cx - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="${h / 2}"/>` +
        `<text x="${cx}" y="${sub ? y - 3 : y + 4}" text-anchor="middle">${esc(label)}</text>` +
        (sub
          ? `<text class="sub" x="${cx}" y="${y + 12}" text-anchor="middle">${esc(sub)}</text>`
          : '') +
        '</g>';
      if (gone) {
        out += `<line class="strike" x1="${cx - w / 2 + 8}" y1="${y}" x2="${cx + w / 2 - 8}" y2="${y}"/>`;
      }
      ly = y + h / 2 + 12;
    } else {
      const x1 = X(st.f);
      const x2 = X(st.t);
      const r = x2 > x1;
      const mid = (x1 + x2) / 2;
      const tip = r ? x2 - 4 : x2 + 4;
      const hd = r
        ? `${x2},${y} ${x2 - 9},${y - 5} ${x2 - 9},${y + 5}`
        : `${x2},${y} ${x2 + 9},${y - 5} ${x2 + 9},${y + 5}`;
      out +=
        `<g class="e k-${st.k}"><line x1="${x1}" y1="${y}" x2="${tip}" y2="${y}"/><polygon class="head" points="${hd}"/>` +
        `<text x="${mid}" y="${y - 8}" text-anchor="middle">${esc(label)}</text>` +
        (sub
          ? `<text class="sub" x="${mid}" y="${y + 16}" text-anchor="middle">${esc(sub)}</text>`
          : '') +
        '</g>';
      if (gone) {
        const tw = label.length * 3.3;
        out += `<line class="strike" x1="${mid - tw}" y1="${y - 12}" x2="${mid + tw}" y2="${y - 12}"/>`;
      }
      ly = y + (sub ? 30 : 18);
    }
    out += '</g>';
    if (ov?.n) {
      const ncx = Math.max(
        G + 160,
        Math.min(
          lanesW - 160,
          st.f === st.t ? X(st.f) : (X(st.f) + X(st.t)) / 2,
        ),
      );
      out += `<text class="note" x="${ncx}" y="${ly}" text-anchor="middle">${esc(ov.n)}</text>`;
    }
    const b = ov?.b ?? st.b;
    if (b !== undefined && !gone) {
      b.forEach((raw, j) => {
        const v: Cell = raw ?? prev[j] ?? null;
        const chg = v !== (prev[j] ?? null);
        out += `<text class="bal${chg ? ' chg' : ''}" x="${bx(j)}" y="${y + 4}" text-anchor="middle">${esc(fmt(v))}</text>`;
        prev[j] = v;
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
  attrs = '',
): string {
  const d = q.seq;
  if (d === undefined) {
    return '';
  }
  const { head, hue } = viewHeadFor(q, view);
  const capKey = Object.keys(d.caps ?? {}).find(k => full(k, id) === view);
  const cap = capKey === undefined ? d.cap : d.caps?.[capKey];
  return (
    `<section class="view${view === 'today' ? ' today' : ''}${hue ? ` ${hue}` : ''}"${attrs}>${head}` +
    `<div class="stage">${legendHtml(d, id)}<div class="scroll">${seqSvg(d, id, view)}</div>` +
    (cap ? `<p class="cap">${cap}</p>` : '') +
    '</div></section>'
  );
}
