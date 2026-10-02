import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  extractTablesFromHtml,
  extractTablesHandler,
} from '../../src/tools/extract_tables.js';
import { extractTablesOutput } from '../../src/tools/output-schema.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(here, '../fixtures/tables/saved.html');
const ORIGIN = 'https://docs.example.com/guides/tables';

// Colspan=2 lifts "Person" over two sub-columns; rowspan=2 lifts "Notes" over
// the second header row. The body carries a comma cell and a quote cell so CSV
// quoting is exercised alongside the span resolution.
const SPAN_HTML =
  '<table><thead>' +
  '<tr><th colspan="2">Person</th><th rowspan="2">Notes</th></tr>' +
  '<tr><th>Name</th><th>Age</th></tr>' +
  '</thead><tbody>' +
  '<tr><td>Alice</td><td>30</td><td>hello, world</td></tr>' +
  '<tr><td>Bob</td><td>25</td><td>"quoted"</td></tr>' +
  '</tbody></table>';

// A page mirroring ticker.finology.in's three cell-text defect classes:
// whitespace/newline-padded numbers, tooltip-only labels (whose sole text lives
// inside the stripped wrapper), and icon-only link cells (URL in href, svg has
// no text). Built N times so the batch walk spans many tables — the regression
// oracle is that the per-table cell-text pipeline applies uniformly regardless
// of table count or document size (no count/size early-out).
function finologyTable(id: number): string {
  const months = ['Jun 2025', 'Sep 2025', 'Dec 2025'];
  const paddedNumber = (v: string) => `<td>\n  ${v}\n&nbsp;\n\n</td>`;
  const tooltipLabel = (label: string) =>
    '<td><span data-toggle="tooltip" data-original-title="' +
    `${label}"><span>${label}</span></span></td>`;
  const iconLink = (href: string) =>
    '<td><a target="_blank" href="' +
    `${href}"><span data-toggle="tooltip" data-original-title="View">` +
    '<svg aria-hidden="true"><path/></svg></span></a></td>';
  const head =
    '<thead><tr><th>PARTICULARS</th>' +
    months.map(m => `<th>${m}</th>`).join('') +
    '</tr></thead>';
  const dataRow = (label: string, vals: readonly string[]) =>
    `<tr>${tooltipLabel(label)}${vals.map(paddedNumber).join('')}</tr>`;
  const linkRow =
    `<tr>${tooltipLabel('Annual Report')}` +
    months.map((_, k) => iconLink(`https://example.com/r${id}-${k}.pdf`)).join('') +
    '</tr>';
  return (
    `<table id="t${id}">${head}<tbody>` +
    dataRow('Net Sales', ['430.82', '453.17', '511.76']) +
    dataRow('Net Profit', ['194.24', '137.39', '153.42']) +
    `${linkRow}</tbody></table>`
  );
}

function finologyBatch(tableCount: number): string {
  return (
    '<!doctype html><html><body>' +
    Array.from({ length: tableCount }, (_, i) => finologyTable(i)).join('\n') +
    '</body></html>'
  );
}

describe('extract_tables tool', () => {
  it('renders the rowspan/colspan matrix as GFM with a delimiter row', () => {
    const result = extractTablesFromHtml({ html: SPAN_HTML, baseUrl: ORIGIN });
    expect(result.isError).toBeFalsy();
    const parsed = extractTablesOutput.parse(result.structuredContent);
    expect(parsed.tables).toHaveLength(1);
    const table = parsed.tables[0]!;
    expect(table.rows).toBe(4);
    expect(table.cols).toBe(3);
    // Span origins carry the text; spanned cells render as empty reserved cells.
    const lines = table.markdown.split('\n');
    expect(lines[0]).toBe('| Person |  | Notes |');
    expect(lines[1]).toBe('| --- | --- | --- |');
    expect(lines[2]).toBe('| Name | Age |  |');
    expect(lines[3]).toBe('| Alice | 30 | hello, world |');
    expect(lines[4]).toBe('| Bob | 25 | "quoted" |');
    expect(parsed.metadata.tableCount).toBe(1);
    expect(parsed.metadata.format).toBe('gfm');
    expect(parsed.metadata.baseUrl).toBe(ORIGIN);
  });

  it('quotes CSV fields containing commas and doubles embedded quotes', () => {
    const result = extractTablesFromHtml({ html: SPAN_HTML, format: 'csv' });
    const parsed = extractTablesOutput.parse(result.structuredContent);
    const csv = parsed.tables[0]!.markdown;
    // Comma in "hello, world" forces quoting; embedded quote in "quoted" doubles.
    expect(csv).toContain('Person,,Notes');
    expect(csv).toContain('Name,Age,');
    expect(csv).toContain('"hello, world"');
    expect(csv).toContain('"""quoted"""');
  });

  it('emits JSON rows keyed by the header row', () => {
    const result = extractTablesFromHtml({ html: SPAN_HTML, format: 'json' });
    const parsed = extractTablesOutput.parse(result.structuredContent);
    const records = JSON.parse(parsed.tables[0]!.markdown) as Record<
      string,
      string
    >[];
    // Row 0 is the JSON header; rows 1-3 are data (including the second HTML
    // header row, which the row-0-keyed IR cannot distinguish from data). The
    // colspan parent "Person" is paired with the sub-header (Name/Age), so the
    // headerless column under it resolves to person_age rather than column_1.
    expect(records).toHaveLength(3);
    expect(records[1]).toMatchObject({
      person_name: 'Alice',
      person_age: '30',
      Notes: 'hello, world',
    });
    expect(records[2]).toMatchObject({
      person_name: 'Bob',
      Notes: '"quoted"',
    });
  });

  it('round-trips the saved.html fixture (two tables, all three formats)', () => {
    const html = readFileSync(fixturePath, 'utf8');
    const gfm = extractTablesFromHtml({ html, baseUrl: ORIGIN, format: 'gfm' });
    const parsed = extractTablesOutput.parse(gfm.structuredContent);
    // The fixture has two <table> elements (headered + headerless), both inside
    // <article>. Both are emitted in document order.
    expect(parsed.tables.map(t => t.index)).toEqual([0, 1]);
    expect(parsed.metadata.tableCount).toBe(2);
    // Span origins and CSV-quotable cells from the first table survive.
    expect(parsed.tables[0]!.markdown).toContain('Person');
    expect(parsed.tables[0]!.markdown).toContain('Notes');
    expect(parsed.tables[1]!.markdown).toContain('Apple');

    const csv = extractTablesFromHtml({ html, format: 'csv' });
    const csvParsed = extractTablesOutput.parse(csv.structuredContent);
    expect(csvParsed.tables[0]!.markdown).toContain('"hello, world"');
    expect(csvParsed.tables[0]!.markdown).toContain('"""quoted"""');

    const json = extractTablesFromHtml({ html, format: 'json' });
    const jsonParsed = extractTablesOutput.parse(json.structuredContent);
    expect(
      JSON.parse(jsonParsed.tables[0]!.markdown) as Record<string, string>[],
    ).toHaveLength(3);
  });

  it('captures tables outside the article body (nav, aside, footer)', () => {
    // extract's `tables` option would only see the one inside <article>; this
    // tool ignores the article boundary entirely.
    const html =
      '<body>' +
      '<nav><table><tr><th>Nav</th></tr><tr><td>nav-cell</td></tr></table></nav>' +
      '<article><p>prose</p><table><tr><td>A</td><td>B</td></tr></table></article>' +
      '<aside><table><tr><th>Aside</th></tr><tr><td>aside-cell</td></tr></table></aside>' +
      '<footer><table><tr><td>footer-cell</td></tr></table></footer>' +
      '</body>';
    const result = extractTablesFromHtml({ html, baseUrl: ORIGIN });
    const parsed = extractTablesOutput.parse(result.structuredContent);
    expect(parsed.metadata.tableCount).toBe(4);
    expect(parsed.tables.map(t => t.index)).toEqual([0, 1, 2, 3]);
    // Order is document order: nav, article, aside, footer.
    expect(parsed.tables[0]!.markdown).toContain('nav-cell');
    expect(parsed.tables[1]!.markdown).toContain('| A | B |');
    expect(parsed.tables[2]!.markdown).toContain('aside-cell');
    expect(parsed.tables[3]!.markdown).toContain('footer-cell');
  });

  it('emits a nested <table> as its own entry in document order', () => {
    // parseTableMatrix walks only the parent's direct THEAD/TBODY/TFOOT rows, so
    // the nested table's rows do not become rows of the parent's matrix;
    // querySelectorAll then returns the nested table as its own entry.
    const html =
      '<table><tbody>' +
      '<tr><td>outer</td><td><table><tr><td>inner</td></tr></table></td></tr>' +
      '</tbody></table>';
    const result = extractTablesFromHtml({ html });
    const parsed = extractTablesOutput.parse(result.structuredContent);
    expect(parsed.metadata.tableCount).toBe(2);
    // The parent is a single-row matrix; the nested one is emitted separately.
    expect(parsed.tables[0]!.rows).toBe(1);
    expect(parsed.tables[0]!.markdown).toContain('outer');
    expect(parsed.tables[1]!.rows).toBe(1);
    expect(parsed.tables[1]!.markdown).toContain('inner');
  });

  it('skips empty <table> elements and keeps emitted indices contiguous', () => {
    const html =
      '<table></table>' +
      '<table><tr><td>real</td></tr></table>' +
      '<table></table>';
    const result = extractTablesFromHtml({ html });
    const parsed = extractTablesOutput.parse(result.structuredContent);
    expect(parsed.metadata.tableCount).toBe(1);
    expect(parsed.tables[0]!.index).toBe(0);
    expect(parsed.tables[0]!.markdown).toContain('real');
  });

  it('returns (no tables found) and an empty tables array when there are none', () => {
    const result = extractTablesFromHtml({ html: '<p>no tables here</p>' });
    const parsed = extractTablesOutput.parse(result.structuredContent);
    expect(parsed.tables).toEqual([]);
    expect(parsed.metadata.tableCount).toBe(0);
    expect(parsed.content).toBe('(no tables found)');
    // content[0].text mirrors structuredContent.content.
    const first = result.content[0]!;
    expect('text' in first && first.text).toBe('(no tables found)');
  });

  it('returns { isError: true } for missing html and does not throw', () => {
    const result = extractTablesHandler({});
    expect(result.isError).toBe(true);
    expect(result.content.length).toBeGreaterThan(0);
  });

  it('defaults format to gfm when format is omitted', () => {
    const result = extractTablesFromHtml({ html: SPAN_HTML });
    const parsed = extractTablesOutput.parse(result.structuredContent);
    expect(parsed.metadata.format).toBe('gfm');
    expect(parsed.tables[0]!.markdown).toContain('| --- | --- | --- |');
  });

  it('scopes the table walk to the selectors.include subtree', () => {
    const html =
      '<div id="a"><table><tr><th>A</th></tr><tr><td>Alpha</td></tr></table></div>' +
      '<div id="b"><table><tr><th>B</th></tr><tr><td>Beta</td></tr></table></div>';
    const result = extractTablesFromHtml({
      html,
      baseUrl: ORIGIN,
      selectors: { include: '#a' },
    });
    const parsed = extractTablesOutput.parse(result.structuredContent);
    expect(parsed.metadata.tableCount).toBe(1);
    expect(parsed.tables[0]!.markdown).toContain('Alpha');
    expect(parsed.tables[0]!.markdown).not.toContain('Beta');
  });

  it('drops tables matched by selectors.exclude anywhere on the page', () => {
    const html =
      '<div id="a"><table><tr><td>Alpha</td></tr></table></div>' +
      '<aside class="ads"><table><tr><td>Ad</td></tr></table></aside>';
    const result = extractTablesFromHtml({
      html,
      baseUrl: ORIGIN,
      selectors: { exclude: ['.ads'] },
    });
    const parsed = extractTablesOutput.parse(result.structuredContent);
    expect(parsed.metadata.tableCount).toBe(1);
    expect(parsed.tables[0]!.markdown).toContain('Alpha');
  });

  // Regression oracle for the batch path: the cell-text pipeline (whitespace
  // normalize, surgical chrome strip, href fallback) must run identically
  // whether a table is extracted alone or as one of many. A count/size early-out
  // would surface as the *last* table coming back polluted while earlier ones
  // stay clean, so the assertion targets table[N-1] and also checks the batch
  // output equals the isolated extraction of that same table.
  it('applies the cell-text pipeline uniformly across many tables in batch', () => {
    const N = 25;
    const html = finologyBatch(N);

    const batched = extractTablesOutput.parse(
      extractTablesFromHtml({ html, format: 'json' }).structuredContent,
    );
    expect(batched.metadata.tableCount).toBe(N);

    for (const entry of batched.tables) {
      const records = JSON.parse(entry.markdown) as Record<string, string>[];
      // Header row is dropped by renderTableJson; 2 data rows + 1 link row.
      expect(records).toHaveLength(3);
      // Whitespace-padded numbers must be trimmed (no embedded newline survives).
      expect(records[0]).toMatchObject({
        PARTICULARS: 'Net Sales',
        'Jun 2025': '430.82',
        'Sep 2025': '453.17',
        'Dec 2025': '511.76',
      });
      expect(records[1]).toMatchObject({
        PARTICULARS: 'Net Profit',
        'Jun 2025': '194.24',
        'Sep 2025': '137.39',
        'Dec 2025': '153.42',
      });
      // Icon-only link cells surface the href (svg carries no text).
      expect(records[2]).toMatchObject({
        PARTICULARS: 'Annual Report',
        'Jun 2025': `https://example.com/r${entry.index}-0.pdf`,
        'Sep 2025': `https://example.com/r${entry.index}-1.pdf`,
        'Dec 2025': `https://example.com/r${entry.index}-2.pdf`,
      });
      // The pollution signature is a raw newline inside a value — none survive.
      expect(entry.markdown).not.toContain('\\n');
    }

    // The last table in batch must equal the same table extracted alone — the
    // isolated-vs-batch differential a count guard would trip.
    const isolated = extractTablesOutput.parse(
      extractTablesFromHtml({
        html: '<!doctype html><html><body>' + finologyTable(N - 1) + '</body></html>',
        format: 'json',
      }).structuredContent,
    );
    expect(isolated.tables[0]!.markdown).toBe(batched.tables[N - 1]!.markdown);
  });
});
