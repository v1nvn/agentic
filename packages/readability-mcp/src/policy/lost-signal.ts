import type { GatingSignal } from './gating.js';

import { countWords } from './text.js';

// Below this the extraction cannot be the article a reader came for. The
// measured corpus floor: the smallest healthy extract is gatwick at 435 words;
// the smallest known-lost one (WIRED's metered barrier) still carries 180.
export const NEAR_EMPTY_WORDS = 120;

// Curated junk signatures over the EXTRACTED text, not the page — gating's
// METERED_TEXT_RE reads the whole document, which is a different question.
// Each entry is measured on a real capture: the first two are the Daily Mail
// player controls that survive inside itemprop="articleBody" (dailymail-a66),
// the third is the metered barrier WIRED prints when the article itself was
// truncated server-side.
const DEBRIS_PROBES: readonly {
  readonly label: string;
  readonly pattern: RegExp;
}[] = [
  { label: 'player-controls', pattern: /Loaded:\s*\d+%/ },
  { label: 'player-controls', pattern: /Duration Time \d+:\d\d/ },
  {
    label: 'metered-barrier',
    pattern: /read your last free article|subscribe to continue reading/i,
  },
];

export interface LostEvidence {
  readonly debrisProbes: readonly string[];
  readonly fallbackUsed: boolean;
  readonly gatedReason?: string;
  readonly nearEmpty: boolean;
  readonly reasons: readonly string[];
  readonly wordCount: number;
}

// The verdict the suggest loop fires on. Gating alone never fires it — vendor
// SDK classes (paywall-ineligible feed badges, piano offer headers) report on
// free articles, and the pairing is enforced by construction: `gatedReason` is
// carried as evidence for the prompt and the report, and only
// fallback/near-empty/debris count as reasons.
export function assessLostSignal(input: {
  contentText: string;
  fallbackUsed: boolean;
  gated?: GatingSignal;
}): LostEvidence {
  const wordCount = countWords(input.contentText);
  const nearEmpty = wordCount < NEAR_EMPTY_WORDS;
  const debrisProbes = [
    ...new Set(
      DEBRIS_PROBES.filter(probe => probe.pattern.test(input.contentText)).map(
        probe => probe.label,
      ),
    ),
  ];
  const reasons = [
    ...(input.fallbackUsed ? ['fallback-used'] : []),
    ...(nearEmpty ? ['near-empty'] : []),
    ...debrisProbes.map(label => `debris:${label}`),
  ];
  return {
    debrisProbes,
    fallbackUsed: input.fallbackUsed,
    gatedReason: input.gated?.likely ? input.gated.reason : undefined,
    nearEmpty,
    reasons,
    wordCount,
  };
}
