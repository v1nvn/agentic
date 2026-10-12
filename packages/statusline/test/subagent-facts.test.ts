import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { configure } from '../src/configure.js';
import { transcriptFacts } from '../src/render/facts.js';
import {
  createHomes,
  keyArgv,
  plantRendererRecord,
  settingsCommand,
} from './fixtures.js';
import { loadTick, runRenderer } from './runtime.js';

// The panel's transcript door against planted subagent transcripts: the
// tick's tokenCount and task.effort paint only when a task's transcript has
// no usage line to read — task.effort is the launch's explicit ask, absent
// when effort is inherited. The reader itself is covered through the same
// map at the bottom.
const homes = createHomes();

afterEach(() => {
  homes.dispose();
});

const SID = 'd53f00d3-0000-4000-8000-000000000000';

function usageLine(
  input: number,
  cacheRead: number,
  cacheNew: number,
  effort = '',
): string {
  return JSON.stringify({
    ...(effort === '' ? {} : { effort }),
    message: {
      usage: {
        cache_creation_input_tokens: cacheNew,
        cache_read_input_tokens: cacheRead,
        input_tokens: input,
        output_tokens: 406,
      },
    },
    type: 'assistant',
  });
}

function plantSession(home: string, entries: Record<string, string>): string {
  const project = join(home, '.claude', 'projects', 'work');
  const transcriptPath = join(project, `${SID}.jsonl`);
  const subagents = join(project, SID, 'subagents');
  mkdirSync(subagents, { recursive: true });
  writeFileSync(transcriptPath, '{"type":"user"}\n');
  for (const [id, body] of Object.entries(entries)) {
    writeFileSync(join(subagents, `agent-${id}.jsonl`), body);
  }
  return transcriptPath;
}

function tickWith(transcriptPath: string): string {
  const tick = loadTick('multi');
  tick.transcript_path = transcriptPath;
  return `${JSON.stringify(tick)}\n`;
}

function panelRow(stdout: string, id: string): string {
  for (const line of stdout.split('\n')) {
    if (line === '') {
      continue;
    }
    const parsed = JSON.parse(line) as { content?: string; id?: string };
    if (parsed.id === id) {
      return parsed.content ?? '';
    }
  }
  throw new Error(`no panel row for ${id}`);
}

function runPanel(home: string, stdin: string): string {
  configure({ home, theme: 'classic' });
  plantRendererRecord(home, {
    lastUpdated: '2026-01-01T00:00:00Z',
    version: '1.2.3',
  });
  const run = runRenderer(
    keyArgv(settingsCommand(home, 'subagentStatusLine'), home),
    home,
    stdin,
  );
  expect(run.status, run.stderr).toBe(0);
  return run.stdout;
}

describe('the panel row', () => {
  it('paints the transcript usage and effort in place of the tick figures', () => {
    const home = homes.newHome();
    const transcriptPath = plantSession(home, {
      'row-explore': `${usageLine(8246, 0, 0)}\n${usageLine(3607, 8192, 0, 'max')}\n${usageLine(3607, 8192, 0, 'max')}\n`,
    });

    const stdout = runPanel(home, tickWith(transcriptPath));

    expect(panelRow(stdout, 'row-explore')).toContain('11.8k/200k');
    expect(panelRow(stdout, 'row-explore')).toContain('max');
    expect(panelRow(stdout, 'row-explore')).not.toContain('high');
    expect(panelRow(stdout, 'row-tests')).toContain('9.0k/180k');
    expect(panelRow(stdout, 'row-tests')).toContain('medium');
  });

  it('paints inherited effort the tick does not carry', () => {
    const home = homes.newHome();
    const transcriptPath = plantSession(home, {
      'row-fork': `${usageLine(3000, 1000, 0, 'max')}\n`,
    });

    const stdout = runPanel(home, tickWith(transcriptPath));

    expect(panelRow(stdout, 'row-fork')).toContain('max');
  });
});

describe('transcriptFacts', () => {
  it('reads the last usage line: tokens summed, effort as sent', () => {
    const home = homes.newHome();
    const transcriptPath = plantSession(home, {
      'row-explore': `${usageLine(8246, 0, 0)}\n${usageLine(3607, 8192, 0, 'max')}\n`,
    });

    const map = transcriptFacts(tickWith(transcriptPath));

    expect(map).toEqual({ 'row-explore': { effort: 'max', tokens: 11799 } });
  });

  it('skips a half-written trailing line', () => {
    const home = homes.newHome();
    const transcriptPath = plantSession(home, {
      'row-explore': `${usageLine(8246, 0, 0)}\n{"type":"assistan`,
    });

    const map = transcriptFacts(tickWith(transcriptPath));

    expect(map).toEqual({ 'row-explore': { effort: '', tokens: 8246 } });
  });

  it('leaves out tasks with no readable usage', () => {
    const home = homes.newHome();
    const transcriptPath = plantSession(home, {
      'row-review': '{"type":"user"}\n',
    });

    const map = transcriptFacts(tickWith(transcriptPath));

    expect(map).toEqual({});
  });
});
