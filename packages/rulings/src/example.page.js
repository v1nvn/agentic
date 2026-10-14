var PAGE = {
  eyebrow: "testril, PR 251, native-functions 6",
  title: "PR 251 rulings",
  sub: "What to do about the review findings that are real. Nothing is written until you rule.",

  notes: [
    { html: "<b>Not rulings: two findings are decided.</b> Finding 1 is false: a band opens only on landed blocks (<code>store.rs:332-390</code>). Finding 2 is ruled: dev databases reset." }
  ],

  groups: [
    { id: "money", label: "What a buyer is owed", rulings: ["G1", "G3"] },
    { id: "code", label: "A code change", rulings: ["G2"] }
  ],

  rulings: {
    G1: {
      title: "Who owns a leaf block inside its reader’s window?",
      stake: "<b>In every tree, a read of 10 blocks Paul paid for pays no owner, and no surface shows it.</b>",
      today: "Paul buys a reader on a leaf. The daemon records an owner for each block it builds, called a <b>band</b>. A read pays half its fee to the band. The leaf’s band stops where the reader’s window starts.",
      seq: {
        lanes: ["Paul", "Daemon", "Postgres", "Vineet"],
        ledger: ["Leaf blocks\nPaul owns", "Leaf blocks\nnobody owns", "Paul earns\nfrom the read"],
        start: [0, 0, 0],
        steps: [
          { f: 0, t: 1, k: "money", x: "pays 2,400 for the reader [40, 50)", s: "20 blocks: [30, 50)" },
          { f: 1, t: 2, k: "store", x: "leaf rows land [30, 50)", s: "band only below the window: [30, 40)", b: [10, 10, null],
            o: { b: { x: "leaf rows land [30, 50)", s: "bands [30, 40) and [40, 50)", b: [20, 0, null], n: "the in-window blocks get a leaf band too" } } },
          { f: 1, t: 2, k: "store", x: "reader rows land [40, 50)", s: "band: reader [40, 50)" },
          { f: 3, t: 1, k: "money", x: "reads leaf rows [40, 50) and pays" },
          { f: 1, t: 1, k: "money", x: "holder half: no band, the protocol keeps it", b: [null, null, 0],
            o: { b: { x: "holder half goes to Paul’s leaf band", b: [null, null, "½ fee"] } } }
        ],
        cap: "<b>Today 10 paid leaf blocks have no owner.</b> A read of them pays no holder.",
        caps: { b: "<b>Option b: all 20 paid leaf blocks have an owner.</b> The read pays Paul." }
      },
      opts: [
        { k: "a", rec: true, today: true, t: "Keep one band per paid block, as ruled in 6.5", g: "No money rule changes. The four 6.5b tests stay.", c: "The stake stays. The plan records the gap." },
        { k: "b", t: "The leaf also gets a band inside the window", g: "Every paid block has an owner. Reads of <code>pool_list</code> inside a swap window pay the buyer.", c: "A new money rule in two crates: one block’s cost splits over two bands." }
      ]
    },

    G2: {
      title: "Should core stop replacing a caller’s exit handler?",
      stake: "<b>Every subcommand help request in statusline, tokens and zai prints the root usage and exits 1.</b>",
      today: "Every command first runs through core’s <code>parseQuietly</code>, so a bad flag prints no stack trace. It mutes output and calls <code>exitOverride()</code> on each command. That call replaces the handler the caller set.",
      bodies: {
        today: {
          lang: "ts",
          what: "The quiet walk core runs on every command, today.",
          code: 'function quiet(command: Command): void {\n  command\n    .allowExcessArguments(false)\n    .exitOverride()\n    .configureOutput({\n      writeOut: () => undefined,\n      writeErr: () => undefined,\n    });\n  command.commands.forEach(quiet);\n}',
          cap: "From <code>core/src/cli.ts:8-17</code>. The engine computes and tints the delta against each option."
        },
        a: {
          lang: "ts",
          code: 'function quiet(command: Command): void {\n  command\n    .allowExcessArguments(false)\n    .configureOutput({\n      writeOut: () => undefined,\n      writeErr: () => undefined,\n    });\n  command.commands.forEach(quiet);\n}',
          cap: "Write the after-code in full; the engine computes and tints the delta. A long unchanged run collapses on its own."
        },
        b: {
          diff: false,
          state: "sketch",
          code: 'parseQuietly(program, args, err =>\n  err instanceof HelpRequested\n    ? { help: err.command }\n    : commanderCode(err) === "commander.helpDisplayed"\n      ? { help: currentCommand(program) }\n      : undefined,\n)',
          cap: "A sketch: feasibility not checked. diff: false keeps side-by-side snapshots when the pair is not the same code."
        }
      },
      opts: [
        { k: "a", rec: true, needs: "G1a", t: "Drop the clobbering exitOverride() call", g: "The caller’s override fires again. Subcommand help prints subcommand help; three red tests go green.", c: "Any caller relying on the silent default override loses it; none exists today, checked across the six parseQuietly callers." },
        { k: "b", t: "Keep the clobber; classify the error in recover", w: "recover already maps commander error codes to ink replies; this adds one arm — helpDisplayed re-renders the failing command’s own usage instead of the root usage.", g: "No shared-code change; statusline’s recover learns commander’s helpDisplayed code on its own.", c: "The trap stays set for the next caller that installs an override. Every future CLI re-learns it." }
      ]
    },

    G3: {
      title: "Should the reader’s window mint its own leaf band?",
      merged: "G1",
      changed: "Same money question as G1 — whether the window owns its leaf blocks is what option b there rules."
    }
  }
};
