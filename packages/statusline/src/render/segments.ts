import type { GitFacts } from './git.js';
import type { Row } from './payload.js';

import { fmtDuration, fmtFixed, fmtK, fmtM, pad2 } from './awk.js';

export interface SegmentInput {
  readonly git: GitFacts;
  readonly home: string;
  readonly model: string;
  readonly now: number;
  readonly row: Row;
}

type Segment = (input: SegmentInput) => string;

const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const PURPLE = '\x1b[35m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';
const YELLOW = '\x1b[33m';
const BOLD = '\x1b[1m';
const GRAY = '\x1b[38;2;68;71;90m';
const MARK = '\x1b[1;97m';

const SHORT_AT = 15;
const PART = ['▏', '▎', '▍', '▌', '▋', '▊', '▉', '█'];
const HEAT = [
  '\x1b[38;2;48;242;36m',
  '\x1b[38;2;63;242;36m',
  '\x1b[38;2;79;242;36m',
  '\x1b[38;2;95;242;36m',
  '\x1b[38;2;111;242;36m',
  '\x1b[38;2;126;242;36m',
  '\x1b[38;2;142;242;36m',
  '\x1b[38;2;158;242;36m',
  '\x1b[38;2;173;242;36m',
  '\x1b[38;2;189;242;36m',
  '\x1b[38;2;205;242;36m',
  '\x1b[38;2;220;242;36m',
  '\x1b[38;2;236;242;36m',
  '\x1b[38;2;242;232;36m',
  '\x1b[38;2;242;216;36m',
  '\x1b[38;2;242;200;36m',
  '\x1b[38;2;242;185;36m',
  '\x1b[38;2;242;169;36m',
  '\x1b[38;2;242;153;36m',
  '\x1b[38;2;242;138;36m',
  '\x1b[38;2;242;122;36m',
  '\x1b[38;2;242;106;36m',
  '\x1b[38;2;242;91;36m',
  '\x1b[38;2;242;75;36m',
  '\x1b[38;2;242;59;36m',
  '\x1b[38;2;242;44;36m',
];

function trunc(n: number): number {
  return Math.trunc(n);
}

function modelPlain({ model }: SegmentInput): string {
  return model === '' ? '' : `${CYAN}${model}${RESET}`;
}

function modelBlock({ model }: SegmentInput): string {
  return model === '' ? '' : `\x1b[48;5;61m\x1b[38;5;231m ${model} \x1b[0m`;
}

function modelPill({ model }: SegmentInput): string {
  return model === ''
    ? ''
    : `\x1b[48;5;61m\x1b[38;5;231m\u{e0b6} ${model} \u{e0b4}\x1b[0m`;
}

function modelZen({ model }: SegmentInput): string {
  return model === ''
    ? ''
    : `${DIM}${model.replace(/[A-Z]/g, c => c.toLowerCase())}${RESET}`;
}

function effortPlain({ row }: SegmentInput): string {
  return row.effort === '' ? '' : `${CYAN}${row.effort}${RESET}`;
}

function effortDim({ row }: SegmentInput): string {
  return row.effort === '' ? '' : `${DIM}${row.effort}${RESET}`;
}

function statePill(label: string, bg: number, fg: number): string {
  return `\x1b[48;5;${bg}m\x1b[38;5;${fg}m\u{e0b6} ${label} \u{e0b4}\x1b[0m`;
}

function statePills({ row }: SegmentInput): string {
  let out = '';
  if (row.vim !== '') {
    out =
      row.vim === 'INSERT'
        ? statePill(row.vim, 97, 16)
        : statePill(row.vim, 240, 231);
  }
  if (row.think) {
    out += ` ${statePill('THINK', 66, 16)}`;
  }
  if (row.agent !== '') {
    out += ` ${statePill(row.agent, 60, 231)}`;
  }
  if (row.wt !== '') {
    out += ` ${statePill(`wt:${row.wt}`, 131, 231)}`;
  }
  if (row.styleName !== '' && row.styleName !== 'default') {
    out += ` ${statePill(row.styleName, 95, 16)}`;
  }
  return out;
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

function cwdInit({ home, row }: SegmentInput): string {
  const { text } = splitPath(row.dir, home);
  return Buffer.byteLength(text, 'utf8') > SHORT_AT
    ? pathInit(row.dir, home)
    : text;
}

function cwdFull({ home, row }: SegmentInput): string {
  return splitPath(row.dir, home).text;
}

function cwdTail({ home, row }: SegmentInput): string {
  return pathTail(row.dir, home, 1);
}

function baseName(dir: string): string {
  return dir.slice(dir.lastIndexOf('/') + 1);
}

function cwdBase({ row }: SegmentInput): string {
  return baseName(row.dir);
}

function cwdIcon({ row }: SegmentInput): string {
  return `\u{f07b} ${baseName(row.dir)}`;
}

function branchInitials({ git }: SegmentInput): string {
  const branch = git.branch;
  if (branch === '') {
    return '';
  }
  if (Buffer.byteLength(branch, 'utf8') <= SHORT_AT) {
    return branch;
  }
  const parts = branch.split('/').filter(part => part !== '');
  if (parts.length <= 1) {
    return branch;
  }
  let out = '';
  for (let i = 0; i < parts.length - 1; i++) {
    out += `${parts[i].slice(0, 1)}/`;
  }
  return `${out}${parts[parts.length - 1]}`;
}

function branchFull({ git }: SegmentInput): string {
  return git.branch;
}

function branchLast({ git }: SegmentInput): string {
  return git.branch.slice(git.branch.lastIndexOf('/') + 1);
}

function branchIcon({ git }: SegmentInput): string {
  return git.branch === '' ? '' : `\u{e0a0} ${git.branch}`;
}

function statusCounts({ git }: SegmentInput): string {
  if (git.branch === '') {
    return '';
  }
  let c = '';
  if (git.staged > 0) {
    c = `${GREEN}+${git.staged}${RESET}`;
  }
  if (git.modified > 0) {
    c = `${c} ${YELLOW}~${git.modified}${RESET}`;
  }
  return c;
}

function statusIcons({ git }: SegmentInput): string {
  if (git.branch === '') {
    return '';
  }
  let out = '';
  let sep = '';
  if (git.staged > 0) {
    out += `${GREEN}●${git.staged}${RESET}`;
    sep = ' ';
  }
  if (git.modified > 0) {
    out += `${sep}${YELLOW}✎${git.modified}${RESET}`;
    sep = ' ';
  }
  if (git.untracked > 0) {
    out += `${sep}${CYAN}+${git.untracked}${RESET}`;
    sep = ' ';
  }
  if (git.stashes > 0) {
    out += `${sep}${PURPLE}⚑${git.stashes}${RESET}`;
  }
  return out;
}

function aheadArrows({ git }: SegmentInput): string {
  let out = '';
  if (git.ahead > 0) {
    out = `${GREEN}↑${git.ahead}${RESET}`;
  }
  if (git.behind > 0) {
    out += ` ${RED}↓${git.behind}${RESET}`;
  }
  return out;
}

function prBadge({ row }: SegmentInput): string {
  if (row.prn === '') {
    return '';
  }
  let col: string;
  let mark: string;
  switch (row.prs) {
    case 'approved':
      col = GREEN;
      mark = '✓';
      break;
    case 'changes_requested':
      col = RED;
      mark = '✗';
      break;
    case 'pending':
      col = YELLOW;
      mark = '⏳';
      break;
    default:
      col = '\x1b[90m';
      mark = '◌';
  }
  return `${BLUE}#${row.prn}${RESET} ${col}${mark} ${row.prs}${RESET}`;
}

function barFlatAt(input: SegmentInput, w: number): string {
  const pct = input.row.pct;
  let f = trunc((pct * w) / 100);
  if (f > w) {
    f = w;
  }
  if (pct > 0 && f === 0) {
    f = 1;
  }
  const col = pct >= 90 ? RED : pct >= 70 ? YELLOW : GREEN;
  return `${col}${'█'.repeat(f)}${'░'.repeat(w - f)}${RESET}`;
}

function barFlat(input: SegmentInput): string {
  return barFlatAt(input, 10);
}

function barGauge({ row }: SegmentInput): string {
  const pct = row.pct;
  const p = Math.max(0, Math.min(100, pct));
  const full = trunc((p * 26) / 100);
  const idx = trunc((((p * 26) % 100) * 8) / 100);
  const lead =
    p >= 50
      ? `\x1b[38;2;242;${trunc((4845 * (15000 + 1683 * (100 - p))) / 2000000)};36m`
      : `\x1b[38;2;${trunc((4845 * (185000 - 1683 * (100 - p))) / 2000000)};242;36m`;
  const moon = ['○', '◔', '◑', '◕', '●'][Math.min(trunc(p / 20), 4)];
  let bar = '';
  for (let i = 0; i < 26; i++) {
    let col: string;
    let cell: string;
    if (i === 20) {
      col = MARK;
      cell = i <= full ? '┃' : '│';
    } else if (i <= full) {
      col = HEAT[i];
      cell = i === full ? PART[idx] : '█';
    } else {
      col = GRAY;
      cell = '░';
    }
    bar += `${col}${cell}`;
  }
  return `${moon} ${lead}${bar}${RESET} ${MARK}${pct}%${RESET}`;
}

function tokensFull({ row }: SegmentInput): string {
  const t = row.tokens >= 1000 ? fmtK(row.tokens, 1) : String(row.tokens);
  let c = String(row.ctxSize);
  if (row.ctxSize >= 1000000) {
    c = fmtM(row.ctxSize);
  } else if (row.ctxSize >= 1000) {
    c = fmtK(row.ctxSize, 0);
  }
  return `${t}/${c}`;
}

function tokensCompact({ row }: SegmentInput): string {
  return row.tokens >= 1000 ? fmtK(row.tokens, 0) : String(row.tokens);
}

function tokensFree({ row }: SegmentInput): string {
  const free = row.ctxSize - row.tokens;
  return `${DIM}${free >= 1000 ? fmtK(free, 0) : String(free)} free${RESET}`;
}

function cacheHitPct(row: Row): null | number {
  return row.hit === null ? null : trunc(row.hit * 100);
}

function cacheHCol(hp: number): string {
  return hp >= 90 ? GREEN : hp >= 50 ? YELLOW : RED;
}

function cacheHit({ row }: SegmentInput): string {
  const hp = cacheHitPct(row);
  return hp === null ? '' : `${cacheHCol(hp)}⚡${hp}%${RESET}`;
}

function cacheColdin({ now, row }: SegmentInput): string {
  if (row.ttl === '' || row.expires === 0) {
    return '';
  }
  if (row.warm && row.expires > now) {
    return `${DIM}cold in ${trunc((row.expires - now) / 60)}m${RESET}`;
  }
  return `${DIM}❄ cold${RESET}`;
}

function cacheUntil({ row }: SegmentInput): string {
  if (row.ttl === '' || row.expires === 0) {
    return '';
  }
  const at = new Date(row.expires * 1000);
  return `${DIM}${pad2(at.getHours())}:${pad2(at.getMinutes())}${RESET}`;
}

function cacheFuse({ now, row }: SegmentInput): string {
  if (row.ttl === '' || row.expires === 0) {
    return '';
  }
  const span = row.ttl === '1h' ? 3600 : 300;
  let left = row.expires - now;
  if (left < 0) {
    left = 0;
  }
  if (left <= 0) {
    return `${RED}❄ cold${RESET}`;
  }
  const full = trunc((left * 10) / span);
  const rem = (left * 10) % span;
  const col = left * 4 > span ? GREEN : left * 25 > span * 2 ? YELLOW : RED;
  let bar = col;
  for (let i = 0; i < 10; i++) {
    if (i < full) {
      bar += '▰';
    } else if (i === full && rem * 20 > span) {
      bar += PART[trunc((rem * 8) / span)];
    } else {
      bar += `${DIM}▱`;
    }
  }
  return `${bar}${RESET} ${DIM}${pad2(trunc(left / 60))}:${pad2(left % 60)}${RESET}`;
}

function costPlain({ row }: SegmentInput): string {
  return row.cost >= 0.005 ? `${YELLOW}$${fmtFixed(row.cost, 2)}${RESET}` : '';
}

function costBurn(input: SegmentInput): string {
  const hr = input.row.durationMs / 3600000;
  // awk's else branch prints "0", never "0.00", so a sub-threshold burn rate
  // still appends "$0/hr" — ported as-is.
  const burn = hr > 0.02 ? fmtFixed(input.row.cost / hr, 2) : '0';
  let out = costPlain(input);
  if (burn !== '0.00') {
    out += ` ${DIM}· $${burn}/hr${RESET}`;
  }
  return out;
}

function durationClock({ row }: SegmentInput): string {
  return fmtDuration(trunc(row.durationMs / 60000));
}

function durationHours({ row }: SegmentInput): string {
  const m = trunc(row.durationMs / 60000);
  if (m < 1440) {
    return `${trunc(m / 60)}h${pad2(m % 60)}m`;
  }
  return `${trunc(m / 1440)}d${pad2(trunc(m / 60) % 24)}h${pad2(m % 60)}m`;
}

function linesDiffstat({ row }: SegmentInput): string {
  if (row.la <= 0 && row.lr <= 0) {
    return '';
  }
  return `${GREEN}+${row.la}${RESET}${DIM}/${RESET}${RED}−${row.lr}${RESET}`;
}

function rateStrip({ now, row }: SegmentInput): string {
  const segs: string[] = [];
  for (const limit of row.rateRows) {
    const [intpText, fracp = ''] = limit.pctText.split('.');
    let f = 0;
    let scale = 1;
    for (const digit of fracp) {
      f = f * 10 + Number(digit);
      scale *= 10;
    }
    const intp = Number(intpText);
    const value = intp * scale + f;
    const col = value < 70 * scale ? GREEN : value < 90 * scale ? YELLOW : RED;
    const full = trunc((value * 14) / (100 * scale));
    const rem = (value * 14) % (100 * scale);
    const idx = trunc((rem * 8) / (100 * scale));
    let bar = col;
    for (let i = 0; i < 14; i++) {
      if (i < full) {
        bar += '█';
      } else if (i === full) {
        bar += PART[idx];
      } else {
        bar += `${DIM}░`;
      }
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
    segs.push(
      `${DIM}${limit.label}${RESET} ${bar}${RESET} ${BOLD}${lbl}%${RESET} ${DIM}· resets ${dur}${RESET}`,
    );
  }
  return segs.join(`  ${DIM}│${RESET}  `);
}

function emptySegment(): string {
  return '';
}

function barFlat6(input: SegmentInput): string {
  return barFlatAt(input, 6);
}

function barFlat4(input: SegmentInput): string {
  return barFlatAt(input, 4);
}

function barPercent({ row }: SegmentInput): string {
  return `${row.pct}%`;
}

export const SEGMENTS: Readonly<
  Partial<Record<string, Readonly<Record<string, Segment>>>>
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
): string {
  const segment = SEGMENTS[item]?.[alt];
  return segment === undefined ? '' : segment(input);
}

export interface Separators {
  readonly join: string;
  readonly sep: string;
}

export function styleSeparators(alt: string): Separators {
  switch (alt) {
    case 'bare':
      return { join: '  ', sep: '   ' };
    case 'dim':
      return { join: ' ', sep: `${DIM} │ ${RESET}` };
    case 'dots':
      return { join: ' · ', sep: ' · ' };
    default:
      return { join: ' ', sep: ' │ ' };
  }
}
