// Disk side of the preset store: one <site>.json file per preset, read into
// the in-memory store at boot. Local to the user's machine, ordinary files;
// the server never fetches and nothing expires by clock — staleness is
// detector-checked per page (policy/presets.ts), so eviction here is disk
// hygiene only.

import { readdirSync, readFileSync, statSync, unlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';

import { logger } from './logger.js';
import { addPreset, normalizeSiteKey } from './policy/presets.js';

export const PRESETS_DIR_ENV = 'READABILITY_MCP_PRESETS_DIR';

export const MAX_PRESET_FILES = 64;

// An empty scope applies nothing while reporting applied:true, and detectors
// only mean something as a non-empty set — reject both at the file boundary.
const presetFileSchema = z.object({
  site: z.string().min(1),
  detectors: z.array(z.string().min(1)).min(1),
  scope: z
    .object({
      include: z.string().min(1).optional(),
      exclude: z.array(z.string().min(1)).min(1).optional(),
    })
    .refine(
      scope => scope.include !== undefined || scope.exclude !== undefined,
      {
        message: 'scope must carry include or exclude',
      },
    ),
});

export interface PresetCacheReport {
  readonly loaded: number;
  readonly pruned: number;
  readonly skipped: number;
}

// Empty string disables preset loading; an absolute path wins over the
// platform default.
export function resolvePresetsDir(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const override = env[PRESETS_DIR_ENV];
  if (override !== undefined) {
    return override.trim() === '' ? undefined : override;
  }
  const root =
    env.XDG_CACHE_HOME ||
    join(
      homedir(),
      process.platform === 'darwin' ? 'Library/Caches' : '.cache',
    );
  return join(root, 'readability-mcp', 'presets');
}

// A preset that cannot load is a warning, never a boot failure — the pipeline
// is designed to run without one.
export function loadPresetDir(dir: string): PresetCacheReport {
  let names: string[];
  try {
    names = readdirSync(dir)
      .filter(name => name.endsWith('.json'))
      .sort();
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      logger.debug(`no preset directory at ${dir}`);
    } else {
      logger.warn(`preset directory unreadable: ${dir}`);
    }
    return { loaded: 0, pruned: 0, skipped: 0 };
  }

  const ranked: { mtimeMs: number; name: string }[] = [];
  for (const name of names) {
    try {
      ranked.push({ name, mtimeMs: statSync(join(dir, name)).mtimeMs });
    } catch {
      // Vanished between readdir and stat — nothing to load or prune.
    }
  }
  ranked.sort((a, b) => b.mtimeMs - a.mtimeMs);

  let pruned = 0;
  for (const { name } of ranked.slice(MAX_PRESET_FILES)) {
    try {
      unlinkSync(join(dir, name));
      pruned++;
    } catch (err) {
      logger.warn(
        `could not prune preset file ${name}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  let loaded = 0;
  let skipped = 0;
  for (const { name } of ranked.slice(0, MAX_PRESET_FILES)) {
    const path = join(dir, name);
    if (loadPresetFile(path)) {
      loaded++;
    } else {
      skipped++;
    }
  }
  if (loaded > 0) {
    logger.info(`loaded ${loaded} site preset(s) from ${dir}`);
  }
  if (pruned > 0) {
    logger.info(
      `pruned ${pruned} preset file(s) beyond the ${MAX_PRESET_FILES}-file bound`,
    );
  }
  return { loaded, pruned, skipped };
}

// Env-resolving entry point for the boot paths; undefined means disabled.
export function loadPresets(
  env: NodeJS.ProcessEnv = process.env,
): PresetCacheReport | undefined {
  const dir = resolvePresetsDir(env);
  return dir ? loadPresetDir(dir) : undefined;
}

function loadPresetFile(path: string): boolean {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8')) as unknown;
  } catch (err) {
    logger.warn(
      `${path}: not readable JSON (${
        err instanceof Error ? err.message : String(err)
      }), preset skipped`,
    );
    return false;
  }
  const result = presetFileSchema.safeParse(parsed);
  if (!result.success) {
    logger.warn(`${path}: ${result.error.issues[0]?.message}, preset skipped`);
    return false;
  }
  if (!normalizeSiteKey(result.data.site)) {
    logger.warn(`${path}: site is not a hostname, preset skipped`);
    return false;
  }
  addPreset(result.data);
  return true;
}
