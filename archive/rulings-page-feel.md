# Rulings — the page feels AI-built

**Todo:** 0.53.1

## Goal
Every defect from both audit rounds is fixed and verified on built pages (the example plus one real page, light scheme only): the page renders light-only as a one-ink document — display serif on the head and ruling titles, borderless cards, ink as the only accent, a static composer — seq text stays readable, options are native radios, and the small chrome nits are gone.

## Current state
Landed. All six units built green and closed on their criteria; the group review found no blocking behavior defect, and its four wording findings (stale star signifier, three em-dash asides) landed in one fix round with their pins. PR #32 carries the seven commits. Owed work kept as a bare index entry: on mobile nothing carries the removed composer tab's reach job (the sidebar count anchor is desktop-only).

## Steps
| id | unit | model | review | consult | close criteria |
|---|---|---|---|---|---|
| u1 | Page renders light-only | | | | Met — dark block, tokens and every doc mention gone; built page greps clean (dae9f6f). |
| u4 | Document voice | opus | | | Met — h1 26px/h3 20px in the legal stack on nothing else; 600 on exactly the titles and Copy; sizes 26/20/14/12.5; measure 65ch; borderless cards, radius kept (6e9d914). |
| u5 | The option row: one accent, native radios, one tag idiom | | | | Met — no letter hues; ink-only states verified by computed color; radios one group per ruling, arrows move, click unpicks; one pill idiom; four-option fixture shows no rainbow (da3e7a8). |
| u2 | Seq diagrams render at fixed text size | opus | | design | Met — scale 1 at 1440 and 390 (identical measurements, the consult's identity proof); SVG small sizes {11, 13}; ghost rows for skipped numbers; narrow diagrams centered (a041751). |
| u3 | Static composer | | | | Met — composer is the column's closing block, no float, no tab, no rest state; note field at zero picks; Copy rests disabled; sidebar count anchors to it (aee6886). |
| u6 | Chrome nits | | | | Met — need-pill separation, 32px unpick, id-only mobile pill, restore hint, visible labels with id/name (console clean), plain microcopy, one recommended signifier (1b41b50, fix 04dd1ef). |

## Plan
- Run mechanics that outlived the run: no yarn 4 is reachable on this machine — drive `node_modules/.bin/` binaries directly and close stdin on background runs. The workspace gate (both typechecks + nine suites) measures ~3 minutes.
- The u2 consult's mechanism, as built: intrinsic `width`/`height` on the svg beside the viewBox, `SCROLL_FLOOR` and `max-width: 100%` deleted, `.fig svg` untouched.

## Design
- Owner rulings this thread carried: light-only ever; lean document — the legal-document serif stack on h1 and ruling titles, borderless cards; the accent is ink (blue pencil rejected); no broadsheet drift, no middle dots; a static composer; native radios; both audit rounds' findings confirmed defects.
- Consult ruling: fixed size plus scroll — the clamped scale's window collapses to upscale-only after the size collapse, and it welds font-ladder constants into `seq.ts`.
- Picks taken along the way, all inside named scope: the schema copy tail losing its dark claim (u1); the example's inline figure weights stepping to 500 (u4); the quiet paper pill as the tag idiom (u5); "as today" ghost wording, the README clause, and `margin-inline: auto` (u2); `composerHtml` and the count anchor (u3); labels replacing placeholders and "Accept recommended" (u6); the fix round's two assertions and two snapshots moving with their reworded strings, proven byte-exact by substitution.
