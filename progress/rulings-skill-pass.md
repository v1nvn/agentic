# Rulings — skill pass: authoring friction and the quick bridge

## Goal

The consult skill mints a page from evidence the consulting agent
already holds: every ruling is title, stake, `today` and the verdict
table; a picture is depth a ruling earns. The build has one tier —
every check that survives is precise and blocks. No length budget is
enforced anywhere. Every change checks against the floors in
`packages/rulings/ARCHITECTURE.md`. Shipped as a release with the
exemplar rebuilt on it and a timed mint inside the target.

## Current state

U1 landed (`b7f6117`): table-only render closed on review — every
criterion met, snapshot diffs enumerated to the plan's shapes, no
blocking findings. U2 (validator cull) is in flight; nothing else is
built. Open nits, queued for the group's sweep: the plan amendments
rode U1's build commit — the orchestrator's words from the consult,
the builder wrote no law (confirmed; nothing to fix); the row's
literal "screenshot" artifact is a recorded live run, which the
owner's verification rule accepts (waived).

Evidence the remaining units rest on:

- Building the six live `page.js` (`~/.claude/rulings/*`, copied to
  scratch, from source) emits ~140 warnings: ~115 the 90-char
  fragment cap, ~22 the three-sentence `today` cap, 1 the ten-ruling
  cap. Stake-digit, today/today overlap, stake/today overlap and
  VAGUE fire zero times.
- `<b>Option a:`-style caption openers occur 72 times across the live
  pages; of the seed-and-SKILL five, U2 rewords the seed's four and
  U3 owes SKILL's one.
- The from-source door works only after `yarn install` at the root.

## Next step

U2 is in flight; on its green report commit it, dispatch its reviewer
beside U3's builder.

## Steps

| id | unit | model | review | consult | close criteria |
| --- | --- | --- | --- | --- | -------------- |
| U1 | table-only render — no picture region without a picture, `w` moves to the verdict row | sonnet | | design | One snapshot test: a page with one table-only ruling (title, stake, `today`, opts; no `seq`/`bodies`/`diagram`) builds green; its section holds no `.compare` and no `.stage-wrap`; each option's `w` occurs once, inside its `.vrow`; the pictured snapshots change only by `w` moving; the picture gate applies only to rulings that carry a picture, its table-only error text deleted; a screenshot of the table-only ruling viewed — pick, unpick, none row, note, composer and reload persistence work — landed `b7f6117` |
| U2 | validator cull — one tier, errors only | sonnet | | | `FRAGMENT`, `TODAY_SENTENCES`, `LONG_LINE` and their checks and tests deleted; stake-digit, today/today overlap, stake/today overlap and the `diff:false` hint deleted; `Verdict` carries errors only and `grep -c "warnings" src/` is 0; the checks that remain block: VAGUE, identical body, stake `<code>`, seq exact-flow equality, more than ten rulings, and `conclusionFirst` on every caption — ruling, per-view `caps.<letter>` and `views.<k>.cap` — rejecting `/^<b>\s*option\s+[a-z]\s*[:—-]/i` while "Today …" leads pass; `cli.ts` prints errors only; the seed builds with no output — its four `<b>Option …` openers (example.page.js:38, 99×2, 118) are reworded in this unit, the new regex blocking them (U3's grep then owes only SKILL's one) |
| U3 | the law — SKILL, README, ARCHITECTURE, seed | sonnet | | | Step 3 is the ordered kind-law and the depth law (Plan, verbatim in substance); Step 0 carries the orientation rule (Plan); Step 5 states the one-pass mint; no surface says every ruling has a picture — frontmatter description and trigger, intro, Step 2 gate, Step 4 picture bullet, fields table, Never list, README, ARCHITECTURE opening; every length-cap sentence deleted (SKILL Step 2, Step 4 ×2, fields table, Bodies), "keep it short, no cap" stays; "treat each warning as a fault" deleted; the placeholder law says `&lt;pools&gt;` in HTML fields; `w` documented as the row's muted line; `grep -in "option [a-d]:" SKILL.md src/example.page.js` is 0; seed G5 is table-only — tests pinning G5's diagram (schema.test.ts:188-195 today-view pin; pictures.test.ts diagram stage snapshots) migrate to synthetic pictured fixtures, keeping the diagram kind tested; README carries `yarn install && node packages/rulings/src/index.ts <dir>`; SKILL.md ends shorter than its 267 lines |
| U4 | release, exemplar, timed mint | sonnet | none | | Released per `references/npm-publishing.md` at the semver step the owner picks; `agentic-open-surfaces` rebuilt on the published pin and opened; a fresh sonnet subagent, given a held brief of four decisions, mints a page on the published pin in ≤ 10 minutes wall-clock, the time recorded here |

## Plan

- **Depth law (U3, Step 3).** Every ruling is title, stake, `today`,
  verdict table. A picture is added only when a gain or cost cannot be
  checked from its fragment alone: a code change gets `bodies` —
  today's body and one per option, diffed; an order of steps or a
  moving balance gets `seq`; `diagram` only when neither can draw it,
  its caption saying in one line why. When every fragment names a
  thing the owner can check without a body (a file, a flag, a number),
  the ruling is table-only. Receipts: "It overly (almost always) uses
  the flow charts even though it is not required… or even no visuals
  might make more sense" (10-07); "Maybe show code diff" (10-12); "I
  would prefer code diff in before/after of all" (10-14).
- **Orientation rule (U3, Step 0).** Orient in chat — today in plain
  words, one real case through its states, the root question if
  linked — then build in the same turn when the owner asked for the
  page; wait for "go?" only when the page is the agent's idea or picks
  change each other's options. Orientation came from ~8 sessions of "I
  don't understand… show me today first" (10-08); the round trip, not
  the orientation, is the latency.
- **One-pass mint (U3, Step 5).** `--new`, write `page.js` whole from
  the fields table, build; a second build only on red.
- **Why one tier.** After the cull every check is exact, so a warning
  tier has nothing left that may be ignored; SKILL already calls
  warnings faults and the CLI exits 0 on them — two meanings, now one.
- **Rendering (U1 — design consult ruled, one unit).** `w` is
  per-option data (`opt.w`, schema.ts:76); only the render site moves.
  `verdictTable` (html.ts:55-89) emits `<span class="how">${o.w}</span>`
  as the row's last child when `o.w` is set, after the `.vc` span; the
  four picture-emitter `w` terms (seq.ts:269+273, bodies.ts:156+159 and
  174+177, diagram.ts:17+21) and their now-unused `optOf` imports are
  deleted — `optOf` keeps its one caller, page.ts:136. CSS: the
  `.stage .how` half of style.ts:131 goes, a muted `.vrow .how` rule
  (`grid-column: 2 / -1`, 12.5px) arrives. `viewsOf` (page.ts:108-120)
  returns `[]` when `seq`, `bodies` and `diagram` are all undefined;
  `compareOf` returns `''` on empty views — no `.compare`, no
  `.stage-wrap`; `rulingSection` is otherwise untouched. The gesture
  degrades in one place: `show()`'s first guard (chrome.ts:66-79)
  gains the nothing-to-show early return (consult's shape:
  `if (!u || !view || u.w.length === 0) return;`), which covers
  `restoreViews` (:80-93) too; the row click (:203-213) still picks.
  A chrome.test.ts pin builds a wrapless section: a row click picks
  (storage, chip) and never sets `shown`/`aria-current`. Picture gate
  (schema.ts:448-459): `pictured = present.length > 0` off the
  schema.ts:354-359 array; the whole `shown` check runs only when
  pictured; the non-today branch text stays byte-identical (pinned by
  schema.test.ts:182-186 untouched); the today branch text becomes
  `${nm} is today, but the picture has no today view`, pinned by a
  schema.test.ts case deleting G5's diagram today view. Fixture:
  `TABLE_PAGE` beside `PLAIN_PAGE` (build.test.ts:24), one ruling,
  two opts — one `rec`, one `today: true` — both with distinct `w`
  strings. The test: `main([dir, '--no-open'])` returns 0 (red today
  on the picture error), then the sliced `r-G1` section — snapshot on
  the slice, `vtable` present, no `compare`, no `stage-wrap`, each
  `w` text exactly once in the whole html, no `<p class="how">`.
  Snapshot diffs carry only three shapes: the CSS line edit plus the
  new `.vrow .how` rule; each `<p class="how">` leaving a stage; each
  `<span class="how">` entering its option's `.vrow`, same text. The
  whole-page entry also carries the changed `show()` guard text
  through the inlined page script — mechanically forced, the same
  class as the CSS hunk.
  build.test.ts:155 stays (now pins the new site); build.test.ts:157-162
  and pictures.test.ts:148-159 are deleted with the old home;
  pictures.test.ts:195-196 drop their two `how` assertions, the
  sketch-chip assertions stay; build.test.ts:394,476-524,845 and
  pictures.test.ts:24-34 stay green untouched.
- **Live pages** are the owner's artifacts outside the repo: only the
  exemplar is rebuilt; the rest rebuild when next touched and meet the
  new errors then.
- **Small rows:** U4 — release mechanics, no code; review is none
  because it changes no code, the release checklist and the timed mint
  guarding it.
- **Tactical map.** Re-read before editing. `schema.ts`: caps `:6-8`,
  VAGUE `:11-12`, `conclusionFirst` `:193-197` (called only `:212`,
  `:407`), caps keys `:247-251`, pair similarity `:284-305`, today
  `:325-334`, stake `:335-353`, one picture `:354-364`, bodies
  `:370-401`, diagram `:402-415`, picture gate `:448-459`, fragment
  `:473-478`, ten rulings `:491-495`. `page.ts`: `viewsOf` `:108-120`,
  `compareOf` `:132-147` (`optOf`'s one caller `:146` post-U1), `rulingSection`
  `:148-175`. verdictTable `html.ts:55-89` (`.vc` span `:74`). `w`
  terms at `seq.ts:269,273`, `bodies.ts:156,159,174,177`,
  `diagram.ts:17,21`. `show()` `chrome.ts:66-79`, `restoreViews`
  `:80-93`, row click `:203-213`, `answerText` `:284-292`; `.stage .how`
  `style.ts:131`, vrow grid `:115`. `cli.ts:67-70` (warnings print).
  Tests (consult-corrected): snapshots `build.test.ts:139-164` (`:142`
  whole page) and `pictures.test.ts:38-59,163-197,242-251` (`:191` the
  only `w`-bearing stage); `build.test.ts:394,476-524,845` (warning
  suites — U2 deletes them) and `pictures.test.ts:24-34` (green seed)
  stay untouched in U1; `schema.test.ts:123-171,182-186,306-323`
  (188-195 is U1's today-view pin). SKILL:
  Step 0 `:19-32`, Step 2 cap `:53`,
  placeholder `:58-59`, Step 3 `:65-84`, Step 4 `:96-115`, Step 5
  `:131`, fields `:210-212`, seq example `:229`, bodies cap `:248`,
  Never `:267`. Scoped gate `yarn workspace @v1nvn/rulings run test`;
  workspace gates `yarn test` then `yarn typecheck`, ceiling 1 min
  (pre-flight: green, 56 s).
- **Enforcement inventory.** Exactly one recommended option, always;
  the answer format string stays byte-identical; `today` stays
  required; files touched come out with fewer comment lines. Plan
  edits ride the orchestrator's commits only — no build commit amends
  the plan it is judged against (U1 review's finding shape).
- **Open question for the owner (U4).** The semver step: the cull
  turns surviving warnings into errors, so an old `page.js` with an
  `Option a:` caption or more than ten rulings fails on rebuild.

## Design

- **Bridge ruling (owner, amended this sitting).** One door,
  per-ruling depth: title, stake, `today` and the verdict table are
  the mandatory spine; a picture is earned. `today` stays required
  (owner). Rejected: no bridge (4+ linked mid-conversation decisions
  pay the report tax; chat's question tool has no none-row, notes or
  persistence), a second door (two paths for one job).
- **No length budgets (owner, 10-08, reaffirmed this sitting).** "I
  don't think we should do word budgets… no hard cap but try to keep
  it short." All three caps go; the two-sentence `today` fold stays —
  it is layout, not a cap.
- **Mint latency target (agent).** ≤ 10 minutes for a four-decision
  page from a held brief: good mints in history took 6–15 minutes
  after their research, the failed 10-16 sample took 35.
- **The goal.** A quick bridge between the agent and whoever rules;
  comprehension first, the pick falls out of getting it; latency is
  contract. The floors live in `packages/rulings/ARCHITECTURE.md`.
- The composer's Copy button has zero recorded uses (answers are typed
  in chat); it stays — on the record, not in scope.
- Accepted limit: a ruling that turns on both code and money still
  bends into one picture kind.
- "Quick bridge" as a named thing never ships; there is just the
  skill.
