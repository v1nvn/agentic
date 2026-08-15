#!/usr/bin/env node

/**
 * Token usage report CLI. Scans local Claude Code transcripts and renders the
 * plain-text report (see format.mjs). Works for every profile writing to
 * ~/.claude/projects — default claude, claudez, headless -p runs alike.
 */

import { scan } from './scan.mjs';
import { render } from './format.mjs';

console.log(render(scan()));
