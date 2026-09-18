import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { buildProgram, designsCatalog, parseArgs, VERSION } from '../src/cli.js';
import { createHomes } from './fixtures.js';
import { PICKS_PATH } from './runtime.js';

// Read the manifest off disk so the test sees the published file, not the
// bundler-resolved import src/cli.ts uses.
const manifest = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as { version: string };

const RUNTIME_DIR = fileURLToPath(new URL('../assets/runtime', import.meta.url));
const RUNTIME_BIN = join(RUNTIME_DIR, 'bin', 'statusline.sh');
const COMPONENTS_DIR = join(RUNTIME_DIR, 'components');
const LIB_SH = join(RUNTIME_DIR, 'bin', 'lib.sh');

// Independent parses of the shipped runtime — the catalog is cross-checked
// against these, never against the readers the implementation itself uses.
function declaredAlternatives(): Map<string, readonly string[]> {
  const declared = new Map<string, readonly string[]>();
  for (const file of readdirSync(COMPONENTS_DIR).sort()) {
    if (!file.endsWith('.sh')) {
      continue;
    }
    for (const line of readFileSync(join(COMPONENTS_DIR, file), 'utf8').split(
      '\n',
    )) {
      if (!line.startsWith('#')) {
        break;
      }
      const match = /alternatives:\s*(.+)$/.exec(line);
      if (match) {
        declared.set(
          file.slice(0, -'.sh'.length),
          match[1]
            .split('|')
            .map(alt => alt.trim().replace(/\s*\(current\)$/, '')),
        );
      }
    }
  }
  return declared;
}

function declaredOrder(): string[] {
  const match = /^COMPS="(.+)"$/m.exec(readFileSync(RUNTIME_BIN, 'utf8'));
  if (match === null) {
    throw new Error('bin/statusline.sh declares no COMPS order');
  }
  return match[1].split(' ');
}

function declaredDefaults(): Map<string, string> {
  const defaults = new Map<string, string>();
  for (const [, comp, alt] of readFileSync(LIB_SH, 'utf8').matchAll(
    /([a-z]+)\) echo ([a-z]+) ;;/g,
  )) {
    defaults.set(comp, alt);
  }
  return defaults;
}

function expectedCatalog(picks: Record<string, string>): string[] {
  const alternatives = declaredAlternatives();
  const defaults = declaredDefaults();
  return declaredOrder().map(component => {
    const live = picks[component] ?? defaults.get(component);
    return `${component}: ${(alternatives.get(component) ?? [])
      .map(alt => (alt === live ? `${alt}*` : alt))
      .join(' | ')}`;
  });
}

describe('buildProgram', () => {
  it('names the bin after the package', () => {
    expect(buildProgram().name()).toBe('statusline-lab');
  });

  it('rides the manifest version', () => {
    expect(VERSION).toBe(manifest.version);
  });
});

describe('parseArgs', () => {
  it('parses --version', () => {
    expect(parseArgs(['--version'])).toEqual({ version: true });
  });

  it('accepts no args', () => {
    expect(parseArgs([])).toEqual({ version: false });
  });

  it('rejects unknown flags', () => {
    expect(parseArgs(['--bogus'])).toBeUndefined();
  });

  it('rejects stray arguments', () => {
    expect(parseArgs(['stray'])).toBeUndefined();
  });
});

describe('parseArgs: subcommands', () => {
  it('parses apply with every flag', () => {
    expect(
      parseArgs(['apply', '--home', '/tmp/lab-home', '--force', '--dry-run']),
    ).toEqual({
      version: false,
      command: 'apply',
      home: '/tmp/lab-home',
      force: true,
      dryRun: true,
    });
  });

  it('parses apply with defaults', () => {
    expect(parseArgs(['apply'])).toEqual({ version: false, command: 'apply' });
  });

  it('parses resolve with --home', () => {
    expect(parseArgs(['resolve', '--home', '/tmp/lab-home'])).toEqual({
      version: false,
      command: 'resolve',
      home: '/tmp/lab-home',
    });
  });

  it('scopes --force and --dry-run to apply', () => {
    expect(parseArgs(['resolve', '--force'])).toBeUndefined();
    expect(parseArgs(['resolve', '--dry-run'])).toBeUndefined();
  });

  it('rejects unknown flags, stray arguments, and unknown commands', () => {
    expect(parseArgs(['apply', '--bogus'])).toBeUndefined();
    expect(parseArgs(['apply', 'stray'])).toBeUndefined();
    expect(parseArgs(['nonsense'])).toBeUndefined();
  });
});

describe('parseArgs: payload', () => {
  it('parses each shipped fixture name', () => {
    for (const name of ['p1', 'p2', 'p3', 'p4']) {
      expect(parseArgs(['payload', name])).toEqual({
        version: false,
        command: 'payload',
        payload: name,
      });
    }
  });

  it('rejects unknown fixture names at parse, like unknown commands', () => {
    expect(parseArgs(['payload', 'p9'])).toBeUndefined();
    expect(parseArgs(['payload', 'capture-1'])).toBeUndefined();
  });
});

describe('parseArgs: capture', () => {
  it('parses capture with --home', () => {
    expect(parseArgs(['capture', '--home', '/tmp/lab-home'])).toEqual({
      version: false,
      command: 'capture',
      home: '/tmp/lab-home',
    });
  });

  it('parses capture with defaults', () => {
    expect(parseArgs(['capture'])).toEqual({
      version: false,
      command: 'capture',
    });
  });

  it('scopes --force and --dry-run away from capture', () => {
    expect(parseArgs(['capture', '--force'])).toBeUndefined();
    expect(parseArgs(['capture', '--dry-run'])).toBeUndefined();
  });

  it('rejects unknown flags and stray arguments — stdin is the only input', () => {
    expect(parseArgs(['capture', '--bogus'])).toBeUndefined();
    expect(parseArgs(['capture', 'stray'])).toBeUndefined();
  });
});

describe('parseArgs: designs', () => {
  it('parses designs with --home', () => {
    expect(parseArgs(['designs', '--home', '/tmp/lab-home'])).toEqual({
      version: false,
      command: 'designs',
      home: '/tmp/lab-home',
    });
  });

  it('parses designs with defaults', () => {
    expect(parseArgs(['designs'])).toEqual({
      version: false,
      command: 'designs',
    });
  });

  it('rejects unknown flags and stray arguments — the catalog takes no input', () => {
    expect(parseArgs(['designs', '--bogus'])).toBeUndefined();
    expect(parseArgs(['designs', 'stray'])).toBeUndefined();
  });
});

describe('parseArgs: pick', () => {
  it('parses pick with defaults', () => {
    expect(parseArgs(['pick'])).toEqual({ version: false, command: 'pick' });
  });

  it('parses pick with --home and a fixture --payload', () => {
    expect(
      parseArgs(['pick', '--home', '/tmp/lab-home', '--payload', 'p3']),
    ).toEqual({
      version: false,
      command: 'pick',
      home: '/tmp/lab-home',
      payload: 'p3',
    });
  });

  it('takes --payload as a free path — captures and one-off payloads preview too', () => {
    expect(
      parseArgs([
        'pick',
        '--payload',
        '/tmp/lab-home/.claude/plugins/data/statusline-lab-agentic/payloads/latest.json',
      ]),
    ).toEqual({
      version: false,
      command: 'pick',
      payload:
        '/tmp/lab-home/.claude/plugins/data/statusline-lab-agentic/payloads/latest.json',
    });
  });

  it('scopes --home and --payload to pick', () => {
    expect(parseArgs(['apply', '--payload', 'p3'])).toBeUndefined();
    expect(parseArgs(['resolve', '--payload', 'p3'])).toBeUndefined();
    expect(parseArgs(['capture', '--payload', 'p3'])).toBeUndefined();
  });

  it('keeps every other subcommand flag away from pick', () => {
    expect(parseArgs(['pick', '--force'])).toBeUndefined();
    expect(parseArgs(['pick', '--dry-run'])).toBeUndefined();
  });

  it('rejects unknown flags and stray arguments', () => {
    expect(parseArgs(['pick', '--bogus'])).toBeUndefined();
    expect(parseArgs(['pick', 'stray'])).toBeUndefined();
  });
});

describe('designsCatalog', () => {
  it('lists one line per component with the live pick starred and no ANSI', () => {
    const homes = createHomes();
    try {
      const home = homes.newHome();
      const picksFile = join(home, PICKS_PATH);
      mkdirSync(dirname(picksFile), { recursive: true });
      // Two of sixteen set, both to non-defaults: the star must follow the
      // picks file where set and the lib.sh default everywhere else.
      writeFileSync(picksFile, 'model=block\ncost=none\n');

      const out = designsCatalog({ home });

      expect(out).not.toMatch(/\u001b\[/);
      expect(out.split('\n').filter(line => line !== '')).toEqual(
        expectedCatalog({ cost: 'none', model: 'block' }),
      );
    } finally {
      homes.dispose();
    }
  });
});
