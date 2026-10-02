import { isGeneratedIdentifier } from './identifiers.js';
import { selectorMisses } from './presets.js';

export type SelectorViolationKind =
  | 'contains-pseudo'
  | 'exclude-shadows-include'
  | 'generated-identifier'
  | 'no-match'
  | 'positional-pseudo'
  | 'unparseable';

export interface SelectorViolation {
  readonly detail: string;
  readonly kind: SelectorViolationKind;
  readonly selector: string;
}

export interface ProposalInput {
  readonly detectors: readonly string[];
  readonly document: Document;
  readonly scope: {
    readonly exclude?: readonly string[];
    readonly include?: string;
  };
}

// nwsapi/jsdom accept `:contains` and silently apply it, so an engine error can
// reject nothing — the rejection has to happen here, before any selector
// reaches querySelector. Positional pseudos are rejected as a family: they
// describe this render's child order, not the site's structure.
const POSITIONAL_PSEUDO_RE =
  /:(?:nth(?:-last)?(?:-child|-of-type)|first(?:-child|-of-type)|last(?:-child|-of-type)|only(?:-child|-of-type))\b/i;
const CONTAINS_PSEUDO_RE = /:contains\s*\(/i;

function quotedSegmentsOut(selector: string): string {
  return selector.replace(/(["'])(?:\\.|(?!\1)[\s\S])*\1/g, '""');
}

// `.class` and `#id` tokens are identifiers; `[attr="value"]` values are
// substring matches against whatever the site emitted and are exempt.
function identifierTokens(selector: string): string[] {
  return [...quotedSegmentsOut(selector).matchAll(/[.#]([A-Za-z0-9_-]+)/g)].map(
    match => match[1],
  );
}

export function lintSelectorText(
  selector: string,
): SelectorViolation | undefined {
  if (CONTAINS_PSEUDO_RE.test(selector)) {
    return {
      kind: 'contains-pseudo',
      selector,
      detail: ':contains is not standard CSS and changes the result silently',
    };
  }
  const positional = POSITIONAL_PSEUDO_RE.exec(selector);
  if (positional) {
    return {
      kind: 'positional-pseudo',
      selector,
      detail: `${positional[0]} depends on this page's child order, not the site's layout`,
    };
  }
  for (const token of identifierTokens(selector)) {
    if (isGeneratedIdentifier(token)) {
      return {
        kind: 'generated-identifier',
        selector,
        detail: `"${token}" reads as a generated hash that changes on deploy`,
      };
    }
  }
  return undefined;
}

// Propose-time validation for a preset a suggester wants stored. Stricter than
// presetMatches: an exclude that matches nothing is tolerated at runtime (the
// debris is absent from some pages) but at propose time it is a mistake — the
// proposal names debris that is not there.
export function lintProposal({
  document,
  detectors,
  scope,
}: ProposalInput): readonly SelectorViolation[] {
  const violations: SelectorViolation[] = [];
  const selectors = [
    ...detectors,
    ...(scope.include ? [scope.include] : []),
    ...(scope.exclude ?? []),
  ];
  for (const selector of selectors) {
    const violation = lintSelectorText(selector);
    if (violation) {
      violations.push(violation);
    }
  }

  let includeRoot: Element | undefined;
  if (
    scope.include &&
    !violations.some(violation => violation.selector === scope.include)
  ) {
    try {
      includeRoot = document.body.querySelector(scope.include) ?? undefined;
    } catch {
      violations.push({
        kind: 'unparseable',
        selector: scope.include,
        detail: 'the selector engine rejects this selector',
      });
    }
  }

  for (const detector of detectors) {
    if (violations.some(violation => violation.selector === detector)) {
      continue;
    }
    if (selectorMisses(document, detector)) {
      violations.push({
        kind: 'no-match',
        selector: detector,
        detail: 'detector matches nothing on this page',
      });
    }
  }
  if (
    scope.include &&
    !includeRoot &&
    !violations.some(violation => violation.selector === scope.include)
  ) {
    violations.push({
      kind: 'no-match',
      selector: scope.include,
      detail:
        'include matches nothing inside <body>, where applySelectors searches',
    });
  }
  for (const selector of scope.exclude ?? []) {
    if (violations.some(violation => violation.selector === selector)) {
      continue;
    }
    try {
      if (document.querySelectorAll(selector).length === 0) {
        violations.push({
          kind: 'no-match',
          selector,
          detail: 'exclude matches nothing on this page',
        });
      }
    } catch {
      violations.push({
        kind: 'unparseable',
        selector,
        detail: 'the selector engine rejects this selector',
      });
    }
  }

  // Excludes are removed document-wide before the include is applied, so an
  // exclude matching an ancestor of the include root (or the root itself)
  // deletes it, and the include then quietly no-ops over a damaged body.
  if (includeRoot) {
    for (const selector of scope.exclude ?? []) {
      if (violations.some(violation => violation.selector === selector)) {
        continue;
      }
      try {
        for (const match of document.querySelectorAll(selector)) {
          if (match.contains(includeRoot)) {
            violations.push({
              kind: 'exclude-shadows-include',
              selector,
              detail: 'this exclude removes the include root itself',
            });
            break;
          }
        }
      } catch {
        // Already reported as unparseable.
      }
    }
  }

  return violations;
}
