---
name: read-url
description: Fetch a live web URL and extract its main article to clean Markdown + metadata via the readability `extract` tool. Use whenever the user gives a URL and wants the page read, summarized, quoted, or converted to Markdown — e.g. "read this", "what does this page say", "summarize <url>", "grab the article at <url>". Fetches with curl and only falls back to a browser render when the static HTML is a JS shell.
---

# Read a URL to Markdown

Turn a live URL into clean article Markdown. The readability server **never fetches URLs**
and reads HTML only from a file path, so the page bytes never enter the model context —
this skill does the fetching in the host shell and hands the server a path. Never paste the
page HTML into the conversation; only the `localPath` crosses to `extract`.

## Flow

1. **Fetch to a temp file** (host shell):
   ```
   curl -fsSL -o /tmp/read-url.html '<URL>'
   ```
   A curl failure (non-2xx status, connection refused, DNS) is a hard error — report it and
   stop. That is *not* "needs JS"; it's a dead fetch, and a browser won't save it.

2. **Extract**, passing the path and the URL as origin context:
   - tool: `extract`
   - args: `{ localPath: "/tmp/read-url.html", baseUrl: "<URL>", cache: true }`

3. **Branch on `diagnostics` from the result:**

   - **`readerable: true`** → curl was enough. The article is in the static HTML. Return the
     Markdown; **do not** render with a browser.

   - **`readerable: false` OR `fallbackUsed: true`** → the static fetch was a JS shell, or
     Readability couldn't find a real article in it. Escalate:
     - **`gating.likely: true`** → the page is paywalled / gated. A browser only dismisses
       the overlay, not the paywall — don't render. Return the partial result with a note
       that the page is gated.
     - **otherwise** → try a browser render (step 4), or degrade (step 5).

4. **Browser fallback** — only when step 3 said "shell, not gated" **and** the
   `chrome-devtools` MCP tool is available:
   1. `navigate_page` to `<URL>`; wait for network idle / load. Scroll to trigger lazy
      content if it still looks partial.
   2. `evaluate_script` returning `document.documentElement.outerHTML`, with its `filePath`
      argument set to an absolute path (e.g. `/tmp/read-url-rendered.html`). The tool writes
      the HTML to that path — emit the path only, never the HTML.
   3. Re-run `extract` with the new `localPath` (same `baseUrl`, `cache: true`).

5. **Degrade gracefully** when the browser is needed but `chrome-devtools` is **not**
   available: return the static `extract` result (often partially useful — metadata, some
   prose) plus the note:
   > Static fetch looked like a JS shell (readerable: false). Install chrome-devtools-mcp
   > and re-run to get the rendered content.

## Notes

- `cache: true` is free: re-reading the same URL after a fresh CSP nonce hits the cache and
  skips re-extraction.
- Bias toward the browser retry: a false positive costs one render; a false negative
  returns an app shell.
- Out of scope: PDFs (not HTML), and auth/login-walled pages — the server never
  authenticates. These surface as `readerable: false`; return the partial result + note
  rather than pretending success.
