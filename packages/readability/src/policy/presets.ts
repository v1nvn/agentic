// Structural twin of the pipeline's SelectorScope — policy cannot import upward.
export interface PresetScope {
  readonly exclude?: readonly string[];
  readonly include?: string;
}

export interface SitePreset {
  readonly detectors: readonly string[];
  readonly scope: PresetScope;
  readonly site: string;
}

export type PresetRejection = 'detectors-missed' | 'overridden';

export interface PresetSignal {
  readonly applied: boolean;
  readonly reason?: PresetRejection;
  readonly site: string;
}

export interface PresetResolution {
  readonly scope?: PresetScope;
  readonly signal: PresetSignal;
}

const presets = new Map<string, SitePreset>();

// Bumped on every store mutation so cache keys can fold in preset state
// without hashing the resolved scope: an entry extracted before a preset
// landed must never be served after it.
let generation = 0;

export function presetGeneration(): number {
  return generation;
}

export function resetPresets(): void {
  presets.clear();
  generation += 1;
}

export function addPreset(preset: SitePreset): void {
  const key = normalizeSiteKey(preset.site);
  if (!key) {
    throw new Error(`invalid preset site: ${preset.site}`);
  }
  presets.set(key, preset);
  generation += 1;
}

export function removePreset(site: string): boolean {
  const key = normalizeSiteKey(site);
  const removed = key !== undefined && presets.delete(key);
  if (removed) {
    generation += 1;
  }
  return removed;
}

export function presetForSite(
  site: string | undefined,
): SitePreset | undefined {
  const key = normalizeSiteKey(site);
  return key ? presets.get(key) : undefined;
}

// Accepts a full URL or a bare host; `www.` is the one prefix every site's own
// pages agree on, so exactly one strip — `www.www.com` keys as `www.com`.
export function normalizeSiteKey(
  value: string | undefined,
): string | undefined {
  const raw = value?.trim();
  if (!raw) {
    return undefined;
  }
  let host: string;
  try {
    host = new URL(raw).hostname.toLowerCase();
  } catch {
    host = raw.toLowerCase();
  }
  const key = host.startsWith('www.') ? host.slice('www.'.length) : host;
  return /^[a-z0-9.-]+$/.test(key) ? key : undefined;
}

// A selector that throws cannot match anything, so a malformed preset selector
// is a miss by the same predicate as a non-matching one — never a crash.
export function selectorMisses(scope: ParentNode, selector: string): boolean {
  try {
    return scope.querySelector(selector) === null;
  } catch {
    return true;
  }
}

function presetMatches(document: Document, preset: SitePreset): boolean {
  for (const detector of preset.detectors) {
    if (selectorMisses(document, detector)) {
      return false;
    }
  }
  // The include must still match: an unmatched include is applySelectors'
  // silent no-op, and reporting applied:true over baseline output is a lie.
  if (
    preset.scope.include &&
    selectorMisses(document.body, preset.scope.include)
  ) {
    return false;
  }
  // Excludes must execute but need not match — the debris they name is absent
  // from some pages of the site, and that is not staleness.
  for (const selector of preset.scope.exclude ?? []) {
    try {
      document.querySelectorAll(selector);
    } catch {
      return false;
    }
  }
  return true;
}

export function resolvePreset(
  document: Document,
  baseUrl: string | undefined,
  overridden: boolean,
): PresetResolution | undefined {
  const site = normalizeSiteKey(baseUrl);
  if (!site) {
    return undefined;
  }
  const preset = presets.get(site);
  if (!preset) {
    return undefined;
  }
  if (overridden) {
    return { signal: { applied: false, reason: 'overridden', site } };
  }
  if (!presetMatches(document, preset)) {
    return { signal: { applied: false, reason: 'detectors-missed', site } };
  }
  return { scope: preset.scope, signal: { applied: true, site } };
}
