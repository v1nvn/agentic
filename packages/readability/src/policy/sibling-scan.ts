import { isElement } from '../pipeline/dom.js';

// Shared pre-pass for the sibling-cluster detectors (list-detector,
// grid-detector). Both walk the document for a container whose direct children
// form a same-shape sibling group; the constants and helpers here are the
// heuristic-agnostic infrastructure that scan shares. Detector-specific scoring
// (anchor/pathname signals vs data-cell text) stays in each detector.

// Direct children are scanned only at these container levels. <tbody> covers
// HN's <table>-based layout; the rest cover semantic (<main>/<article>) and
// generic (<div>/<section>) wrappers. <table> is included for HTML that skips
// <tbody>; jsdom synthesizes one anyway, so this is mostly defensive.
export const CONTAINER_TAGS = new Set([
  'ARTICLE',
  'DIV',
  'MAIN',
  'OL',
  'SECTION',
  'TABLE',
  'TBODY',
  'UL',
]);

// Subtrees that never carry a page's primary repeated structure. Stripping them
// is the false-positive guard: without it, an article's <nav> menu or footer
// link list would look identical to a feed/grid and the detectors would mis-fire
// on every page with chrome. Distinct from normalize.ts's stripChrome (which
// removes consent/overlay banners) — this is landmark chrome only.
const LANDMARK_CHROME_SELECTOR =
  'nav, header, footer, aside, [role="navigation"], [role="banner"], ' +
  '[role="contentinfo"], [role="complementary"], [role="search"], ' +
  '[role="menu"], [role="menubar"]';

export function stripLandmarkChrome(document: Document): void {
  for (const el of document.querySelectorAll(LANDMARK_CHROME_SELECTOR)) {
    el.remove();
  }
  for (const el of document.querySelectorAll('script, style, template')) {
    el.remove();
  }
}

// Composite of tag + class signature so mixed siblings — e.g. HN's
// <tr class="athing"> title row vs classless <tr> subtext row, or a grid's
// header row vs data rows — split into separate candidate groups instead of
// blending into one ragged group.
export function shapeKey(el: Element): string {
  const raw = el.getAttribute('class');
  if (!raw) {
    return el.tagName;
  }
  const normalized = raw.trim().split(/\s+/).sort().join(' ');
  return normalized ? `${el.tagName}|${normalized}` : el.tagName;
}

// Group a container's direct element-children by shape so a homogeneous
// cluster surfaces as one candidate and mixed-shape siblings (header row vs
// data rows, HN's athing + subtext) split apart rather than blending.
export function groupChildrenByShape(container: Node): Map<string, Element[]> {
  const groups = new Map<string, Element[]>();
  for (const child of Array.from(container.childNodes)) {
    if (!isElement(child)) {
      continue;
    }
    const key = shapeKey(child);
    const bucket = groups.get(key);
    if (bucket) {
      bucket.push(child);
    } else {
      groups.set(key, [child]);
    }
  }
  return groups;
}

// tag#id.class hint for the winning container. Best-effort, not a unique
// locator — used only for diagnostics so a human can see which subtree won.
// `maxClasses` caps the class list for compact diagnostic output.
export function describeSelector(el: Element, maxClasses?: number): string {
  const parts = [el.tagName.toLowerCase()];
  const id = el.getAttribute('id');
  if (id) {
    parts.push(`#${id}`);
  }
  const cls = el.getAttribute('class');
  if (cls) {
    let used = 0;
    for (const token of cls.trim().split(/\s+/)) {
      if (token) {
        parts.push(`.${token}`);
        used += 1;
      }
      if (maxClasses !== undefined && used >= maxClasses) {
        break;
      }
    }
  }
  return parts.join('');
}
