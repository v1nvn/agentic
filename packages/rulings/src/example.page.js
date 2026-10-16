var PAGE = {
  eyebrow: "testril, PR 251, native-functions 6",
  title: "PR 251 rulings",
  key: "rulings-testril-pr251",
  sub: "What to do about the review findings that are real. Nothing is written until you rule.",

  notes: [
    { html: "<b>Not rulings: two findings are decided.</b> Finding 1 is false: a band opens only on landed blocks (<code>store.rs:332-390</code>). Finding 2 is ruled: dev databases reset." }
  ],

  groups: [
    { id: "money", label: "What a buyer is owed", quick: true, rulings: ["G1", "G3"] },
    { id: "code", label: "A code change", rulings: ["G2"] },
    { id: "ops", label: "What a restart does", rulings: ["G4"] },
    { id: "serving", label: "What a start refuses", rulings: ["G5"] }
  ],

  rulings: {
    G1: {
      title: "Who owns a leaf block inside its reader’s window?",
      stake: "<b>In every tree, a read of 10 blocks Paul paid for pays no owner, and no surface shows it.</b>",
      today: "Paul buys a reader on a leaf. The daemon records an owner for each block it builds, called a <b>band</b>. A read pays half its fee to the band, which stops where the reader’s window starts.",
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
          code: 'function quiet(\n  command: Command,\n  onUsageError: (command: Command) => void,\n): void {\n  command.configureOutput({\n    writeOut: () => undefined,\n    writeErr: () => undefined,\n  });\n  command.exitOverride(err => {\n    const code = (err as { code?: string }).code;\n    if (code === \'commander.help\' || code === \'commander.helpDisplayed\') {\n      throw new HelpRequested(command);\n    }\n    onUsageError(command);\n    throw err;\n  });\n  command.commands.forEach(c => {\n    quiet(c, onUsageError);\n  });\n}\n\nexport function parseCli<T = HelpRequested>(\n  spec: CliSpec,\n  argv: readonly string[],\n  onHelp?: CliHelpHook<T>,\n  onUsageError?: (command: Command, err: Error) => void,\n): CliInvocation | HelpRequested | T | undefined {\n  let invocation: CliInvocation | undefined;\n  const program = materialize(spec, found => {\n    invocation = found;\n  });\n  let errored: Command | undefined;\n  quiet(program, command => {\n    errored = command;\n  });\n  try {\n    program.parse([...argv], { from: \'user\' });\n  } catch (err) {\n    if (!(err instanceof HelpRequested)) {\n      if (errored !== undefined) {\n        const cause = err instanceof Error ? err : new Error(String(err));\n        onUsageError?.(errored, cause);\n      }\n      return undefined;\n    }\n    return onHelp !== undefined\n      ? onHelp(err.command.name(), err.command.helpInformation())\n      : err;\n  }\n  return invocation;\n}',
          cap: "From <code>core/src/cli.ts:139-189</code>, the walk and its caller. Each option below marks only the lines it changes."
        },
        a: {
          lang: "ts",
          code: 'function quiet(\n  command: Command,\n  onUsageError: (command: Command) => void,\n): void {\n  command.configureOutput({\n    writeOut: () => undefined,\n    writeErr: () => undefined,\n  });\n  command.commands.forEach(c => {\n    quiet(c, onUsageError);\n  });\n}\n\nexport function parseCli<T = HelpRequested>(\n  spec: CliSpec,\n  argv: readonly string[],\n  onHelp?: CliHelpHook<T>,\n  onUsageError?: (command: Command, err: Error) => void,\n): CliInvocation | HelpRequested | T | undefined {\n  let invocation: CliInvocation | undefined;\n  const program = materialize(spec, found => {\n    invocation = found;\n  });\n  let errored: Command | undefined;\n  quiet(program, command => {\n    errored = command;\n  });\n  try {\n    program.parse([...argv], { from: \'user\' });\n  } catch (err) {\n    if (!(err instanceof HelpRequested)) {\n      if (errored !== undefined) {\n        const cause = err instanceof Error ? err : new Error(String(err));\n        onUsageError?.(errored, cause);\n      }\n      return undefined;\n    }\n    return onHelp !== undefined\n      ? onHelp(err.command.name(), err.command.helpInformation())\n      : err;\n  }\n  return invocation;\n}',
          cap: "Only the exitOverride block is removed; every other line is unchanged."
        },
        b: {
          diff: false,
          state: "sketch",
          code: 'parseQuietly(program, args, err =>\n  err instanceof HelpRequested\n    ? { help: err.command }\n    : commanderCode(err) === "commander.helpDisplayed"\n      ? { help: currentCommand(program) }\n      : undefined,\n)',
          cap: "Shown whole rather than marked line by line: it is not the same code as today’s walk."
        }
      },
      opts: [
        { k: "a", rec: true, needs: "G1a", t: "Drop the clobbering exitOverride() call", g: "The caller’s override fires again; subcommand help prints itself; three red tests pass.", c: "The silent default override goes; none of the six parseQuietly callers relies on it." },
        { k: "b", t: "Keep the clobber; classify the error in recover", w: "recover already maps commander error codes to ink replies; this adds one arm — helpDisplayed re-renders the failing command’s own usage instead of the root usage.", g: "No shared-code change; statusline’s recover learns the helpDisplayed code on its own.", c: "The trap stays set; every future CLI that installs an override re-learns it." }
      ]
    },

    G3: {
      title: "Should the reader’s window mint its own leaf band?",
      merged: "G1",
      changed: "Same money question as G1 — whether the window owns its leaf blocks is what option b there rules."
    },

    G4: {
      title: "Who re-arms a reader’s window after a daemon restart?",
      stake: "<b>Roughly 1 daemon restart a week lands mid-read; each one pays a leaf read’s holder half into the void until a human notices.</b>",
      today: "The window lives only in the daemon’s memory. After a crash the console shows the reader with no window; whoever is on call reads the ledger, rebuilds the range by hand, and the next read pays the band again.",
      seq: {
        lanes: ["Daemon", "Postgres", "Reader", "On call"],
        ledger: ["Windows\narmed"],
        start: [1],
        steps: [
          { f: 0, t: 0, k: "fail", x: "daemon restarts mid-read", s: "the window lives only in the daemon’s memory", b: [0] },
          { f: 0, t: 1, k: "store", x: "daemon re-arms the window from Postgres", s: "one more table the daemon owns", b: [1], in: ["a"] },
          { f: 2, t: 2, k: "money", x: "the read pays the holder half into the void",
            o: { a: { x: "the read pays the band", n: "the window survived the restart" },
                 b: { x: "the read re-arms the window, then pays the band", b: [1], n: "one extra write per read" } } },
          { f: 3, t: 0, k: "call", x: "a human rebuilds the window from the console", b: [1],
            o: { a: { a: "del" }, b: { a: "del" } } }
        ],
        cap: "<b>Today a crash loses the window; the read pays into the void until a human rebuilds it.</b>",
        caps: { a: "<b>Option a: the daemon re-arms its windows from Postgres on start.</b> No void window.", b: "<b>Option b: the read re-arms the window before paying.</b> One extra write per read." }
      },
      opts: [
        { k: "a", rec: true, t: "The daemon re-arms its windows from Postgres on start", g: "The window survives a restart; reads never pay into the void and no human is in the loop.", c: "One more table the daemon owns and migrates; the start sequence grows a step." },
        { k: "b", t: "The read re-arms the window before paying", w: "The read already opens a transaction on the leaf rows; arming the window there is one more write on the same connection, with no new owner of state.", g: "The protocol fixes itself; no daemon change at all.", c: "Every read pays one extra write — about 40 a day at current traffic." }
      ]
    },

    G5: {
      title: "Should the daemon refuse to serve when its start check fails?",
      stake: "<b>Every daemon start runs 1 ledger check whose failure stops nothing: readers pay into a ledger the daemon itself doubted, and a log line is the only sign.</b>",
      today: "At start the daemon checks its ledger once and logs a line when the check fails. It serves either way; the check decides nothing.",
      diagram: {
        cap: "<b>Today a failed check is a log line; the daemon serves anyway.</b>",
        views: {
          today: {
            text: 'flowchart TD\n  S[start] --> C{ledger check passes?}\n  C -- yes --> V[serve reads]\n  C -- no --> L[log a line] --> V'
          },
          a: {
            cap: "<b>Option a: a failed check stops the daemon before its first read.</b> The on-call sees the exit, not a log line.",
            text: 'flowchart TD\n  S[start] --> C{ledger check passes?}\n  C -- yes --> V[serve reads]\n  C -- no --> X[exit non-zero]'
          }
        }
      },
      opts: [
        { k: "a", rec: true, t: "Refuse to serve when the check fails", g: "The on-call sees a dead daemon with a reason, not a log line to find.", c: "One flaky check now stops every read until a human restarts the daemon." },
        { k: "b", today: true, t: "Keep serving on a failed check", g: "Reads continue; a flaky check cannot take the daemon down.", c: "The only sign of a doubted ledger is a log line nobody is tailing." }
      ]
    }
  }
};
