import { expect, test } from 'claude-code/testing';

import { stubEngine } from './stub.ts';

const HERE = '/work/agentic';
const SESSION = '3e4481fb-5074-4ec7-821c-b5d63ff2630b';

function scriptOf(world: ReturnType<typeof stubEngine>): string {
  return world.runs[0]?.[2] ?? '';
}

test('a permission prompt posts the message, named by repo and session', async ($, on) => {
  const world = stubEngine(on);

  await $.classic.Notification({
    cwd: HERE,
    message: 'Claude needs your permission to use Bash',
    notification_type: 'permission_prompt',
    session_id: SESSION,
  });

  expect(world.runs).toEqual([
    [
      'osascript',
      '-e',
      expect.stringMatching(
        /display notification "Claude needs your permission to use Bash"/,
      ),
    ],
  ]);
  expect(scriptOf(world)).toContain('with title "agentic · permission"');
  expect(scriptOf(world)).toContain('subtitle "session 3e4481"');
  expect(scriptOf(world)).toContain('sound name "Funk"');
});

test('a notification of another type posts nothing', async ($, on) => {
  const world = stubEngine(on);

  await $.classic.Notification({
    cwd: HERE,
    message: 'Claude is waiting for your input',
    notification_type: 'idle_prompt',
    session_id: SESSION,
  });

  expect(world.runs).toEqual([]);
});

test('a stop with nothing in flight carries the reply closing line', async ($, on) => {
  const world = stubEngine(on);

  await $.classic.Stop({
    cwd: HERE,
    last_assistant_message: 'Survey done.\n\nThe longer body follows here.',
    session_id: SESSION,
    stop_hook_active: false,
  });

  expect(world.runs).toEqual([
    [
      'osascript',
      '-e',
      expect.stringMatching(/display notification "Survey done\."/),
    ],
  ]);
  expect(scriptOf(world)).toContain('with title "agentic · done"');
  expect(scriptOf(world)).toContain('sound name "Glass"');
});

test('a stop with background work in flight is a pause, not a finish', async ($, on) => {
  const world = stubEngine(on);

  await $.classic.Stop({
    background_tasks: [
      { description: 'yarn test', id: 'b1', status: 'running', type: 'shell' },
    ],
    cwd: HERE,
    last_assistant_message: 'Tests are running.',
    session_crons: [],
    session_id: SESSION,
    stop_hook_active: false,
  });

  expect(world.runs).toEqual([]);
});

test('a quote in the message rides the AppleScript literal escaped', async ($, on) => {
  const world = stubEngine(on);

  await $.classic.Notification({
    cwd: HERE,
    message: 'Claude needs your permission to use Bash(npm run "build")',
    notification_type: 'permission_prompt',
    session_id: SESSION,
  });

  expect(scriptOf(world)).toContain('Bash(npm run \\"build\\")');
});

test('a failed osascript logs to debug and still passes the event on', async ($, on) => {
  const world = stubEngine(on, { exitCode: 1, stderr: 'not authorized' });

  await $.classic.Stop({
    cwd: HERE,
    last_assistant_message: 'Done.',
    session_id: SESSION,
    stop_hook_active: false,
  });

  expect(world.runs).toHaveLength(1);
  expect(world.logs).toEqual([
    expect.stringMatching(
      /^\[debug\] notify: osascript exited 1: not authorized$/,
    ),
  ]);
});
