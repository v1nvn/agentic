# Run costs — what a `/todo:run` costs, measured

Measured on `audit-fixes-2` (2026-10-09): 4 small units, 7 commits, 1 PR, 912+/292−
lines. Full record and method: `run-costs/` (kit README, subagent briefs, analyzer,
per-session reports).

| measure | value |
|---|---|
| wall time (excl. rate-limit stall + one 56m wait on owner) | 3h59m |
| engaged split | ~71% model thinking, ~29% tools |
| model calls / tokens | 516 / 38.4M read + 356k out (harness cost-state: 54.3M read — counts retries) |
| cache hit | 95.6% |
| read : write | 108:1 |
| standing-context re-processing | ~93% of all tokens |
| cost | $45.63 ($11.4 per unit) |
| parent context | 32k → 161k, monotone, avg ~110k over 78 calls |
| builder context-build (spawn → first edit) | 23.1m / 20.9m / 11.1m / 3.8m; state-file successors: 3.4m / 1.1m |
| root-gate overpayment | 55 root runs, 36.7m, vs scoped equivalents (2–9s observed): 27.7m |
| round-trip tax | 20 hand-backs × 37.6s parent wake; every clerk resume past cache TTL re-pays its standing context at full input |

Levers, priced:

| lever | saves time | saves tokens |
|---|---|---|
| scoped iteration gates pinned in briefs | ~27.7m/run | ~0 |
| state-file-first builder briefs | ~45m/run | ~5–6M |
| batching verify steps | ~10m/run | each dropped call skips a ~90k re-read |

Constants that hold regardless: spawn launch overhead is trivial (mean 7.1s); the
spawn injection is ~27.4k tokens (15.6% CLAUDE.md+AGENTS.md, 84.4% brief+system);
cache serves a same-prefix spawn hot; cross-agent file re-reads cost latency, not
tokens (0.17%); gates cost time, not tokens. Model routing: `sonnet` rows ran
glm-5.3-flash, default rows and the orchestrator ran glm-5.3; reviewers and the
clerk ran flash. A number's method is its session report in `run-costs/reports/`.
