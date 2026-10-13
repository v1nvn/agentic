import {
  bg,
  BLOCK,
  bold,
  dim,
  green,
  indexed,
  type Ink,
  line,
  type Line,
  magenta,
  plain,
  red,
  rgb,
  type Segment,
  TRACK,
  yellow,
} from '@v1nvn/agentic-core/draw';

import type { GitFacts } from './git.ts';
import type { Row } from './payload.ts';

import { fmtDuration, fmtFixed, fmtK, fmtM, pad2 } from './awk.ts';

export interface SegmentInput {
  readonly git: GitFacts;
  readonly home: string;
  readonly model: string;
  readonly now: number;
  readonly row: Row;
}

type SegmentRenderer = (input: SegmentInput) => Line;

const SHORT_AT = 15;
const PART = ['▏', '▎', '▍', '▌', '▋', '▊', '▉', '█'];
const GRAY: Ink = rgb(68, 71, 90);
const HEAT: readonly Ink[] = [
  [48, 242, 36],
  [63, 242, 36],
  [79, 242, 36],
  [95, 242, 36],
  [111, 242, 36],
  [126, 242, 36],
  [142, 242, 36],
  [158, 242, 36],
  [173, 242, 36],
  [189, 242, 36],
  [205, 242, 36],
  [220, 242, 36],
  [236, 242, 36],
  [242, 232, 36],
  [242, 216, 36],
  [242, 200, 36],
  [242, 185, 36],
  [242, 169, 36],
  [242, 153, 36],
  [242, 138, 36],
  [242, 122, 36],
  [242, 106, 36],
  [242, 91, 36],
  [242, 75, 36],
  [242, 59, 36],
  [242, 44, 36],
].map(([r, g, b]) => rgb(r, g, b));

function trunc(n: number): number {
  return Math.trunc(n);
}

function modelPlain({ model }: SegmentInput): Line {
  return model === '' ? line() : line({ text: model, ink: 'cyan' });
}

function modelBlock({ model }: SegmentInput): Line {
  return model === ''
    ? line()
    : line(
        { text: '', ink: bg(indexed(61)), carry: true },
        { text: ` ${model} `, ink: indexed(231) },
      );
}

function modelPill({ model }: SegmentInput): Line {
  return model === ''
    ? line()
    : line(
        { text: '', ink: bg(indexed(61)), carry: true },
        {
          text: `\u{e0b6} ${model} \u{e0b4}`,
          ink: indexed(231),
        },
      );
}

function modelZen({ model }: SegmentInput): Line {
  return model === ''
    ? line()
    : line(dim(model.replace(/[A-Z]/g, c => c.toLowerCase())));
}

function effortPlain({ row }: SegmentInput): Line {
  return row.effort === '' ? line() : line({ text: row.effort, ink: 'cyan' });
}

function effortDim({ row }: SegmentInput): Line {
  return row.effort === '' ? line() : line(dim(row.effort));
}

function statePill(label: string, bgN: number, fgN: number): Line {
  return line(
    { text: '', ink: bg(indexed(bgN)), carry: true },
    { text: `\u{e0b6} ${label} \u{e0b4}`, ink: indexed(fgN) },
  );
}

function statePills({ row }: SegmentInput): Line {
  const pills: Line[] = [];
  if (row.vim !== '') {
    pills.push(
      row.vim === 'INSERT'
        ? statePill(row.vim, 97, 16)
        : statePill(row.vim, 240, 231),
    );
  }
  if (row.think) {
    pills.push(statePill('THINK', 66, 16));
  }
  if (row.agent !== '') {
    pills.push(statePill(row.agent, 60, 231));
  }
  if (row.wt !== '') {
    pills.push(statePill(`wt:${row.wt}`, 131, 231));
  }
  if (row.styleName !== '' && row.styleName !== 'default') {
    pills.push(statePill(row.styleName, 95, 16));
  }
  return line(
    ...pills.flatMap((pill, at) =>
      at === 0 && row.vim !== '' ? pill : [plain(' '), ...pill],
    ),
  );
}

interface SplitPath {
  readonly lead: string;
  readonly parts: readonly string[];
  readonly text: string;
}

function splitPath(raw: string, home: string): SplitPath {
  let p = raw;
  if (home !== '' && p.startsWith(home)) {
    p = `~${p.slice(home.length)}`;
  }
  return {
    lead: p.startsWith('/') ? '/' : '',
    parts: p.split('/').filter(part => part !== ''),
    text: p,
  };
}

function pathInit(raw: string, home: string): string {
  const { lead, parts, text } = splitPath(raw, home);
  const n = parts.length;
  if (n <= 2) {
    return text;
  }
  let out = `${lead}${parts[0]}`;
  for (let i = 1; i < n - 1; i++) {
    const ini = parts[i].startsWith('.')
      ? parts[i].slice(0, 2)
      : parts[i].slice(0, 1);
    out += `/${ini}`;
  }
  return `${out}/${parts[n - 1]}`;
}

function pathTail(raw: string, home: string, lim: number): string {
  const { lead, parts, text } = splitPath(raw, home);
  const cnt = parts.length;
  if (cnt <= lim || cnt <= 1) {
    return text;
  }
  let out = `${lead}${parts[0]}/…`;
  for (let i = cnt - lim; i < cnt; i++) {
    out += `/${parts[i]}`;
  }
  return out;
}

function cwdInit({ home, row }: SegmentInput): Line {
  const { text } = splitPath(row.dir, home);
  return line(
    plain(
      Buffer.byteLength(text, 'utf8') > SHORT_AT
        ? pathInit(row.dir, home)
        : text,
    ),
  );
}

function cwdFull({ home, row }: SegmentInput): Line {
  return line(plain(splitPath(row.dir, home).text));
}

function cwdTail({ home, row }: SegmentInput): Line {
  return line(plain(pathTail(row.dir, home, 1)));
}

function baseName(dir: string): string {
  return dir.slice(dir.lastIndexOf('/') + 1);
}

function cwdBase({ row }: SegmentInput): Line {
  return line(plain(baseName(row.dir)));
}

function cwdIcon({ row }: SegmentInput): Line {
  return line(plain(`\u{f07b} ${baseName(row.dir)}`));
}

function branchInitials({ git }: SegmentInput): Line {
  const branch = git.branch;
  if (branch === '') {
    return line();
  }
  if (Buffer.byteLength(branch, 'utf8') <= SHORT_AT) {
    return line(plain(branch));
  }
  const parts = branch.split('/').filter(part => part !== '');
  if (parts.length <= 1) {
    return line(plain(branch));
  }
  let out = '';
  for (let i = 0; i < parts.length - 1; i++) {
    out += `${parts[i].slice(0, 1)}/`;
  }
  return line(plain(`${out}${parts[parts.length - 1]}`));
}

function branchFull({ git }: SegmentInput): Line {
  return line(plain(git.branch));
}

function branchLast({ git }: SegmentInput): Line {
  return line(plain(git.branch.slice(git.branch.lastIndexOf('/') + 1)));
}

function branchIcon({ git }: SegmentInput): Line {
  return git.branch === '' ? line() : line(plain(`\u{e0a0} ${git.branch}`));
}

function statusCounts({ git }: SegmentInput): Line {
  if (git.branch === '') {
    return line();
  }
  const segs: Segment[] = [];
  if (git.staged > 0) {
    segs.push(green(`+${git.staged}`));
  }
  if (git.modified > 0) {
    segs.push(plain(' '), yellow(`~${git.modified}`));
  }
  return line(...segs);
}

function statusIcons({ git }: SegmentInput): Line {
  if (git.branch === '') {
    return line();
  }
  const segs: Segment[] = [];
  if (git.staged > 0) {
    segs.push(green(`●${git.staged}`));
  }
  if (git.modified > 0) {
    segs.push(yellow(`✎${git.modified}`));
  }
  if (git.untracked > 0) {
    segs.push({ text: `+${git.untracked}`, ink: 'cyan' });
  }
  if (git.stashes > 0) {
    segs.push(magenta(`⚑${git.stashes}`));
  }
  return line(
    ...segs.flatMap((seg, at) => (at === 0 ? [seg] : [plain(' '), seg])),
  );
}

function aheadArrows({ git }: SegmentInput): Line {
  const segs: Segment[] = [];
  if (git.ahead > 0) {
    segs.push(green(`↑${git.ahead}`));
  }
  if (git.behind > 0) {
    segs.push(plain(' '), red(`↓${git.behind}`));
  }
  return line(...segs);
}

function prBadge({ row }: SegmentInput): Line {
  if (row.prn === '') {
    return line();
  }
  let ink: Ink;
  let mark: string;
  switch (row.prs) {
    case 'approved':
      ink = 'green';
      mark = '✓';
      break;
    case 'changes_requested':
      ink = 'red';
      mark = '✗';
      break;
    case 'pending':
      ink = 'yellow';
      mark = '⏳';
      break;
    default:
      ink = 'brightBlack';
      mark = '◌';
  }
  return line({ text: `#${row.prn}`, ink: 'blue' }, plain(' '), {
    text: `${mark} ${row.prs}`,
    ink,
  });
}

function barFlatAt(input: SegmentInput, w: number): Line {
  const pct = input.row.pct;
  let f = trunc((pct * w) / 100);
  if (f > w) {
    f = w;
  }
  if (pct > 0 && f === 0) {
    f = 1;
  }
  const ink: Ink = pct >= 90 ? 'red' : pct >= 70 ? 'yellow' : 'green';
  return line({ text: BLOCK.repeat(f) + TRACK.repeat(w - f), ink });
}

function barFlat(input: SegmentInput): Line {
  return barFlatAt(input, 10);
}

function barGauge({ row }: SegmentInput): Line {
  const pct = row.pct;
  const p = Math.max(0, Math.min(100, pct));
  const full = trunc((p * 26) / 100);
  const idx = trunc((((p * 26) % 100) * 8) / 100);
  const lead: Ink =
    p >= 50
      ? rgb(242, trunc((4845 * (15000 + 1683 * (100 - p))) / 2000000), 36)
      : rgb(trunc((4845 * (185000 - 1683 * (100 - p))) / 2000000), 242, 36);
  const moon = ['○', '◔', '◑', '◕', '●'][Math.min(trunc(p / 20), 4)];
  const segs: Segment[] = [
    plain(`${moon} `),
    { text: '', ink: lead, carry: true },
  ];
  for (let i = 0; i < 26; i++) {
    let ink: Ink;
    let cell: string;
    if (i === 20) {
      ink = 'mark';
      cell = i <= full ? '┃' : '│';
    } else if (i <= full) {
      ink = HEAT[i];
      cell = i === full ? PART[idx] : BLOCK;
    } else {
      ink = GRAY;
      cell = TRACK;
    }
    segs.push({ carry: i < 25, ink, text: cell });
  }
  segs.push(plain(' '), { text: `${pct}%`, ink: 'mark' });
  return line(...segs);
}

function tokensFull({ row }: SegmentInput): Line {
  const t = row.tokens >= 1000 ? fmtK(row.tokens, 1) : String(row.tokens);
  let c = String(row.ctxSize);
  if (row.ctxSize >= 1000000) {
    c = fmtM(row.ctxSize);
  } else if (row.ctxSize >= 1000) {
    c = fmtK(row.ctxSize, 0);
  }
  return line(plain(`${t}/${c}`));
}

function tokensCompact({ row }: SegmentInput): Line {
  return line(
    plain(row.tokens >= 1000 ? fmtK(row.tokens, 0) : String(row.tokens)),
  );
}

function tokensFree({ row }: SegmentInput): Line {
  const free = row.ctxSize - row.tokens;
  return line(dim(`${free >= 1000 ? fmtK(free, 0) : String(free)} free`));
}

function cacheHitPct(row: Row): null | number {
  return row.hit === null ? null : trunc(row.hit * 100);
}

function cacheHInk(hp: number): Ink {
  return hp >= 90 ? 'green' : hp >= 50 ? 'yellow' : 'red';
}

function cacheHit({ row }: SegmentInput): Line {
  const hp = cacheHitPct(row);
  return hp === null ? line() : line({ text: `⚡${hp}%`, ink: cacheHInk(hp) });
}

function cacheColdin({ now, row }: SegmentInput): Line {
  if (row.ttl === '' || row.expires === 0) {
    return line();
  }
  if (row.warm && row.expires > now) {
    return line(dim(`cold in ${trunc((row.expires - now) / 60)}m`));
  }
  return line(dim('❄ cold'));
}

function cacheUntil({ row }: SegmentInput): Line {
  if (row.ttl === '' || row.expires === 0) {
    return line();
  }
  const at = new Date(row.expires * 1000);
  return line(dim(`${pad2(at.getHours())}:${pad2(at.getMinutes())}`));
}

function cacheFuse({ now, row }: SegmentInput): Line {
  if (row.ttl === '' || row.expires === 0) {
    return line();
  }
  const span = row.ttl === '1h' ? 3600 : 300;
  let left = row.expires - now;
  if (left < 0) {
    left = 0;
  }
  if (left <= 0) {
    return line({ text: '❄ cold', ink: 'red' });
  }
  const full = Math.min(10, trunc((left * 10) / span));
  const rem = (left * 10) % span;
  const ink: Ink =
    left * 4 > span ? 'green' : left * 25 > span * 2 ? 'yellow' : 'red';
  let head = '▰'.repeat(full);
  if (full < 10 && rem * 20 > span) {
    head += PART[trunc((rem * 8) / span)];
  }
  const segs: Segment[] = [{ carry: head.length < 10, ink, text: head }];
  for (let i = head.length; i < 10; i++) {
    segs.push({ carry: i < 9, ink: 'dim', text: '▱' });
  }
  segs.push(plain(' '), dim(`${pad2(trunc(left / 60))}:${pad2(left % 60)}`));
  return line(...segs);
}

function costPlain({ row }: SegmentInput): Line {
  return row.cost >= 0.005 ? line(yellow(`$${fmtFixed(row.cost, 2)}`)) : line();
}

function costBurn(input: SegmentInput): Line {
  const hr = input.row.durationMs / 3600000;
  // awk's else branch prints "0", never "0.00", so a sub-threshold burn rate
  // still appends "$0/hr" — ported as-is.
  const burn = hr > 0.02 ? fmtFixed(input.row.cost / hr, 2) : '0';
  const segs: Segment[] = [];
  if (input.row.cost >= 0.005) {
    segs.push(yellow(`$${fmtFixed(input.row.cost, 2)}`));
  }
  if (burn !== '0.00') {
    segs.push(plain(' '), dim(`· $${burn}/hr`));
  }
  return line(...segs);
}

function durationClock({ row }: SegmentInput): Line {
  return line(plain(fmtDuration(trunc(row.durationMs / 60000))));
}

function durationHours({ row }: SegmentInput): Line {
  const m = trunc(row.durationMs / 60000);
  if (m < 1440) {
    return line(plain(`${trunc(m / 60)}h${pad2(m % 60)}m`));
  }
  return line(
    plain(`${trunc(m / 1440)}d${pad2(trunc(m / 60) % 24)}h${pad2(m % 60)}m`),
  );
}

function linesDiffstat({ row }: SegmentInput): Line {
  if (row.la <= 0 && row.lr <= 0) {
    return line();
  }
  return line(green(`+${row.la}`), dim('/'), red(`−${row.lr}`));
}

function rateStrip({ now, row }: SegmentInput): Line {
  const segs: Segment[] = [];
  for (const [at, limit] of row.rateRows.entries()) {
    const [intpText, fracp = ''] = limit.pctText.split('.');
    let f = 0;
    let scale = 1;
    for (const digit of fracp) {
      f = f * 10 + Number(digit);
      scale *= 10;
    }
    const intp = Number(intpText);
    const value = intp * scale + f;
    const ink: Ink =
      value < 70 * scale ? 'green' : value < 90 * scale ? 'yellow' : 'red';
    const full = Math.min(14, trunc((value * 14) / (100 * scale)));
    const rem = (value * 14) % (100 * scale);
    const idx = trunc((rem * 8) / (100 * scale));
    let head = BLOCK.repeat(full);
    if (full < 14) {
      head += PART[idx];
    }
    const lbl =
      fracp === '' || f * 2 < scale
        ? intp
        : f * 2 > scale
          ? intp + 1
          : intp + (intp % 2);
    const s = limit.resets - now;
    let dur: string;
    if (s >= 3600) {
      dur = `${trunc(s / 3600)}h${pad2(trunc((s % 3600) / 60))}m`;
    } else {
      const sec = ((s % 60) + 60) % 60;
      dur = `${trunc((s - sec) / 60)}m${pad2(sec)}s`;
    }
    if (at > 0) {
      segs.push(plain('  '), dim('│'), plain('  '));
    }
    segs.push(dim(limit.label), plain(' '), {
      carry: head.length < 14,
      ink,
      text: head,
    });
    for (let i = head.length; i < 14; i++) {
      segs.push({ carry: i < 13, ink: 'dim', text: TRACK });
    }
    segs.push(plain(' '), bold(`${lbl}%`), plain(' '), dim(`· resets ${dur}`));
  }
  return line(...segs);
}

function emptySegment(): Line {
  return line();
}

function barFlat6(input: SegmentInput): Line {
  return barFlatAt(input, 6);
}

function barFlat4(input: SegmentInput): Line {
  return barFlatAt(input, 4);
}

function barPercent({ row }: SegmentInput): Line {
  return line(plain(`${row.pct}%`));
}

export const SEGMENTS: Readonly<
  Partial<Record<string, Readonly<Record<string, SegmentRenderer>>>>
> = {
  ahead: { arrows: aheadArrows, none: emptySegment },
  bar: {
    flat4: barFlat4,
    flat6: barFlat6,
    flat: barFlat,
    gauge: barGauge,
    none: emptySegment,
    percent: barPercent,
  },
  branch: {
    full: branchFull,
    icon: branchIcon,
    initials: branchInitials,
    last: branchLast,
    none: emptySegment,
  },
  'cache-expiry': {
    coldin: cacheColdin,
    fuse: cacheFuse,
    none: emptySegment,
    until: cacheUntil,
  },
  'cache-hit': { none: emptySegment, plain: cacheHit },
  cost: { burn: costBurn, none: emptySegment, plain: costPlain },
  cwd: {
    base: cwdBase,
    full: cwdFull,
    icon: cwdIcon,
    init: cwdInit,
    tail: cwdTail,
  },
  duration: { clock: durationClock, hours: durationHours, none: emptySegment },
  effort: { dim: effortDim, hidden: emptySegment, plain: effortPlain },
  lines: { diffstat: linesDiffstat, none: emptySegment },
  model: {
    block: modelBlock,
    pill: modelPill,
    plain: modelPlain,
    zen: modelZen,
  },
  pr: { badge: prBadge, none: emptySegment },
  rate: { none: emptySegment, strip: rateStrip },
  state: { none: emptySegment, pills: statePills },
  status: { counts: statusCounts, icons: statusIcons, none: emptySegment },
  tokens: {
    compact: tokensCompact,
    full: tokensFull,
    free: tokensFree,
    none: emptySegment,
  },
};

export function renderSegment(
  item: string,
  alt: string,
  input: SegmentInput,
): Line {
  const segment = SEGMENTS[item]?.[alt];
  return segment === undefined ? line() : segment(input);
}

export interface Separators {
  readonly join: readonly Segment[];
  readonly sep: readonly Segment[];
}

export function styleSeparators(alt: string): Separators {
  switch (alt) {
    case 'bare':
      return { join: [plain('  ')], sep: [plain('   ')] };
    case 'dim':
      return { join: [plain(' ')], sep: [dim(' │ ')] };
    case 'dots':
      return { join: [plain(' · ')], sep: [plain(' · ')] };
    default:
      return { join: [plain(' ')], sep: [plain(' │ ')] };
  }
}
