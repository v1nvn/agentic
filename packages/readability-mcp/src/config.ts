import pkg from '../package.json' with { type: 'json' };

export interface ServerConfig {
  readonly description: string;
  readonly instructions: string;
  readonly logLevel: LogLevel;
  readonly name: 'readability-mcp';
  readonly title: string;
  readonly version: string;
}

export type LogLevel = 'debug' | 'error' | 'info' | 'silent' | 'warn';

const VALID_LEVELS: readonly LogLevel[] = [
  'debug',
  'info',
  'warn',
  'error',
  'silent',
];

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: Number.MAX_SAFE_INTEGER,
};

const DEFAULT_LOG_LEVEL: LogLevel = 'info';

function resolveLogLevel(env: NodeJS.ProcessEnv): LogLevel {
  const raw = env.READABILITY_MCP_LOG_LEVEL;
  if (raw && (VALID_LEVELS as readonly string[]).includes(raw)) {
    return raw as LogLevel;
  }
  return DEFAULT_LOG_LEVEL;
}

const SERVER_TITLE = 'Readability MCP';

const SERVER_DESCRIPTION =
  'Turn already-rendered (post-JavaScript) HTML into clean, LLM-friendly Markdown plus metadata, via Mozilla Readability, Turndown, and DOMPurify. Makes no outbound requests — input is the rendered HTML, read from a file path (localPath) so the page bytes never enter the model context.';

const SERVER_INSTRUCTIONS = `Every tool reads already-rendered HTML from a file path (\`localPath\`) — e.g. \`document.documentElement.outerHTML\` written to disk by a browser/devtools capture — so the page bytes never enter the model context; \`chunk_text\` alone takes text. The server never fetches URLs: \`baseUrl\` only absolutizes links.

Pick the tool by page shape:
- extract: the default for article-like pages → Markdown + metadata + diagnostics. \`cache: true\` exposes the result as a \`readability://page/{hash}\` resource; \`chunk\` adds token-bounded chunks.
- extract_list: feed, index, search, or HN-style pages Readability cannot turn into one article.
- extract_tables: every \`<table>\` on the page, including ones outside the article body.
- extract_grid: div-rendered tables in SPAs.
- extract_section: one section, by CSS selector or heading text.
- extract_links: anchors from the raw DOM, for crawl and navigation decisions.
- extract_metadata, outline: cheap pre-checks (bibliographic metadata; h1-h6 heading TOC) before full extraction.
- html_to_markdown: a fragment already isolated, converted with no Readability scoring.
- explain: post-mortem when \`extract\` picked the wrong root.
- chunk_text: split already-extracted text for embedding/RAG.

When the client advertises MCP \`sampling\`, two more tools appear: \`summarize\` (the host's model summarizes text) and \`suggest_preset\` (after \`extract\` reports gating, a fallback, a near-empty result, or debris, the host's model proposes site selectors; the server verifies them and caches a per-site preset).

Failures come back as \`isError: true\` results, never thrown.`;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  return {
    name: 'readability-mcp',
    version: pkg.version,
    title: SERVER_TITLE,
    description: SERVER_DESCRIPTION,
    instructions: SERVER_INSTRUCTIONS,
    logLevel: resolveLogLevel(env),
  };
}

export function levelEnabled(
  config: ServerConfig,
  level: Exclude<LogLevel, 'silent'>,
): boolean {
  return LEVEL_RANK[level] >= LEVEL_RANK[config.logLevel];
}
