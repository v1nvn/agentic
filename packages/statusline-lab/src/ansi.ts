// Byte-faithful port of the loose lab's ansi2html.py; the quirks the tests
// pin (adjacent-SGR empty span, ignored basic backgrounds) are contract.
const ESC = '\x1b';
const TOKEN = new RegExp(`${ESC}\\[([0-9;]*)m`, 'g');

const X256_BASE: readonly string[] = [
  '#4b5263',
  '#e06c75',
  '#98c379',
  '#e5c07b',
  '#61afef',
  '#c678dd',
  '#56b6c2',
  '#abb2bf',
  '#5c6370',
  '#e06c75',
  '#98c379',
  '#e5c07b',
  '#61afef',
  '#c678dd',
  '#56b6c2',
  '#dcdfe4',
];

const BASIC: Readonly<Record<number, string>> = {
  30: '#4b5263',
  31: '#e06c75',
  32: '#98c379',
  33: '#e5c07b',
  34: '#61afef',
  35: '#c678dd',
  36: '#56b6c2',
  37: '#abb2bf',
  90: '#5c6370',
  91: '#e06c75',
  92: '#98c379',
  93: '#e5c07b',
  94: '#61afef',
  95: '#c678dd',
  96: '#56b6c2',
  97: '#dcdfe4',
};

function hex2(n: number): string {
  return n.toString(16).padStart(2, '0');
}

function cube(c: number): number {
  return c === 0 ? 0 : 55 + c * 40;
}

function x256(n: number): string {
  if (n < 16) {
    return X256_BASE[n] ?? '#000000';
  }
  if (n < 232) {
    const m = n - 16;
    return `#${hex2(cube(Math.floor(m / 36)))}${hex2(cube(Math.floor(m / 6) % 6))}${hex2(cube(m % 6))}`;
  }
  const c = hex2(8 + (n - 232) * 10);
  return `#${c}${c}${c}`;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#x27;');
}

export function toHtml(text: string): string {
  let fg: null | string = null;
  let bg: null | string = null;
  let bold = false;
  let dim = false;
  let openSpan = false;
  let pos = 0;
  const out: string[] = [];
  function style(): readonly string[] {
    const s: string[] = [];
    if (bg !== null) {
      s.push(`background:${bg}`);
    }
    if (fg !== null) {
      s.push(`color:${fg}`);
    }
    if (bold) {
      s.push('font-weight:700');
    }
    if (dim) {
      s.push('opacity:.55');
    }
    return s;
  }
  function flush(): void {
    if (openSpan) {
      out.push('</span>');
      openSpan = false;
    }
  }
  for (const m of text.matchAll(TOKEN)) {
    out.push(escapeHtml(text.slice(pos, m.index)));
    pos = m.index + m[0].length;
    const params = m[1].split(';');
    let i = 0;
    while (i < params.length) {
      const raw = params[i] === '' ? '0' : params[i];
      const n = parseInt(raw, 10);
      if (n === 0) {
        fg = null;
        bg = null;
        bold = false;
        dim = false;
      } else if (n === 1) {
        bold = true;
      } else if (n === 2) {
        dim = true;
      } else if (n === 22) {
        bold = false;
        dim = false;
      } else if (n === 39) {
        fg = null;
      } else if (n === 49) {
        bg = null;
      } else if (Object.hasOwn(BASIC, n)) {
        fg = BASIC[n] ?? null;
      } else if ((n >= 30 && n <= 37) || (n >= 90 && n <= 97)) {
        fg = BASIC[n] ?? null;
      } else if (n === 38 || n === 48) {
        if (i + 1 < params.length) {
          const mode = params[i + 1];
          let col: null | string;
          if (mode === '5' && i + 2 < params.length) {
            col = x256(parseInt(params[i + 2] ?? '0', 10));
            i += 2;
          } else if (mode === '2' && i + 4 < params.length) {
            col = `#${hex2(parseInt(params[i + 2] ?? '0', 10))}${hex2(parseInt(params[i + 3] ?? '0', 10))}${hex2(parseInt(params[i + 4] ?? '0', 10))}`;
            i += 4;
          } else {
            col = null;
            i = params.length;
          }
          if (n === 38) {
            fg = col;
          } else {
            bg = col;
          }
        }
      }
      i += 1;
    }
    flush();
    const s = style();
    if (s.length > 0) {
      out.push(`<span style="${s.join(';')}">`);
      openSpan = true;
    }
  }
  out.push(escapeHtml(text.slice(pos)));
  flush();
  return out.join('');
}

export function render(text: string): string {
  const lines = text.replace(/\n+$/, '').split('\n');
  return lines
    .map(
      line =>
        `<div class="line">${line === '' ? '&nbsp;' : toHtml(line)}</div>`,
    )
    .join('\n');
}
