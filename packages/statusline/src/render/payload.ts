export interface RateRow {
  readonly label: string;
  readonly pctText: string;
  readonly resets: number;
}

export interface Row {
  readonly agent: string;
  readonly cost: number;
  readonly ctxSize: number;
  readonly dir: string;
  readonly durationMs: number;
  readonly effort: string;
  readonly expires: number;
  readonly hit: null | number;
  readonly la: number;
  readonly lr: number;
  readonly model: string;
  readonly pct: number;
  readonly prn: string;
  readonly prs: string;
  readonly rateRows: readonly RateRow[];
  readonly styleName: string;
  readonly think: boolean;
  readonly tokens: number;
  readonly ttl: string;
  readonly vim: string;
  readonly warm: boolean;
  readonly wt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function member(source: unknown, key: string): unknown {
  return isRecord(source) ? source[key] : undefined;
}

function field(source: unknown, path: string): unknown {
  let current: unknown = source;
  for (const key of path.split('.')) {
    current = member(current, key);
  }
  return current;
}

// jq's `//`: only null, false, and a missing member fall through.
function orElse(value: unknown, fallback: unknown): unknown {
  return value === undefined || value === null || value === false
    ? fallback
    : value;
}

function tsvText(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  return '';
}

function scalar(source: unknown, path: string, fallback: string): string {
  return tsvText(orElse(field(source, path), fallback));
}

function numberField(source: unknown, path: string): number {
  return Number(scalar(source, path, '0'));
}

// `${PCT%%.*}`: the used-percentage text up to its first decimal point.
function pctField(source: unknown): number {
  const intPart = scalar(source, 'context_window.used_percentage', '0').split(
    '.',
  )[0];
  return intPart === '' ? 0 : Number(intPart);
}

const RATE_LIMITS: readonly (readonly [label: string, key: string])[] = [
  ['5h', 'five_hour'],
  ['7d', 'seven_day'],
  ['spend', 'spend_limit'],
];

function rateRows(source: unknown): RateRow[] {
  const limits = field(source, 'rate_limits');
  const rows: RateRow[] = [];
  for (const [label, key] of RATE_LIMITS) {
    const limit = member(limits, key);
    if (!isRecord(limit) || Object.keys(limit).length === 0) {
      continue;
    }
    rows.push({
      label,
      pctText: scalar(limit, 'used_percentage', '0'),
      resets: Number(scalar(limit, 'resets_at', '0')),
    });
  }
  return rows;
}

export function parseRow(payload: string): Row {
  const root: unknown = JSON.parse(payload);
  const hitText = scalar(root, 'prompt_cache.hit_ratio', '');
  return {
    agent: scalar(root, 'agent.name', ''),
    cost: numberField(root, 'cost.total_cost_usd'),
    ctxSize: numberField(root, 'context_window.context_window_size'),
    dir: scalar(root, 'workspace.current_dir', ''),
    durationMs: numberField(root, 'cost.total_duration_ms'),
    effort: scalar(root, 'effort.level', ''),
    expires: numberField(root, 'prompt_cache.expires_at'),
    hit: hitText === '' ? null : Number(hitText),
    la: numberField(root, 'cost.total_lines_added'),
    lr: numberField(root, 'cost.total_lines_removed'),
    model: scalar(root, 'model.display_name', ''),
    pct: pctField(root),
    prn: scalar(root, 'pr.number', ''),
    prs: scalar(root, 'pr.review_state', ''),
    rateRows: rateRows(root),
    think: scalar(root, 'thinking.enabled', 'false') === 'true',
    tokens: numberField(root, 'context_window.total_input_tokens'),
    ttl: scalar(root, 'prompt_cache.ttl', ''),
    vim: scalar(root, 'vim.mode', ''),
    warm: scalar(root, 'prompt_cache.warm', 'false') === 'true',
    wt: scalar(root, 'worktree.name', ''),
    styleName: scalar(root, 'output_style.name', ''),
  };
}
