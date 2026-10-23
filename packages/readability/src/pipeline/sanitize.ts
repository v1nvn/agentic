import DOMPurify, { type DOMPurify as DOMPurifyInstance } from 'dompurify';

import type { DOMWindow } from 'jsdom';

export interface SanitizeResult {
  readonly html: string;
  readonly iframesRemoved: number;
  readonly scriptsRemoved: number;
}

function countRemoved(
  removed: DOMPurifyInstance['removed'],
  tagName: string,
): number {
  let count = 0;
  for (const entry of removed) {
    // RemovedAttribute entries have no `element`; count element removals only.
    if (
      'element' in entry &&
      entry.element.nodeName.toUpperCase() === tagName
    ) {
      count += 1;
    }
  }
  return count;
}

// DOMPurify scrubs Readability's output (scripts, inline event handlers,
// iframes) before Turndown converts it to Markdown — it is a pipeline stage,
// not a product. A sanitized-HTML output mode was rejected: the server emits
// Markdown, and callers wanting sanitized HTML should run DOMPurify directly.
export function sanitizeHtml(dirty: string, window: DOMWindow): SanitizeResult {
  const purify = DOMPurify(window);
  const html = purify.sanitize(dirty);
  return {
    html,
    iframesRemoved: countRemoved(purify.removed, 'IFRAME'),
    scriptsRemoved: countRemoved(purify.removed, 'SCRIPT'),
  };
}
