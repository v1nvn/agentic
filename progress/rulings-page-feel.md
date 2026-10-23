# Rulings — the page feels AI-built

**Todo:** 0.53.1

## Goal
Every defect from both audit rounds is fixed and verified on built pages (the example plus one real page, light scheme only): the page renders light-only as a one-ink document — display serif on the head and ruling titles, borderless cards, ink as the only accent, a static composer — seq text stays readable, options are native radios, and the small chrome nits are gone.

## Current state
Nothing is built yet. Both audit rounds and the frontend-design vet are triaged; every finding is ruled.

Round 1 (behavior, live-audited on example + pr291-stale-decisions + todo-grain, both schemes, 1440 and 390):

- seq text scales with pane width — 6.7px effective on mobile, up to 18.6px on desktop, from one 12.5px design font
- the page-note textarea is hidden at rest: unreachable before the first pick, while Copy's empty message names it
- a rebuilt page silently restores a dead session's picks (all `file://` pages share one localStorage origin; the key is author-chosen)
- the mobile `.where` pill duplicates the heading it floats over
- chips read `G2aneeds G1a×`; the unpick × is a ~16px touch target
- console: five note fields without id or name
- Copy never rests disabled; option seq views skip chain numbers with no ghost row; a narrow figure sits hard-left in a wide pane

Round 2 (design/style smells), all ruled:

- lean document: a scoped display serif on h1 and ruling titles — the head gets a real step over the h3s, which stop being 20px/600 twins
- weight ladder: 600 reserved for titles and the primary button; labels and tags step down — today 186 elements carry the one semibold
- HTML size ladder collapses to two steps beside the titles; the seq SVG's four small sizes (10.5/11/11.5/13) collapse with u2
- borderless cards: the sheet sits on the paper without its own border; borders stay on controls only
- one tag idiom page-wide: option tags, seq step tags and chips render the same shape
- static composer at the column's end replaces the fixed floating pill; the mobile tab dies with it; the note field is naturally always present
- options become native radios (one group per ruling): arrow keys, group semantics, `aria-pressed`-as-toggle gone; click-to-unpick stays
- microcopy: plain placeholder labels ("Note on G5"), no em-dash asides; "★ recommended" drops to one signifier
- both note kinds get persistent labels (which also clears the console's id/name issue)

Frontend-design vet (owner agreed to every amendment):

- **the accent is ink** — one-ink document; color appears only where it means a diagram category (money, store, fail); looked/pressed/disc/chip states all read ink, carried by fill, outline and weight, never by hue. Blue pencil was considered and rejected.
- **the serif is a legal-document stack**, not Georgia-by-default: `"Iowan Old Style", "Century Schoolbook", C059, Georgia, serif` — system-only, the page never fetches.
- **no broadsheet drift**: borderless ≠ newspaper — the sheet keeps its 8px radius and the paper/sheet step; the face and the ink carry the document lean, radii never go to zero.
- **no new middle dots** anywhere (the chip's `needs` separates by its own style, not `·`).
- the measure comes down from ~104 characters to ~65ch.
- h1 takes a real step (~26px) in the display face; the eyebrow stays lowercase; no all-caps labels.

## Next step
Run the thread from u1.

## Steps
| id | unit | model | review | consult | close criteria |
|---|---|---|---|---|---|
| u1 | Page renders light-only | | | | No dark tokens or `prefers-color-scheme` block remain; a built page under a dark OS renders light; README, SKILL and ARCHITECTURE carry no dark mention; suite green. |
| u4 | Document voice | opus | | | h1 sets a real step (~26px) in the display stack and ruling h3s set 20px in it; no text below the titles uses the display face; labels/tags leave 600; HTML sizes collapse to two steps beside the titles; `--measure` is ~65ch; cards render borderless on the paper with their radius kept; live look passes. |
| u5 | The option row: one accent, native radios, one tag idiom | | | | No letter-hue mapping or `--opt-a..d` remains; ink drives looked/pressed/disc/chip states with fill, outline and weight — never hue; options are real radios in one group per ruling (arrow keys move, group semantics, click still unpicks); option tags, seq step tags and chips render one idiom; a four-option ruling shows no rainbow; live look passes. |
| u2 | Seq diagrams render at fixed text size | opus | | design | On example G1 and a real seq ruling: effective seq text is at least 11px at 1440 and at 390 (horizontal scroll allowed) and never above body size; the SVG's small sizes collapse to two; measured on the rendered page. |
| u3 | Static composer | | | | The composer renders in the column flow at its end — no fixed bar, no mobile tab; picks, chips, notes and Copy still work; the note field is present at zero picks; Copy rests disabled with nothing to copy; live look passes. |
| u6 | Chrome nits | | | | The chip's `needs` separates by its own style with no middle dot and the unpick target is at least 32px; the mobile where pill shows the id only; restored picks show a one-line hint; placeholder labels are plain ("Note on G5") and both note kinds carry visible labels; console is clean. |

## Plan
- Run mechanics: no yarn 4 is reachable on this machine (no corepack on node 26, npm's registry lacks it) — every command drives the root binaries directly: `node_modules/.bin/tsc`, `node_modules/.bin/vitest`. Scoped gate per unit: `(cd packages/rulings && node ../../node_modules/.bin/vitest run < /dev/null)`. Workspace gate: both typechecks plus that scoped line's suite across the nine test-bearing packages, ceiling 4 minutes (pre-flight measured ~3; builder-owned, foreground with `timeout 240`). Background runs must close stdin — zsh stops a background job that reads it, which reads as a crash. Gate logs to `progress/.scratch/rulings-page-feel/gate-<unit id>.log`.
- Enforcement inventory: after each unit, grep the built example page for what must be gone — `prefers-color-scheme`, `--opt-`/`o-a`..`o-d`, `aria-pressed` on option rows, `★` in tag strings (u1/u5/u6 respectively); counts that must not rise: distinct computed font sizes on the built page (u4 collapses the HTML ladder), distinct weights in use; measurements no script can check — effective seq text px at 1440 and 390 (u2), the live look (u4, u5).
- Run order is the table order: u1 deletes tokens the rest no longer carry; u4 sets the type system u5 marks within.
- u1: `style.ts` holds the dark block and `color-scheme: dark`; grep SKILL.md, README.md and ARCHITECTURE.md for dark/theme mentions (SKILL Step 3's "light or dark theme" sentence, README's "system theme alone"); check `test/` snapshots for dark assumptions before rewriting them.
- u4: one `--display` token holds `"Iowan Old Style", "Century Schoolbook", C059, Georgia, serif`, scoped to h1 and `.ruling h3` only; the weight ladder and borderless cards land here in `style.ts`. The measure moves to ~65ch; the gutter/mono ids stay untouched.
- u5: `hueOf` in `html.ts` and the `o-a..d` classes across `decide.ts`, `seq.ts`, `chrome.ts` and `style.ts` are the letter-hue mapping; delete them and read the states off ink. `decide.ts`'s rows become `label` + radio `input` (name = ruling id), the disc styles off `:checked`, and `chrome.ts` keeps its click-to-unpick handler beside the radio change events. Figure views keep painting with `var(--o)`, which now resolves to ink.
- u2: `seq.ts` sets the svg `min-width`; `style.ts`'s `svg.seq { max-width: 100%; height: auto }` is the scale-to-fit — replace with fixed-size rendering inside the existing `.scroll`. The open pick: fixed size plus scroll (recommended) versus a clamped scale.
- u3: `chrome.ts`'s `panelHtml` and the `.bar` block in `style.ts`; the `rest` state and the ≤640 tab pattern die with the float.
- u6: `chrome.ts` — chip template in `render()`, `setWhere()`, labels for the two note kinds, restore-hint flag beside the picks; the ★ drops in `decide.ts`'s tag string.
- Round-1 stragglers with no unit: the ghost row for skipped chain numbers and the hard-left figure are content-shape issues in `seq.ts`/`figure.ts` — take them at the u2/u4 live looks, not as units.

## Design
- Owner rulings: light-only, ever; lean document — display serif on the head and ruling titles, borderless cards; the accent is ink (blue pencil rejected); the legal-document serif stack; no broadsheet drift, no middle dots; a static composer replacing the floating pill; native radios; every round-1 finding confirmed a defect.
- The one boldness: a one-ink document where color appears only as the diagrams' semantic plates. Everything else stays quiet.
- Open picks: u2's fixed-size-plus-scroll versus clamped scale; the tag idiom's exact shape, taken at the u5 live look; the restore hint versus a path-scoped storage key (hint recommended — per-key persistence is the designed feature, and the fault is only that a restore is invisible).
