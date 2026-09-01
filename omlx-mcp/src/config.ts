import pkg from '../package.json' with { type: 'json' };

export interface OmlxConfig {
  readonly model: string;
  readonly timeoutMs: number;
  readonly url: string;
}

export interface ServerConfig extends OmlxConfig {
  readonly description: string;
  readonly instructions: string;
  readonly name: 'omlx-mcp';
  readonly title: string;
  readonly version: string;
}

const DEFAULT_URL = 'http://127.0.0.1:6659';
const DEFAULT_MODEL = 'Qwen3.8-27B-oQ4e-mtp';
const DEFAULT_TIMEOUT_MS = 600_000;

const SERVER_TITLE = 'omlx MCP';

const SERVER_DESCRIPTION =
  'Delegate work to a local omlx inference server on this machine — one-shot prompts, schema-constrained extraction, and installed-model status. Loopback only: the server talks to OMLX_URL (default http://127.0.0.1:6659) and nothing else; /v1 and /health only, never the admin API.';

const SERVER_INSTRUCTIONS = `Delegate coding-agent busywork to the local model — free, private, unlimited, no quota. Default model Qwen3.8-27B-oQ4e-mtp: ~28 tok/s with MTP speculative decoding, 256K context window, 32768 max output tokens per call. The first call after idle may block ~30-60s while the 17GB model loads.

- ask: one-shot prompt to the local model. Route here instead of answering yourself when the job is high-volume or low-stakes: commit messages, docstrings across a package, changelogs, log/diff/transcript summarization, drafts and rewrites, describing images or screenshots (local file paths in \`images\`; bounding boxes on a 0-1000 scale work well), and anything containing content that should not leave this machine.
- ask_structured: the same, plus a JSON \`schema\` the output must match — entities from logs, frontmatter, tables from prose, bbox JSON. Prefer this over asking \`ask\` for JSON in prose.
- models: installed models with loaded state, context window, and size on disk — check here for valid \`model\` ids.

Do NOT route hard reasoning, planning, or multi-file refactors to the local model — quality is a step down from cloud models. If the server is down, the tools say so with the start command; do the work yourself rather than retrying.`;

function parseTimeoutMs(raw: string | undefined): number {
  const parsed = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  return {
    // A trailing slash would double up in path joins ("/v1/" + "/v1/models").
    url: (env.OMLX_URL ?? DEFAULT_URL).replace(/\/+$/, ''),
    model: env.OMLX_MODEL ?? DEFAULT_MODEL,
    timeoutMs: parseTimeoutMs(env.OMLX_TIMEOUT_MS),
    name: 'omlx-mcp',
    version: pkg.version,
    title: SERVER_TITLE,
    description: SERVER_DESCRIPTION,
    instructions: SERVER_INSTRUCTIONS,
  };
}
