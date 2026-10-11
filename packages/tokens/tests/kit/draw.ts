/**
 * The drawing kit — the one home of the repo's terminal drawing model: ink
 * kinds are a closed union, color values are data, surfaces render
 * documents, and `toSgr` is the one skin, resetting each inked segment
 * unless it carries its ink into the next; stamped into each mod home.
 */

export type InkKind =
  | 'blue'
  | 'bold'
  | 'brightBlack'
  | 'cyan'
  | 'dim'
  | 'green'
  | 'magenta'
  | 'mark'
  | 'plain'
  | 'red'
  | 'white'
  | 'yellow';

export type Ink =
  | InkKind
  | { readonly bg: Ink }
  | { readonly indexed: number }
  | { readonly rgb: readonly [number, number, number] };

export function rgb(r: number, g: number, b: number): Ink {
  return { rgb: [r, g, b] };
}

export function indexed(n: number): Ink {
  return { indexed: n };
}

export function bg(ink: Ink): Ink {
  return { bg: ink };
}

export interface Segment {
  readonly carry?: boolean;
  readonly ink?: Ink;
  readonly text: string;
}

declare const lineBrand: unique symbol;
declare const docBrand: unique symbol;

export type Line = readonly Segment[] & { readonly [lineBrand]: true };
export type Doc = readonly Line[] & { readonly [docBrand]: true };

export function line(...segments: Segment[]): Line {
  return segments as unknown as Line;
}

export function doc(...rows: Line[]): Doc {
  return rows as unknown as Doc;
}

export function plain(text: string): Segment {
  return { text };
}

export function dim(text: string): Segment {
  return { text, ink: 'dim' };
}

export function bold(text: string): Segment {
  return { text, ink: 'bold' };
}

export function green(text: string): Segment {
  return { text, ink: 'green' };
}

export function magenta(text: string): Segment {
  return { text, ink: 'magenta' };
}

export function red(text: string): Segment {
  return { text, ink: 'red' };
}

export function yellow(text: string): Segment {
  return { text, ink: 'yellow' };
}

function assertNever(kind: never): never {
  throw new Error(`unhandled Ink kind: ${String(kind)}`);
}

function paramsOf(ink: Ink): string {
  if (typeof ink !== 'string') {
    if ('bg' in ink) {
      return paramsOf(ink.bg).replace(/^3/, '4');
    }
    return 'indexed' in ink
      ? `38;5;${ink.indexed}`
      : `38;2;${ink.rgb[0]};${ink.rgb[1]};${ink.rgb[2]}`;
  }
  switch (ink) {
    case 'blue':
      return '34';
    case 'bold':
      return '1';
    case 'brightBlack':
      return '90';
    case 'cyan':
      return '36';
    case 'dim':
      return '2';
    case 'green':
      return '32';
    case 'magenta':
      return '35';
    case 'mark':
      return '1;97';
    case 'plain':
      return '39';
    case 'red':
      return '31';
    case 'white':
      return '37';
    case 'yellow':
      return '33';
    default:
      return assertNever(ink);
  }
}

function rowsOf(rows: Doc | Line): readonly (readonly Segment[])[] {
  return (rows as readonly unknown[]).every(r => Array.isArray(r))
    ? (rows as Doc)
    : [rows as Line];
}

export function toSgr(rows: Doc | Line): string {
  return rowsOf(rows)
    .map(row => {
      let out = '';
      let inkOpen = false;
      for (const seg of row) {
        if (seg.ink === undefined) {
          out += (inkOpen ? '\x1b[0m' : '') + seg.text;
          inkOpen = false;
          continue;
        }
        out += `\x1b[${paramsOf(seg.ink)}m${seg.text}`;
        if (seg.carry === true) {
          inkOpen = true;
        } else {
          out += '\x1b[0m';
          inkOpen = false;
        }
      }
      return inkOpen ? `${out}\x1b[0m` : out;
    })
    .join('\n');
}

export function stripSgr(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

export function textOf(rows: Doc | Line): string {
  return rowsOf(rows)
    .map(row => row.map(seg => seg.text).join(''))
    .join('\n');
}

export interface ToolLineSource {
  readonly deny?: string;
  readonly isError?: boolean;
  readonly result?: unknown;
  readonly text?: string;
}

interface Stdio {
  readonly stderr?: unknown;
  readonly stdout?: unknown;
}

function stdioOf(result: unknown): Stdio {
  return typeof result === 'object' && result !== null ? result : {};
}

export function stdoutOf(result: unknown): string {
  const { stdout } = stdioOf(result);
  return typeof stdout === 'string' ? stdout : '';
}

/** The one line an exec shows: the refusal's reason, stdout, else stderr or `fallback`. */
export function lineOf(call: ToolLineSource, fallback: string): string {
  if (call.deny !== undefined) {
    return call.deny;
  }
  if (call.isError === true) {
    return call.text ?? fallback;
  }
  const out = stdoutOf(call.result).trim();
  if (out !== '') {
    return out;
  }
  const { stderr } = stdioOf(call.result);
  const err = typeof stderr === 'string' ? stderr.trim() : '';
  return err !== '' ? err : fallback;
}

export const RULE_WIDTH = 68;
export const LABEL_GUTTER = 9;

export const BLOCK = '█';
export const TRACK = '·';
export const EIGHTHS: readonly (string | undefined)[] = [
  '',
  '▏',
  '▎',
  '▍',
  '▌',
  '▋',
  '▊',
  '▉',
];
export const SPARK_LEVELS: readonly (string | undefined)[] = [
  '▁',
  '▂',
  '▃',
  '▄',
  '▅',
  '▆',
  '▇',
  '█',
];

export function rule(width: number = RULE_WIDTH): string {
  return '─'.repeat(Math.max(0, width));
}

export function pad(
  text: string,
  width: number,
  side: 'left' | 'right',
): string {
  if (text.length >= width) {
    return text;
  }
  const gap = ' '.repeat(width - text.length);
  return side === 'left' ? gap + text : text + gap;
}

export function meter(
  pct: null | number | undefined,
  width: number,
  filled: Ink = 'green',
): Line {
  const safePct = typeof pct === 'number' && Number.isFinite(pct) ? pct : 0;
  const n = Math.max(0, Math.min(width, Math.round((safePct / 100) * width)));
  return line(
    { text: BLOCK.repeat(n), ink: filled },
    { text: TRACK.repeat(width - n), ink: 'dim' },
  );
}

/** Fixed-width bar field: full blocks, an eighth-fraction edge, spaces to width. */
export function bar(value: number, max: number, width: number): string {
  if (!(value > 0) || !(max > 0)) {
    return ' '.repeat(width);
  }
  const scaled = (value / max) * width;
  let full = Math.floor(scaled);
  let fi = Math.round((scaled - full) * 8);
  if (fi === 8) {
    full += 1;
    fi = 0;
  }
  if (full === 0 && fi === 0) {
    fi = 1;
  }
  let out = BLOCK.repeat(Math.min(full, width));
  if (full < width && fi > 0) {
    out += EIGHTHS[fi] ?? '';
  }
  return pad(out, width, 'right');
}

export function spark(values: readonly number[], width: number): string {
  const vs = values.slice(-width);
  const max = Math.max(1, ...vs);
  const cells = vs.map(
    v => SPARK_LEVELS[Math.min(7, Math.round((v / max) * 7))] ?? ' ',
  );
  return pad(cells.join(''), width, 'right');
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export type Clock = 'minute' | 'none' | 'second';

/** Local date-time stamp: `YYYY-MM-DD`, plus `HH:mm` and optionally seconds. */
export function localStamp(now: Date, clock: Clock): string {
  const day = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
  if (clock === 'none') {
    return day;
  }
  const hhmm = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
  return clock === 'second'
    ? `${day} ${hhmm}:${pad2(now.getSeconds())}`
    : `${day} ${hhmm}`;
}
