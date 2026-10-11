/**
 * The mod kit: the stamped helpers every hooks module rides — the
 * exec/accept/parse door, declarative command registration, pane chrome as
 * fields, the refresh gate and per-agent tick cleanup. It is JSX-free `.ts`
 * and names no engine type: what crosses between a home and the kit is
 * values, hooks and `on` — never `$`, which the validator keeps inside one
 * file (the engine passes `$` to hooks alone). Panes stay the home's `.tsx`;
 * event-fed state stays the engine's own `on()`.
 */

import { lineOf, stdoutOf, type ToolLineSource } from './draw.js';

export type Door<T> =
  | { readonly line: string; readonly ok: false }
  | { readonly ok: true; readonly value: T };

/**
 * The door every pane command enters with its exec: stdout parsed and
 * accepted, or the one line a failed exec shows. A refused door keeps the
 * pane's last good value — a refresh re-scan never logs.
 */
export function acceptJson<T>(
  call: ToolLineSource,
  fallback: string,
  accept: (parsed: unknown) => null | T,
): Door<T> {
  function failed(): Door<T> {
    return { ok: false, line: lineOf(call, fallback) };
  }
  if (call.deny !== undefined || call.isError === true) {
    return failed();
  }
  try {
    const value = accept(JSON.parse(stdoutOf(call.result)));
    return value === null ? failed() : { ok: true, value };
  } catch {
    return failed();
  }
}

export interface PaneSpec {
  /** The empty-state line the pane draws before any report has landed. */
  readonly empty?: string;
  /** Whether the pane wraps its lines in a box frame (two rows of chrome). */
  readonly frame: boolean;
  readonly id: string;
  /** Re-scan the pane's command this often while it stays open; absent, never. */
  readonly refreshMs?: number;
  readonly title: string;
}

/** The rows a pane asks for: its lines, plus the frame's two. */
export function paneRows(lines: number, pane: PaneSpec): number {
  return lines + (pane.frame ? 2 : 0);
}

/** Whether the pane is still open — the gate a refresh re-scan waits on. */
export function showsPane(
  panes: readonly { readonly id: string }[],
  pane: PaneSpec,
): boolean {
  return panes.some(p => p.id === pane.id);
}

/**
 * The exec command's descriptor: what `$.command.register` takes, one row
 * per command. A home declares its commands as this list and registers them
 * in one loop inside its single `session.start` — the validator demands the
 * hook literals and the one `session.start`, so registration is data the
 * home's own hook walks, not a helper `$` cannot cross into.
 */
export interface CommandSpec {
  readonly description: string;
  readonly name: string;
}

/** One cell per agent: the accumulator a tick drains and the spawn time a pane shows. */
export interface AgentCell {
  acc: number;
  ring: number[];
  spawnAt: null | number;
}

export interface AgentRow {
  readonly id: string;
  readonly rate: number;
  readonly ring: readonly number[];
  readonly spawnAt: null | number;
}

/** The cell an id maps to, created empty on first sight. */
export function cellAt(cells: Map<string, AgentCell>, id: string): AgentCell {
  let cell = cells.get(id);
  if (cell === undefined) {
    cell = { acc: 0, ring: [], spawnAt: null };
    cells.set(id, cell);
  }
  return cell;
}

/**
 * Ages per-agent cells one tick, the tick's whole bookkeeping in one
 * consistent lifetime: ids the roster no longer names leave, live ones
 * sample their accumulator into the ring and reset it.
 */
export function ageAgents(
  cells: Map<string, AgentCell>,
  roster: readonly { readonly id: string }[],
  dt: number,
  ringMax: number,
): readonly AgentRow[] {
  const live = new Set(roster.map(a => a.id));
  for (const id of [...cells.keys()]) {
    if (!live.has(id)) {
      cells.delete(id);
    }
  }
  return roster.map(agent => {
    const cell = cellAt(cells, agent.id);
    const n = cell.acc;
    cell.ring = [...cell.ring, n].slice(-ringMax);
    cell.acc = 0;
    return {
      id: agent.id,
      rate: dt > 0 ? n / dt : 0,
      ring: cell.ring,
      spawnAt: cell.spawnAt,
    };
  });
}
