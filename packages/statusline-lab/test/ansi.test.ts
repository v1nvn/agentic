import { describe, expect, it } from 'vitest';

import { render, toHtml } from '../src/ansi.js';

const E = '\x1b[';

describe('toHtml', () => {
  it('passes plain ASCII through untouched', () => {
    expect(toHtml('hello world 123')).toBe('hello world 123');
  });

  it('passes Nerd Font private-use glyphs through unescaped', () => {
    const line = 'normal \ue0b6\ue0b4 \uf410';
    expect(toHtml(line)).toBe(line);
  });

  it('wraps bold text in a font-weight span', () => {
    expect(toHtml(`${E}1mHi${E}0m`)).toBe(
      '<span style="font-weight:700">Hi</span>',
    );
  });

  it('leaves text after a reset outside the span', () => {
    expect(toHtml(`${E}1mHi${E}0m there`)).toBe(
      '<span style="font-weight:700">Hi</span> there',
    );
  });

  it('maps dim to opacity', () => {
    expect(toHtml(`${E}2mshade${E}0m`)).toBe(
      '<span style="opacity:.55">shade</span>',
    );
  });

  it('stacks bold and dim in one span, bold first', () => {
    expect(toHtml(`${E}1;2mx${E}0m`)).toBe(
      '<span style="font-weight:700;opacity:.55">x</span>',
    );
  });

  it('maps basic foreground colors through the BASIC table', () => {
    expect(toHtml(`${E}31mred${E}0m`)).toBe(
      '<span style="color:#e06c75">red</span>',
    );
    expect(toHtml(`${E}90mnote${E}0m`)).toBe(
      '<span style="color:#5c6370">note</span>',
    );
    expect(toHtml(`${E}37mw${E}0m`)).toBe(
      '<span style="color:#abb2bf">w</span>',
    );
  });

  it('expands 256-color foregrounds via the cube and grayscale ramps', () => {
    expect(toHtml(`${E}38;5;61mdeep${E}0m`)).toBe(
      '<span style="color:#5f5faf">deep</span>',
    );
    expect(toHtml(`${E}38;5;3mgold${E}0m`)).toBe(
      '<span style="color:#e5c07b">gold</span>',
    );
    expect(toHtml(`${E}38;5;240mgray${E}0m`)).toBe(
      '<span style="color:#585858">gray</span>',
    );
  });

  it('formats truecolor foregrounds as hex', () => {
    expect(toHtml(`${E}38;2;218;112;214morchid${E}0m`)).toBe(
      '<span style="color:#da70d6">orchid</span>',
    );
  });

  it('defaults empty extended-color params to index 0, never NaN', () => {
    expect(toHtml(`${E}38;5;mX${E}0m`)).toBe(
      '<span style="color:#4b5263">X</span>',
    );
    expect(toHtml(`${E}38;2;;10;20mY${E}0m`)).toBe(
      '<span style="color:#000a14">Y</span>',
    );
  });

  it('stacks color and weight from one combined sequence', () => {
    expect(toHtml(`${E}1;38;5;61mA${E}0m`)).toBe(
      '<span style="color:#5f5faf;font-weight:700">A</span>',
    );
  });

  it('keeps unstyled text around a mid-line color run', () => {
    expect(toHtml(`a${E}31mred${E}0mplain`)).toBe(
      'a<span style="color:#e06c75">red</span>plain',
    );
  });

  it('closes and reopens on adjacent SGR runs, emitting the empty span', () => {
    expect(toHtml(`${E}31m${E}1mX${E}0m`)).toBe(
      '<span style="color:#e06c75"></span>' +
        '<span style="color:#e06c75;font-weight:700">X</span>',
    );
  });

  it('renders the model=block background-then-foreground shape', () => {
    expect(toHtml(`${E}48;5;61m${E}38;5;231m Opus ${E}0m`)).toBe(
      '<span style="background:#5f5faf"></span>' +
        '<span style="background:#5f5faf;color:#ffffff"> Opus </span>',
    );
  });

  it('treats empty SGR params as a reset', () => {
    expect(toHtml(`${E}31mred${E}mplain`)).toBe(
      '<span style="color:#e06c75">red</span>plain',
    );
  });

  it('drops the span when the attribute is switched back off', () => {
    expect(toHtml(`${E}31m${E}39mX`)).toBe(
      '<span style="color:#e06c75"></span>X',
    );
    expect(toHtml(`${E}1m${E}22mX`)).toBe(
      '<span style="font-weight:700"></span>X',
    );
  });

  it('closes a span left open at end of text', () => {
    expect(toHtml(`${E}32mgreen`)).toBe(
      '<span style="color:#98c379">green</span>',
    );
  });

  it('ignores basic background codes the source never handled', () => {
    expect(toHtml(`${E}41mX${E}0m`)).toBe('X');
  });

  it('escapes HTML metacharacters the way html.escape does', () => {
    expect(toHtml(`a&b<c>d"e'f>`)).toBe('a&amp;b&lt;c&gt;d&quot;e&#x27;f&gt;');
  });

  it('leaves non-SGR CSI sequences as literal text', () => {
    expect(toHtml(`keep${E}2Kdrop`)).toBe(`keep${E}2Kdrop`);
  });
});

describe('render', () => {
  it('wraps each line, keeping blank lines as nbsp', () => {
    expect(render('a\n\nb\n')).toBe(
      '<div class="line">a</div>\n' +
        '<div class="line">&nbsp;</div>\n' +
        '<div class="line">b</div>',
    );
  });

  it('converts ANSI inside each line', () => {
    expect(render(`${E}31mred${E}0m\nplain`)).toBe(
      '<div class="line"><span style="color:#e06c75">red</span></div>\n' +
        '<div class="line">plain</div>',
    );
  });

  it('renders empty input as one blank line', () => {
    expect(render('')).toBe('<div class="line">&nbsp;</div>');
  });
});
