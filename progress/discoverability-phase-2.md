# Discoverability phase 2 — listings and community launches

**Run:** owner units — portal, listings and posts are the owner's actions; no review (no code diff)
**Todo:** 0.54.0

## Goal

Every free channel in `references/discoverability.md` carries the surfaces: all eleven plugins
past the Anthropic directory's validation, every applicable listing (awesome-claude-code,
awesome-reMarkable, MCP Registry, Glama, mcp.so) live, the first community posts up and
answered in-thread, the social preview set, and the first post-swap release verified — the nine
npm packuments carry their readme.

## Current state

- The law lives in `references/discoverability.md` (channels, gates, community rules, never-list) — read before any submission or post.
- The fix pass landed: npm publish door swapped (owner, G1a), repo description + five topics live (G2a, G3c), root LICENSE + plugin manifest license fields, enhansome README, homepage + pool keywords on the nine npm faces. Commits `9548bf7`..`39d5afb`.
- The npm pages still render bare — readme and manifest fields reach the registry only at the next publish.

## Next step

Dispatch the patch release (`gh workflow run release.yml -f bump=patch`) and verify the door
live: run green, and `npm view @v1nvn/<pkg> readme` non-empty for all nine published homes.

## Steps

| id | unit | model | review | consult | close criteria |
| --- | --- | --- | --- | --- | --- |
| d1 | Release check — the npm door live | | | | Run green; all nine packuments serve non-empty readme (`npm view @v1nvn/<pkg> readme`); homepage + pool keywords visible on the packuments |
| d2 | Social preview upload | owner | | | Repo unfurls render the 1280×640 lab-crop PNG (<1 MiB, solid background), set via Settings → Social media preview |
| d3 | Anthropic directory — eleven submissions | owner | | | Every plugin submitted through claude.ai/directory/manage and past Validate; listing texts + data-handling disclosures prepared per plugin; reviewer holds expected, not blocking |
| d4 | Free listings — awesome lists + MCP directories | | | | awesome-claude-code recommendation accepted (or ruled out by its gates); awesome-reMarkable PR open; readability + omlx on MCP Registry, Glama and mcp.so |
| d5 | First community posts | owner | | | r/ClaudeAI post for tokens+zai live (flair set, author answering); HN Show HN for todo as the story, author present in the thread |

## Plan

- d1 first: everything else points at pages that fill only at that publish. New packages can take up to two weeks to enter npm search — the fill is the close criterion, not search rank.
- d3: one submission per plugin folder, 10 per 24h (drafts count); the first submission owns the folder slot. Expect holds for pinned npx, lockfile pairs, hooks indirection — holds review, not reject. Each README discloses everything the plugin runs, sends and fetches (the security scan's law).
- d4: awesome-claude-code takes a human-written web issue form, one resource at a time — pick the flagship first (tokens or zai). awesome-reMarkable wants `[name](link) - description.` alphabetical, spelled "reMarkable".
- d5: post order per the pools table — tokens+zai on r/ClaudeAI (quota pain, minimal promo, no referral links), todo on HN as a first-release story. Never: vote rings, upvote asks, unflaired promo, same-link reposts.
- Sequence: d1 → d2 → d3 → d4 → d5; d2 can land any time before the first post links the repo.

## Design

- The publish door is npm's CLI — berry's 4.18.0 binary sends no readme in the publish body (verified against a local registry); the ruling record sits in the rulings page `~/.claude/rulings/discoverability-fixes/`.
- The never-list is law: no paid paths (mcp.so's $39 instant tier included), no astroturf, no fake stars.
