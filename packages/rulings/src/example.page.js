var PAGE = {
  eyebrow: 'testril, PR 251, native-functions 6',
  title: 'PR 251 rulings',
  key: 'rulings-testril-pr251',
  sub: 'What to do about the review findings that are real. Nothing is written until you rule.',

  decided: [
    'Finding 1 is false: a band opens only on blocks that landed.',
    'Finding 2 is ruled: dev databases reset.',
  ],

  rulings: {
    G1: {
      title: 'Who owns a leaf block inside its reader’s window?',
      stake:
        'In every tree, a read of 10 blocks Paul paid for pays no owner, and no surface shows it.',
      seq: {
        lanes: ['Paul', 'Daemon', 'Postgres', 'Vineet'],
        ledger: [
          'Leaf blocks\nPaul owns',
          'Leaf blocks\nnobody owns',
          'Paul earns\nfrom the read',
        ],
        start: [0, 0, 0],
        steps: [
          {
            f: 0,
            t: 1,
            k: 'money',
            x: 'pays 2,400 for the reader [40, 50)',
            s: '20 blocks: [30, 50)',
          },
          {
            f: 1,
            t: 2,
            k: 'store',
            x: 'leaf rows land [30, 50)',
            s: 'band only below the window: [30, 40)',
            b: [10, 10, null],
            o: {
              b: {
                x: 'leaf rows land [30, 50)',
                s: 'bands [30, 40) and [40, 50)',
                b: [20, 0, null],
                n: 'the in-window blocks get a leaf band too',
              },
            },
          },
          {
            f: 1,
            t: 2,
            k: 'store',
            x: 'reader rows land [40, 50)',
            s: 'band: reader [40, 50)',
          },
          { f: 3, t: 1, k: 'money', x: 'reads leaf rows [40, 50) and pays' },
          {
            f: 1,
            t: 1,
            k: 'money',
            x: 'holder half: no band, the protocol keeps it',
            b: [null, null, 0],
            o: {
              b: {
                x: 'holder half goes to Paul’s leaf band',
                b: [null, null, '½ fee'],
              },
            },
          },
        ],
        cap: '<b>Today 10 paid leaf blocks have no owner.</b> A read of them pays no holder.',
        caps: {
          b: '<b>All 20 paid leaf blocks have an owner.</b> The read pays Paul.',
        },
      },
      opts: [
        {
          k: 'a',
          rec: true,
          today: true,
          t: 'Keep one band per paid block, as ruled in 6.5',
        },
        { k: 'b', t: 'The leaf also gets a band inside the window' },
      ],
      rows: [
        {
          on: 'stake',
          label: 'Every paid leaf block has an owner',
          marks: {
            a: [
              'cost',
              '10 of the 20 paid leaf blocks pay no owner; the plan records the gap.',
            ],
            b: [
              'gain',
              'All 20 have an owner; a read inside the window pays Paul.',
            ],
          },
        },
        {
          on: 'beyond',
          label: 'Money rules that change',
          marks: {
            a: ['gain', 'None; the four 6.5b tests stay.'],
            b: [
              'cost',
              'A new rule in two crates: one block’s cost splits over two bands.',
            ],
          },
        },
      ],
      why: 'a, because <i>money rules that change</i> stay at none; it pays in <i>every paid leaf block has an owner</i>.',
    },

    G2: {
      title: 'Should core stop replacing a caller’s exit handler?',
      stake:
        'Every subcommand help request in statusline, tokens and zai prints the root usage and exits 1.',
      bodies: {
        today: {
          lang: 'ts',
          what: 'The quiet walk core runs on every command, today.',
          code: "function quiet(\n  command: Command,\n  onUsageError: (command: Command) => void,\n): void {\n  command.configureOutput({\n    writeOut: () => undefined,\n    writeErr: () => undefined,\n  });\n  command.exitOverride(err => {\n    const code = (err as { code?: string }).code;\n    if (code === 'commander.help' || code === 'commander.helpDisplayed') {\n      throw new HelpRequested(command);\n    }\n    onUsageError(command);\n    throw err;\n  });\n  command.commands.forEach(c => {\n    quiet(c, onUsageError);\n  });\n}\n\nexport function parseCli<T = HelpRequested>(\n  spec: CliSpec,\n  argv: readonly string[],\n  onHelp?: CliHelpHook<T>,\n  onUsageError?: (command: Command, err: Error) => void,\n): CliInvocation | HelpRequested | T | undefined {\n  let invocation: CliInvocation | undefined;\n  const program = materialize(spec, found => {\n    invocation = found;\n  });\n  let errored: Command | undefined;\n  quiet(program, command => {\n    errored = command;\n  });\n  try {\n    program.parse([...argv], { from: 'user' });\n  } catch (err) {\n    if (!(err instanceof HelpRequested)) {\n      if (errored !== undefined) {\n        const cause = err instanceof Error ? err : new Error(String(err));\n        onUsageError?.(errored, cause);\n      }\n      return undefined;\n    }\n    return onHelp !== undefined\n      ? onHelp(err.command.name(), err.command.helpInformation())\n      : err;\n  }\n  return invocation;\n}",
          cap: 'The walk core runs on every command, and its caller. Each option marks only the lines it changes.',
        },
        a: {
          lang: 'ts',
          code: "function quiet(\n  command: Command,\n  onUsageError: (command: Command) => void,\n): void {\n  command.configureOutput({\n    writeOut: () => undefined,\n    writeErr: () => undefined,\n  });\n  command.commands.forEach(c => {\n    quiet(c, onUsageError);\n  });\n}\n\nexport function parseCli<T = HelpRequested>(\n  spec: CliSpec,\n  argv: readonly string[],\n  onHelp?: CliHelpHook<T>,\n  onUsageError?: (command: Command, err: Error) => void,\n): CliInvocation | HelpRequested | T | undefined {\n  let invocation: CliInvocation | undefined;\n  const program = materialize(spec, found => {\n    invocation = found;\n  });\n  let errored: Command | undefined;\n  quiet(program, command => {\n    errored = command;\n  });\n  try {\n    program.parse([...argv], { from: 'user' });\n  } catch (err) {\n    if (!(err instanceof HelpRequested)) {\n      if (errored !== undefined) {\n        const cause = err instanceof Error ? err : new Error(String(err));\n        onUsageError?.(errored, cause);\n      }\n      return undefined;\n    }\n    return onHelp !== undefined\n      ? onHelp(err.command.name(), err.command.helpInformation())\n      : err;\n  }\n  return invocation;\n}",
          cap: 'Only the exitOverride block is removed; every other line is unchanged.',
        },
        b: {
          diff: false,
          state: 'sketch',
          code: 'parseQuietly(program, args, err =>\n  err instanceof HelpRequested\n    ? { help: err.command }\n    : commanderCode(err) === "commander.helpDisplayed"\n      ? { help: currentCommand(program) }\n      : undefined,\n)',
          cap: 'Shown whole rather than marked line by line: it is not the same code as today’s walk.',
        },
      },
      opts: [
        {
          k: 'a',
          rec: true,
          t: 'Drop the call that replaces the caller’s handler',
        },
        { k: 'b', t: 'Keep it; teach each caller to recognise a help request' },
      ],
      rows: [
        {
          on: 'stake',
          label: 'Subcommand help prints its own usage',
          marks: {
            a: ['gain', 'In all three CLIs at once; three failing tests pass.'],
            b: [
              'mixed',
              'Only in a CLI whose error handler learns the help case; statusline first.',
            ],
          },
        },
        {
          on: 'beyond',
          label: 'The trap for the next CLI',
          marks: {
            a: ['gain', 'Gone.'],
            b: [
              'cost',
              'Still set; every future CLI with its own handler meets it again.',
            ],
          },
        },
        {
          on: 'beyond',
          label: 'Shared code that changes',
          marks: {
            a: [
              'cost',
              'Core changes under all six callers; none relies on the silent default.',
            ],
            b: ['gain', 'None.'],
          },
        },
      ],
      why: 'a, because <i>subcommand help prints its own usage</i> everywhere and <i>the trap for the next CLI</i> goes; it pays in <i>shared code that changes</i>.',
    },

    G3: {
      title: 'How does one block’s cost split over two bands?',
      after: 'G1',
    },

    G4: {
      title: 'Who re-arms a reader’s window after a daemon restart?',
      stake:
        'Roughly 1 daemon restart a week lands mid-read; each one pays a leaf read’s holder half into the void until a human notices.',
      seq: {
        lanes: ['Daemon', 'Postgres', 'Reader', 'On call'],
        ledger: ['Windows\narmed'],
        start: [1],
        steps: [
          {
            f: 0,
            t: 0,
            k: 'fail',
            x: 'daemon restarts mid-read',
            s: 'the window lives only in the daemon’s memory',
            b: [0],
          },
          {
            f: 0,
            t: 1,
            k: 'store',
            x: 'daemon re-arms the window from Postgres',
            s: 'one more table the daemon owns',
            b: [1],
            in: ['a'],
          },
          {
            f: 2,
            t: 2,
            k: 'money',
            x: 'the read pays the holder half into the void',
            o: {
              a: {
                x: 'the read pays the band',
                n: 'the window survived the restart',
              },
              b: {
                x: 'the read re-arms the window, then pays the band',
                b: [1],
                n: 'one extra write per read',
              },
            },
          },
          {
            f: 3,
            t: 0,
            k: 'call',
            x: 'a human rebuilds the window from the console',
            b: [1],
            o: { a: { a: 'del' }, b: { a: 'del' } },
          },
        ],
        cap: '<b>Today a crash loses the window; the read pays into the void until a human rebuilds it.</b>',
        caps: {
          a: '<b>The daemon re-arms its windows from Postgres on start.</b> No void window.',
          b: '<b>The read re-arms the window before paying.</b> One extra write per read.',
        },
      },
      opts: [
        { k: 'a', rec: true, t: 'The daemon re-arms its windows on start' },
        { k: 'b', t: 'The read re-arms the window before paying' },
      ],
      rows: [
        {
          on: 'stake',
          label: 'The window is back before the first read',
          marks: {
            a: ['gain', 'Re-armed at start, before any read arrives.'],
            b: [
              'mixed',
              'Re-armed by the first read, inside its own transaction.',
            ],
          },
        },
        {
          on: 'beyond',
          label: 'State the daemon owns',
          marks: {
            a: [
              'cost',
              'One more table the daemon owns and migrates; start grows a step.',
            ],
            b: ['gain', 'No new owner of state; no daemon change.'],
          },
        },
        {
          on: 'beyond',
          label: 'Writes per read',
          marks: {
            a: ['gain', 'Unchanged.'],
            b: [
              'cost',
              'One more on every read, about 40 a day at current traffic.',
            ],
          },
        },
      ],
      why: 'a, because <i>the window is back before the first read</i> and <i>writes per read</i> stay unchanged; it pays in <i>state the daemon owns</i>.',
    },

    G5: {
      title: 'Should the daemon refuse to serve when its start check fails?',
      stake:
        'Every daemon start runs 1 ledger check whose failure stops nothing: readers pay into a ledger the daemon itself doubted, and a log line is the only sign.',
      opts: [
        { k: 'a', rec: true, t: 'Refuse to serve when the check fails' },
        { k: 'b', today: true, t: 'Keep serving on a failed check' },
      ],
      rows: [
        {
          on: 'stake',
          label: 'A doubted ledger is seen',
          marks: {
            a: ['gain', 'The on-call sees a stopped daemon with a reason.'],
            b: ['cost', 'A log line nobody is reading.'],
          },
        },
        {
          on: 'beyond',
          label: 'Reads during a flaky check',
          marks: {
            a: [
              'cost',
              'One flaky check stops every read until a human restarts the daemon.',
            ],
            b: ['gain', 'Reads continue.'],
          },
        },
      ],
      why: 'a, because <i>a doubted ledger is seen</i>; it pays in <i>reads during a flaky check</i>.',
    },

    G6: {
      title: 'Does a reader’s receipt show the blocks that paid no owner?',
      stake:
        'Paul’s receipt for a 2,400 read says 1,200 went to owners and never says why the other half did not.',
      must: ['Paul reads one receipt; nothing sends him to a second page.'],
      cut: [
        {
          k: 'c',
          t: 'A separate report of unowned blocks',
          why: 'It is a second page Paul has to find.',
        },
      ],
      figure: {
        cap: '<b>Today the receipt has no line for the 10 blocks that paid nobody.</b>',
        views: {
          today: {
            html:
              '<div style="font: var(--s)/1.5 var(--mono); width: 300px">' +
              '<div style="font: 500 var(--s) var(--sans); color: var(--muted); padding-bottom: 6px">Receipt</div>' +
              '<div style="display: flex; justify-content: space-between; gap: 32px; padding: 6px 0; border-top: 1px solid var(--rule)"><span>Reader [40, 50)</span><span>2,400</span></div>' +
              '<div style="display: flex; justify-content: space-between; gap: 32px; padding: 6px 0; border-top: 1px solid var(--rule); color: var(--muted)"><span>Paid to owners</span><span>1,200</span></div>' +
              '</div>',
          },
          a: {
            cap: '<b>The receipt names the 10 blocks that paid nobody.</b>',
            html:
              '<div style="font: var(--s)/1.5 var(--mono); width: 300px">' +
              '<div style="font: 500 var(--s) var(--sans); color: var(--muted); padding-bottom: 6px">Receipt</div>' +
              '<div style="display: flex; justify-content: space-between; gap: 32px; padding: 6px 0; border-top: 1px solid var(--rule)"><span>Reader [40, 50)</span><span>2,400</span></div>' +
              '<div style="display: flex; justify-content: space-between; gap: 32px; padding: 6px 0; border-top: 1px solid var(--rule); color: var(--muted)"><span>Paid to owners</span><span>1,200</span></div>' +
              '<div style="display: flex; justify-content: space-between; gap: 32px; padding: 6px 0; border-top: 1px solid var(--rule); color: var(--o); font-weight: 500"><span>10 blocks with no owner</span><span>0</span></div>' +
              '</div>',
          },
        },
      },
      opts: [
        { k: 'a', rec: true, t: 'Add an unowned line' },
        { k: 'b', today: true, t: 'Keep the receipt as it is' },
      ],
      rows: [
        {
          on: 'stake',
          label: 'Paul sees why half paid nobody',
          marks: {
            a: ['gain', 'One line names the 10 blocks with no owner.'],
            b: ['cost', 'He finds out only by asking.'],
          },
        },
        {
          on: 'beyond',
          label: 'Receipt length',
          marks: {
            a: ['cost', 'Every receipt grows a line, zero on most reads.'],
            b: ['gain', 'Unchanged.'],
          },
        },
      ],
      why: 'a, because <i>Paul sees why half paid nobody</i>; it pays in <i>receipt length</i>.',
    },
  },
};
