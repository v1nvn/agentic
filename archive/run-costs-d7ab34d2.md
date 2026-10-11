# Run-cost audit — session d7ab34d2 (`/todo:run progress/audit-fixes-2.md`, 2026-10-09)

Subject: why 4 small units (A1–A4, 7 commits, 1 PR, 912+/292− lines) took hours.
All times UTC. Excluded from every "work" figure: rate-limit stall 05:54:31→10:14:59
(260.5m), unanswered AskUserQuestion 03:29:13→04:25:29 (56.3m). Session span 9h15m51s;
work = **3h59m**.

## Wall-clock ledger (reconciles exactly)

| bucket | minutes |
|---|---|
| parent model | 27.9 |
| parent tools | 14.5 |
| parent idle (= workers running) | 196.8 |
| excluded (stall + question) | 316.7 |

Workers filling the idle: builders 151.7 active (model 102.8 / tools 43.5 / parked 5.4),
reviewers 39.0 (model 27.9 / tools 7.0 / parked 4.1), clerk 15.0 (model 11.9 / tools 3.0),
killed A2 reviewer 1.6. Worker active exceeds parent idle by ~10.5m — agents parked on
coordinator verdicts while another ran. Per unit: A1 ≈ 68m, A2 ≈ 44m, A3 ≈ 71m, A4 ≈ 17m.

Engaged time splits ~171m model vs ~69m tools (71%/29%). Harness `cost-state`:
API duration 210.6m vs tool duration 33.5m (6.3:1). Builders' model time is 96.8m
queue-wait vs 6.0m streaming — 16:1 thinking:generating.

## Timeline

| window | phase | wall |
|---|---|---|
| 02:49:51–02:58:29 | open: rules+plan, baseline gate, branch, commit 3642bfc, spawn A1 | 8.6m |
| 02:57:45–03:25:51 | A1 build rd 1 — ctx-build 23.1m, first edit 03:20:53, impasse | 28.1m |
| 04:26:45–04:39:30 | A1 rd 2 after owner ruling | 12.7m |
| 04:41:50–04:45:02 | clerk 1 → PASS | 3.2m |
| 04:46:27–04:55:00 | A1 blind review → 1 note | 8.5m |
| 04:57:03–05:10:47 | A1-ext successor (two double-suite commands) | 13.7m |
| 05:11:50–05:13:35 | clerk 2, commits 4cae0cb + 33dbbd4 | 1.7m |
| 05:15:21–05:47:40 | A2 build — ctx-build 20.9m, edit 10.5m | 32.3m |
| 05:48:24–05:52:59 | clerk 3, commit 02638a7 | 3.2m |
| 05:52:34–05:54:11 | A2 review #1 → killed by 429 | 1.6m |
| 10:15:38–10:22:51 | A2 review #2 → 0 findings | 7.2m |
| 10:23:45–11:09:38 | A3 build — ctx 11.1m, 13 root suites, 1 coordinator round | 45.8m |
| 11:10:47–11:14:11 | clerk 4, commit 6cbcdd0 | 3.4m |
| 11:15:46–11:25:38 | A3 review → 1 minor (dead `scan` field) | 9.9m |
| 11:26:25–11:41:16 | A3 fix rd 1 → re-review "incomplete" → fix rd 2 → verdict | 13.6m |
| 11:42:09–11:51:28 | A4 build — ctx 3.8m | 9.3m |
| 11:52:14–11:55:40 | clerk 5, commit 8a68ef9 | 3.4m |
| 11:56:32–12:00:17 | A4 review → 0 findings | 3.8m |
| 12:00:17–12:02:34 | close: archive, commit d1ead83, push, PR 17 | 2.3m |

## Token ledger (transcript-derived; harness cost-state in brackets)

| measure | value |
|---|---|
| model calls | 516 [cost-state implies more incl. unbilled retries] |
| input (cache miss) | 1.67M [cost-state 1.90M] |
| cache read | 36.7M [cost-state 54.3M — retries re-send context] |
| output (incl. thinking) | 356k [cost-state 360k] |
| thinking (block-measured) | 248k ≈ 70% of output |
| cache hit | 95.6% [96.6%] |
| read : write | 108:1 [156:1] |
| standing-context re-processing | ~92–95% of all tokens |
| cost | $45.63 = glm-5.3 $24.81 + glm-5.3-flash $20.82 + glm-4.5-air $0.004 |

Per-agent highlights: parent 78 calls, context 31,967 → 160,842 monotone, avg ~110k.
A3 builder 101 calls avg 90.5k = 9.05M for a dead-code sweep. Spawn injections ~27.4k
(15.6% CLAUDE.md+AGENTS.md, 84.4% brief+system+tools); 4 of 12 spawned warm and got
the injection cache-served (~3.9k fresh). Four cache collapses re-read 418k at full
price (parent post-stall 108k, parent post-idle 127k, A1 post-ruling 92k, A3 mid-run
81k). Every clerk resume round landed past TTL and re-paid standing context at full
input (27.5k → 56k across its 5 bursts).

Model routing: plan rows marked `sonnet` (A2, A3, A3-fix) ran glm-5.3-flash; default-tier
rows and parent ran glm-5.3. Reviewers and clerk ran flash although `run/SKILL.md` says
the reviewer takes the default.

## Builder context-build (spawn → first Edit)

| builder | ctx-build | calls | ingested |
|---|---|---|---|
| A1 | 23.1m | 34 | 1.50M |
| A2 | 20.9m | 50 | 2.61M |
| A3 | 11.1m | 39 | 1.98M |
| A4 | 3.8m | 20 | 764k |
| A1-ext (state file) | 3.4m | 10 | 232k |
| A3-fix (state file, no plan read) | 1.1m | 6 | 190k |

97.6% of ctx-phase ingestion is calls 2..n re-processing the growing context, not the
spawn injection (2.4%). Harness launch overhead is trivial (12 spawns, mean 7.1s).

## Waste ledger

| class | detail | min |
|---|---|---|
| root-gate overpayment | 55 root runs 36.7m vs scoped equivalents (scoped = 2–9s observed) | 27.7 |
| — identical-output re-runs | 5 full suites byte-identical to previous run | 5.2 |
| — exact-duplicate pipeline | A3's `yarn test \| grep…` ×8 | 6.4 |
| — suite twice in one command | A1-ext 05:03 (129.6s), 05:05 (118.9s) | 2.1 |
| killed A2 reviewer | 429; 317k tok discarded + 253k re-paid by rerun | 1.6 |
| aborted gate chain | A4 lint fail | 0.2 |
| **directly priced** | | **29.5** |
| builder ctx-build (floor 1–4m via state files) | 63.5m spent | ~45 avoidable |
| round-trip tax | 20 hand-backs × 37.6s parent wake | 12.5 |
| cross-agent re-reads | 165 events, plan ×11 agents — 0.17% of tokens | latency only |

Clean bills: no sleep/poll loops, cache otherwise warm, git/gh clean (113 calls, 3
repeats), clerk never ran the root suite, reviewers re-ran only 6m of builder gates.

## Method

`references/run-costs/` — README (pipeline + parsing law), prompts/ (the subagent
briefs verbatim), scripts/analyze.py (deterministic core; reproduces every anchor
above), this record.
