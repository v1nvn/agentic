# Discoverability

How agentic's surfaces get found: where each surface's demand sits, the npm
and GitHub faces, the free listing channels with their exact gates, the
communities that welcome tool posts and their criteria, and what gets a
project banned. Read before changing a package manifest, the repo description,
or submitting anywhere.

## Pools

Each surface competes in an existing demand pool. Launch where the pool's
audience already gathers; the marketplace is the install path, not the
discovery surface.

| Surface                                | Pool                                        | Incumbents (verified stars)                                                   | Launch venue                           |
| -------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------- |
| `tokens`                               | claude code usage                           | Usage-Monitor 8.8k★, Clawdmeter 2.3k★, ccseva 806★, ccusage (npm)             | r/ClaudeAI                             |
| `statusline`                           | claude code statusline                      | CCometixLine 3.5k★, claude-statusline 1.4k★, best-claude-hud 998★             | r/ClaudeAI                             |
| `zai`                                  | GLM Coding Plan quota                       | official `glm-plan-usage` plugin, opencode-glm-quota, VS Code tracker — young | r/ZaiGLM, V2EX, r/ChatGPTCoding        |
| `readability`                          | url → markdown MCP                          | Firecrawl, Jina Reader (both commercial)                                      | MCP Registry, Glama, mcp.so            |
| `omlx`                                 | local-LLM delegation MCP                    | none dominant                                                                 | MCP directories                        |
| `rm`                                   | reMarkable tooling                          | awesome-reMarkable 7.8k★, rmapi 1k★ (frozen by an unmaintained banner)        | r/RemarkableTablet, awesome-reMarkable |
| `todo`                                 | claude code todo — empty pool (top repo 5★) | none                                                                          | HN Show HN, as the story               |
| `md`, `notify`, `rulings`, `enhansome` | no pool of their own                        | —                                                                             | ride the marketplace page              |

## The npm face

### Search mechanics

- Search matches **name, description, README text, keywords** — README is
  itself a search lane, so an empty registry readme deletes a whole lane.
- No official ranking weights are published; results are keyword-ordered with
  "a minimal boost to deprioritize spammy or entirely new packages". The
  npms.io quality/popularity/maintenance triad is npms's model, not npm's.
  (docs.npmjs.com searching-for-and-choosing-packages; npm staff, community
  discussion #128411)
- Name match outranks everything: ccusage and @fbincon/claude-code-statusline
  carry **zero keywords** and still top their searches.
- A new package can take up to two weeks to enter search; deprecated packages
  are excluded from search entirely — never deprecate-and-replace.

### Publishing the README

- The tarball auto-includes `README.md`, but the **npm page renders the
  registry `readme` field, which comes from the publish payload, not the
  tarball** (docs.npmjs.com about-package-readme-files).
- The 4.18.0 berry binary sends no `readme` in the publish body — verified
  2026-10-24 against a local registry, same README.md on both doors: npm
  CLI's publish delivered it verbatim, berry's arrived empty. yarnpkg/berry#1702
  diagnosed the omission (yarn's maintainer called it a verdaccio issue; the
  stale-bot closed it); the fix on berry master is not in the shipped binary.
- A README change reaches the page only when a new version publishes — README
  fixes ride a release.
- Never rely on a `readme` string in package.json; npm reads the root
  README.md at publish.

### Manifest rules

- Description: one imperative line carrying the pool's exact nouns — every
  top hit of the "claude code statusline" search carries the phrase in its
  description.
- Keywords: 3–6 real search nouns. Winner sets: @cometix/ccline
  `claude, statusline, claude-code, rust, cli`; glm-review `claude-code,
code-review, glm, zhipu, ai, cli, agent-skills`. No documented count cap;
  stuffing reads as the spam signal the docs name.
- `homepage` and `repository` set on every package.
- Install commands stay exactly version-pinned — the npx-cache-staleness law
  outranks the winners' `@latest` convention.

### README first screen

Winner poles: ccusage (logo → badge row → terminal screenshot → one-line
description → `npx` command) and @cometix/ccline (913 bytes: name → one-liner
→ install → feature bullets); firecrawl (dense what-it-returns paragraph →
install → 3-step quickstart). The pattern: the one-line "what" within the
first three lines, an install command before the first scroll, a visual
(screenshot or logo) above it. Non-English READMEs win too — structure, not
language.

## The GitHub face

### Search and description

- Repo search matches **name, description, topics** by default; README content
  matches only under the explicit `in:readme` qualifier. Pack the search
  phrase into the description, never just the README.
- Description formula: **"<category> for Claude Code: 2–4 capability
  phrases"** (leeguooooo carries 5 in one line and ranks). It is also the
  og:title/og:description of every unfurl — a stale description propagates to
  every Reddit/HN/X card and Google snippet (verified live on best-claude-hud).
- READMEs render server-side and Google indexes them; the README is the SEO
  body copy.

### Topics

- Format: ≤20 topics, ≤50 chars each, lowercase/digits/hyphens; topic pages
  are followable and browsable.
- Claim the small high-intent ones — a repo holds a visible slot there;
  `claude-code`/`mcp` are too big to rank in but still feed default search.
  Verified sizes: `claude-code` 99,780 · `mcp` 103,656 · `mcp-server` 38,984 ·
  `statusline` 1,327 · `claude-code-plugins` 844 · `remarkable-tablet` 469 ·
  `remarkable` 257. The reMarkable community's standard tag is
  `remarkable-tablet` (rmapi and awesome-reMarkable both use it) — carry both.
- Topics correlate weakly with stars (CCometixLine: 3.5k★, zero topics;
  leeguooooo: 15 topics, 380★) — the description and install one-liner carry
  the growth; topics are cheap insurance.

### Unfurls and signals

- Social preview: PNG/JPG/GIF under 1 MiB, ≥640×320, 1280×640 best, solid
  background — without it, unfurls show the avatar.
- A LICENSE file at the repo root: 7 of 8 star winners carry one; awesome
  lists gate on a GitHub-discoverable license.
- Keep `pushed_at` fresh — rmapi froze at ~1k★ behind an "effectively
  unmaintained" banner for years.
- Growth is front-loaded: winners bank most stars in the first 4–8 months
  (nilbuild ~185★/mo; best-claude-hud ~250★/mo peaking at GitTrend #79). The
  launch window outweighs SEO drip.
- Trending is undocumented (star-velocity consensus); fake stars are filtered
  by trending and detected by standard tooling (arXiv 2412.13459; CMU 2025) —
  never.

## Listing channels

### Anthropic plugin directory — the highest-value channel

Surfaces plugins in Claude Code's in-product Discover tab.

- **Flow**: claude.ai/directory/manage → Submit new → Plugin bundle → repo +
  plugin path + tracked branch → Validate → fix Blocks → listing details
  (read from plugin.json + README) → data-handling questions → compliance
  email + four acknowledgements → Submit for review. Requires a paid Claude
  plan and a connected GitHub account with push access; repo public before
  publish.
- **Caps**: one submission per plugin folder; 10 submissions per 24h (drafts
  count); the first org to submit a repo+folder owns that slot.
- **Blocks** (hard fails): missing `.claude-plugin/plugin.json`; .DS_Store /
  __MACOSX; names invalid on Windows or macOS; symlinks/submodules/LFS in
  loaded files; repo over 50 MiB archived / 256 MiB unpacked / 10k files; a
  plugin file over 5 MiB; non-image files over 256 KiB; over 512 files per
  plugin; names not lowercase/digits/hyphens ≤64, reserved (`claude`, `mcp`,
  `test`, …) or taken; **README under 40 words in the plugin folder (code
  blocks don't count)**; no LICENSE in the folder and no `license` field;
  npx/uvx launchers not pinned to an exact version; .npmrc/registry config
  beside launchers; secrets outside `userConfig` `sensitive: true`; MCP
  servers not declared as local `command`+`args` (plain file path, no
  `npm run`, no `-c`) or an https `url`; hooks.json not schema-valid; missing
  text `description` in skill/command/agent front matter.
- **Holds** (reviewer review, not rejection — expected for us): any pinned
  registry package; a package.json+lockfile pair; scripts the validator can't
  follow (subfolder layouts, `${CLAUDE_PLUGIN_ROOT}` indirection); non-text
  binaries (.ico/.pdf/.zip).
- **Security scan**: flags undisclosed data egress, hidden code, permission
  changes. First-scan failure is rejection — each README discloses everything
  the plugin runs, sends and fetches; source stays readable, never compiled or
  minified.
- Icons and screenshots: not required anywhere. No documented description cap.

### awesome-claude-code

Web issue-form only (`recommend-resource.yml`) — PRs auto-rejected, `gh` can't
submit; one resource per person at a time; recommendations human-written.
Gates: repo ≥14 days old + active development, or ≥100★; license
GitHub-discoverable; description one line, declarative, no emojis, no sales
pitch, no addressing the reader. Best-effort review, no guaranteed response.

### awesome-reMarkable

One PR per entry: `[name](link) - description.` — ends with a period,
alphabetical, spelled "reMarkable", no trailing whitespace. No star/age gate.
Frame rm as a reMarkable workflow tool.

### MCP directories

- **MCP Registry** (registry.modelcontextprotocol.io, via GitHub): the
  canonical registry; PulseMCP is paused and says to publish here — it picks
  listings up automatically when it reopens.
- **Glama** (glama.ai/mcp/servers): Add Server form, free for open source;
  listings auto-graded A–D (license/quality/maintenance); claim for the
  org tag.
- **mcp.so**: submit form; free editorial queue (a $39 paid instant path
  exists — never).
- **Smithery — skip**: local stdio servers must ship as MCPB bundles
  (`smithery mcp publish ./server.mcpb`), which fights the zero-install
  .ts-direct design; the remote path (streamable HTTP + SmitheryBot allowlist
  - `/.well-known/mcp/server-card.json`) doesn't fit local servers.

### Skipped

- **buildwithclaude**: plugins live inside their repo; contribution means
  moving plugin content out of ours — not a link directory.

## Communities

- **r/ClaudeAI** — tool showcases explicitly encouraged (rule 7) with six
  criteria: built with/for Claude Code; describes what it does and how it was
  built; usable as-is and free to try; minimal promotional language; no
  referral links; no job seeking. Flair required; over 50 karma to post.
  Rule 10: vote manipulation is an immediate permanent ban, no warning.
- **Hacker News** — "Show HN: <thing>" for first releases and major overhauls
  only (version bumps are too minor); instantly tryable, no signup or landing
  wall; the author stays in the thread answering; never ask anyone to upvote;
  own-domain submissions stay a minority of the account's history — accounts
  that exist mainly to promote one's own work get danged.
- **r/RemarkableTablet** — Self-Promotion flair mandatory on anything that
  promotes or links your content (omission = removal); no bootleg/paid promo;
  the sub is cordial and low-effort content is removed — a working tool with
  a demo screenshot fits its established showcase pattern. Post only what
  genuinely serves tablet users.
- **GLM Coding Plan pain** — r/ZaiGLM (~2.5k, complaint-heavy: answer the
  quota pain, never astroturf praise), r/ChatGPTCoding (GLM-plan-with-Claude-
  Code threads), V2EX (the most active quota/pricing discussion, Chinese),
  juejin/zhihu (Chinese tool write-ups), Z.ai Discord. Chinese posts on V2EX
  and juejin, English on Reddit.

## AEO

- Answer engines cite the durable corpus — GitHub, npm, awesome lists,
  reference docs — over vendor pages (Orbit Media, 13,184 citations). Engines
  overlap little: ~7.6% of cited domains shared between ChatGPT and Perplexity
  — spread beats depth.
- Reddit drives retrieval far more than visible citations (~27% of ChatGPT's
  search retrieval vs under 1% of visible citations, single-study) — Reddit is
  for humans, the corpus is for machines.
- llms.txt: skip — Google states it ignores the file, a 300k-domain study
  found no citation link, and no provider has confirmed consuming it.
- README patterns machines quote: a TL;DR line under the title,
  question-shaped headings where honest, an FAQ, an honest comparison table.
  The winners carry none of these (ccusage, CCometixLine) — a cheap
  differentiator, not table stakes.
- Fetching assistants cite live (Perplexity ~19 sources/answer); chat
  assistants lean on training data — durable corpus presence compounds.

## Never

Vote rings and upvote asks (r/ClaudeAI: permanent ban, no warning; HN: account
dang; Reddit sitewide vote-manipulation policy). Sock puppets and multi-
account boosting. Unflaired self-promotion (automod removes silently, often
shadow-removed). The same link reposted across communities on one account.
Astroturfed praise, especially in complaint-heavy venues. Keyword or
description stuffing. Fake stars — trending filters most and detection is
standard tooling.
