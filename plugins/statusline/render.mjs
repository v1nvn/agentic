#!/usr/bin/env node
import { parseArgs } from "node:util";
import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
//#region src/render/items.ts
var ITEMS = [
	{
		alternatives: [
			"plain",
			"block",
			"pill",
			"zen"
		],
		default: "plain",
		item: "model"
	},
	{
		alternatives: [
			"plain",
			"dim",
			"hidden"
		],
		default: "plain",
		item: "effort"
	},
	{
		alternatives: ["none", "pills"],
		default: "none",
		item: "state"
	},
	{
		alternatives: [
			"init",
			"full",
			"tail",
			"base",
			"icon"
		],
		default: "init",
		item: "cwd"
	},
	{
		alternatives: [
			"initials",
			"full",
			"last",
			"icon",
			"none"
		],
		default: "initials",
		item: "branch"
	},
	{
		alternatives: [
			"counts",
			"icons",
			"none"
		],
		default: "counts",
		item: "status"
	},
	{
		alternatives: ["none", "arrows"],
		default: "none",
		item: "ahead"
	},
	{
		alternatives: ["none", "badge"],
		default: "none",
		item: "pr"
	},
	{
		alternatives: [
			"flat",
			"gauge",
			"percent",
			"none",
			"flat6",
			"flat4"
		],
		default: "flat",
		item: "bar"
	},
	{
		alternatives: [
			"full",
			"compact",
			"free",
			"none"
		],
		default: "full",
		item: "tokens"
	},
	{
		alternatives: [
			"hit",
			"coldin",
			"fuse",
			"none"
		],
		default: "hit",
		item: "cache"
	},
	{
		alternatives: [
			"plain",
			"burn",
			"none"
		],
		default: "plain",
		item: "cost"
	},
	{
		alternatives: [
			"clock",
			"hours",
			"none"
		],
		default: "clock",
		item: "duration"
	},
	{
		alternatives: ["none", "diffstat"],
		default: "none",
		item: "lines"
	},
	{
		alternatives: ["none", "strip"],
		default: "none",
		item: "rate"
	},
	{
		alternatives: [
			"plain",
			"dots",
			"dim",
			"bare"
		],
		default: "plain",
		item: "style"
	}
];
var DEFAULT_LAYOUT = "{model effort state} {cwd branch status ahead pr} {bar tokens cache} {cost} {duration} {lines} {rate}";
var BY_ITEM = new Map(ITEMS.map((spec) => [spec.item, spec]));
function specFor(item) {
	return BY_ITEM.get(item);
}
ITEMS.map((spec) => spec.item);
Object.fromEntries(ITEMS.map(({ default: alt, item }) => [item, alt]));
var RUNG_ORDERS = {
	bar: [
		"flat",
		"flat6",
		"flat4",
		"percent",
		"none"
	],
	branch: [
		"icon",
		"full",
		"initials",
		"last",
		"none"
	],
	cache: [
		"hit",
		"coldin",
		"none"
	],
	cwd: [
		"icon",
		"full",
		"init",
		"tail",
		"base"
	],
	duration: [
		"clock",
		"hours",
		"none"
	],
	effort: [
		"plain",
		"dim",
		"hidden"
	],
	status: [
		"counts",
		"icons",
		"none"
	],
	tokens: [
		"full",
		"free",
		"compact",
		"none"
	]
};
var FULL_STEPS = [
	["duration", "none"],
	["cache", "none"],
	["tokens", "compact"],
	["bar", "flat6"],
	["status", "none"],
	["branch", "initials"],
	["cwd", "init"],
	["branch", "last"],
	["bar", "flat4"],
	["model", "strip"],
	["bar", "percent"],
	["branch", "none"],
	["cwd", "tail"],
	["effort", "hidden"],
	["cwd", "base"],
	["tokens", "none"]
];
var L1_STEPS = [
	["status", "none"],
	["branch", "initials"],
	["cwd", "init"],
	["branch", "last"],
	["model", "strip"],
	["branch", "none"],
	["cwd", "tail"],
	["effort", "hidden"],
	["cwd", "base"]
];
var L2_STEPS = [
	["duration", "none"],
	["cache", "none"],
	["tokens", "compact"],
	["bar", "flat6"],
	["bar", "flat4"],
	["tokens", "none"],
	["bar", "percent"]
];
//#endregion
//#region src/render/argv.ts
function warn$1(warnings, message) {
	warnings.push(message);
}
function parseArgv(argv) {
	const parsed = parseArgs({
		allowPositionals: true,
		args: [...argv],
		options: {
			layout: { type: "string" },
			now: { type: "string" },
			theme: { type: "string" }
		},
		strict: false
	});
	const warnings = [];
	const picks = {};
	let mode = "line";
	let theme;
	let layout;
	let now;
	for (const positional of parsed.positionals) if (positional === "panel") mode = "panel";
	else warn$1(warnings, `statusline: unexpected argument '${positional}', ignored`);
	for (const [name, value] of Object.entries(parsed.values)) {
		if (typeof value !== "string") {
			warn$1(warnings, `statusline: --${name} needs a value, ignored`);
			continue;
		}
		if (name === "theme") {
			theme = value;
			continue;
		}
		if (name === "layout") {
			layout = value;
			continue;
		}
		if (name === "now") {
			const epoch = Number(value);
			if (Number.isFinite(epoch) && value.trim() !== "") now = epoch;
			else warn$1(warnings, `statusline: --now=${value} is not a number, ignored`);
			continue;
		}
		const spec = specFor(name);
		if (spec === void 0) {
			warn$1(warnings, `statusline: --${name} is not a known flag, ignored`);
			continue;
		}
		if (spec.alternatives.includes(value)) picks[name] = value;
		else warn$1(warnings, `statusline: ${name}=${value} is not available, using ${name}=${spec.default}`);
	}
	return {
		mode,
		picks,
		warnings,
		...theme === void 0 ? {} : { theme },
		...layout === void 0 ? {} : { layout },
		...now === void 0 ? {} : { now }
	};
}
//#endregion
//#region src/render/capture.ts
var DATA_DIR = join(".claude", "plugins", "data", "statusline-agentic");
function capturePayload(home, surface, payload) {
	const dest = join(home, DATA_DIR, "captures", `${surface}.json`);
	try {
		mkdirSync(dirname(dest), { recursive: true });
		writeFileSync(`${dest}.tmp`, payload);
		renameSync(`${dest}.tmp`, dest);
	} catch {}
}
//#endregion
//#region src/render/git.ts
var BRANCH_HEAD = "# branch.head ";
var BRANCH_AB = /^# branch\.ab \+(\d+) -(\d+)$/;
function gitEnv(env) {
	return {
		HOME: env.home,
		LC_ALL: "C",
		PATH: process.env.PATH ?? ""
	};
}
function gitText(dir, args, env) {
	const run = spawnSync("git", [
		"-C",
		dir,
		...args
	], {
		encoding: "utf8",
		env: gitEnv(env)
	});
	return run.status === 0 ? run.stdout : null;
}
function lineCount(text) {
	return text === null || text === "" ? 0 : (text.match(/\n/g) ?? []).length;
}
function count(text) {
	const parsed = text === null ? NaN : Number(text.trim());
	return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
}
function readGit(dir, env) {
	const facts = {
		ahead: 0,
		behind: 0,
		branch: "",
		modified: 0,
		staged: 0,
		stashes: 0,
		untracked: 0
	};
	if (dir === "") return facts;
	if (spawnSync("git", [
		"-C",
		dir,
		"rev-parse",
		"--git-dir"
	], {
		encoding: "utf8",
		env: gitEnv(env)
	}).status !== 0) return facts;
	const status = gitText(dir, [
		"status",
		"--porcelain=v2",
		"--branch"
	], env);
	for (const line of (status ?? "").split("\n")) {
		if (line.startsWith(BRANCH_HEAD)) {
			facts.branch = line.slice(14);
			continue;
		}
		const ab = BRANCH_AB.exec(line);
		if (ab !== null) {
			facts.ahead = count(ab[1]);
			facts.behind = count(ab[2]);
		} else if ((line.startsWith("1 ") || line.startsWith("2 ")) && line.length >= 4) {
			if (line[2] !== ".") facts.staged += 1;
			if (line[3] !== ".") facts.modified += 1;
		}
	}
	if (facts.branch === "(detached)") facts.branch = "";
	facts.untracked = lineCount(gitText(dir, [
		"ls-files",
		"--others",
		"--exclude-standard"
	], env));
	facts.stashes = lineCount(gitText(dir, ["stash", "list"], env));
	return facts;
}
//#endregion
//#region src/render/layout.ts
function parseClusters(layout) {
	const clusters = [];
	let words = [];
	let word = "";
	let open = false;
	function pushWord() {
		if (word !== "") {
			words.push(word);
			word = "";
		}
	}
	for (const c of layout) if (c === "{") {
		if (open) throw new Error(`layout '${layout}': '{' inside a cluster`);
		open = true;
		words = [];
	} else if (c === "}") {
		if (!open) throw new Error(`layout '${layout}': '}' outside a cluster`);
		pushWord();
		open = false;
		if (words.length > 0) clusters.push(words);
	} else if (c === " ") {
		if (open) pushWord();
		else if (word !== "") throw new Error(`layout '${layout}': '${word}' sits outside a cluster`);
	} else if (/[a-z0-9]/.test(c)) word += c;
	else throw new Error(`layout '${layout}': '${c}' is not layout grammar (braces, item ids, spaces)`);
	if (open) throw new Error(`layout '${layout}': unterminated cluster`);
	if (word !== "") throw new Error(`layout '${layout}': '${word}' sits outside a cluster`);
	if (clusters.length === 0) throw new Error(`layout '${layout}': no clusters`);
	return clusters;
}
//#endregion
//#region src/render/jq.ts
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function orElse(value, fallback) {
	return value === void 0 || value === null || value === false ? fallback : value;
}
function jqText(value) {
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean") return String(value);
	return JSON.stringify(value);
}
function tsvEscape(text) {
	return text.replace(/\\/g, "\\\\").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r");
}
//#endregion
//#region src/render/payload.ts
function member(source, key) {
	return isRecord(source) ? source[key] : void 0;
}
function field$1(source, path) {
	let current = source;
	for (const key of path.split(".")) current = member(current, key);
	return current;
}
function textOf(value) {
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean") return String(value);
	return "";
}
function scalar(source, path, fallback) {
	return textOf(orElse(field$1(source, path), fallback));
}
function numberField(source, path) {
	return Number(scalar(source, path, "0"));
}
function pctField(source) {
	const intPart = scalar(source, "context_window.used_percentage", "0").split(".")[0];
	return intPart === "" ? 0 : Number(intPart);
}
var RATE_LIMITS = [
	["5h", "five_hour"],
	["7d", "seven_day"],
	["spend", "spend_limit"]
];
function rateRows(source) {
	const limits = field$1(source, "rate_limits");
	const rows = [];
	for (const [label, key] of RATE_LIMITS) {
		const limit = member(limits, key);
		if (!isRecord(limit) || Object.keys(limit).length === 0) continue;
		rows.push({
			label,
			pctText: scalar(limit, "used_percentage", "0"),
			resets: Number(scalar(limit, "resets_at", "0"))
		});
	}
	return rows;
}
function parseRow(payload) {
	const root = JSON.parse(payload);
	const hitText = scalar(root, "prompt_cache.hit_ratio", "");
	return {
		agent: scalar(root, "agent.name", ""),
		cost: numberField(root, "cost.total_cost_usd"),
		ctxSize: numberField(root, "context_window.context_window_size"),
		dir: scalar(root, "workspace.current_dir", ""),
		durationMs: numberField(root, "cost.total_duration_ms"),
		effort: scalar(root, "effort.level", ""),
		expires: numberField(root, "prompt_cache.expires_at"),
		hit: hitText === "" ? null : Number(hitText),
		la: numberField(root, "cost.total_lines_added"),
		lr: numberField(root, "cost.total_lines_removed"),
		model: scalar(root, "model.display_name", ""),
		pct: pctField(root),
		prn: scalar(root, "pr.number", ""),
		prs: scalar(root, "pr.review_state", ""),
		rateRows: rateRows(root),
		think: scalar(root, "thinking.enabled", "false") === "true",
		tokens: numberField(root, "context_window.total_input_tokens"),
		ttl: scalar(root, "prompt_cache.ttl", ""),
		vim: scalar(root, "vim.mode", ""),
		warm: scalar(root, "prompt_cache.warm", "false") === "true",
		wt: scalar(root, "worktree.name", ""),
		styleName: scalar(root, "output_style.name", "")
	};
}
//#endregion
//#region src/render/awk.ts
var TEN = 10n;
function exactParts(ax) {
	const view = /* @__PURE__ */ new DataView(/* @__PURE__ */ new ArrayBuffer(8));
	view.setFloat64(0, ax);
	const hi = view.getUint32(0);
	const lo = view.getUint32(4);
	const biased = hi >>> 20 & 2047;
	const frac = BigInt(hi & 1048575) << 32n | BigInt(lo);
	if (biased === 0) return {
		exp: -1074,
		mant: frac
	};
	return {
		exp: biased - 1075,
		mant: frac | 1n << 52n
	};
}
function roundScaled(ax, d) {
	const { exp, mant } = exactParts(ax);
	const pow10 = TEN ** BigInt(d);
	const num = exp >= 0 ? (mant << BigInt(exp)) * pow10 : mant * pow10;
	const den = exp >= 0 ? 1n : 1n << BigInt(-exp);
	const q = num / den;
	const twice = num % den * 2n;
	if (twice > den || twice === den && q % 2n === 1n) return q + 1n;
	return q;
}
function fmtFixed(x, d) {
	const q = roundScaled(Math.abs(x), d);
	const sign = x < 0 && q !== 0n ? "-" : "";
	const digits = q.toString();
	if (d === 0) return `${sign}${digits}`;
	return `${sign}${digits.length <= d ? "0" : digits.slice(0, digits.length - d)}.${digits.padStart(d + 1, "0").slice(-d)}`;
}
function pad2(n) {
	return String(n).padStart(2, "0");
}
function fmtDuration(minutes) {
	if (minutes < 60) return `${minutes}m`;
	if (minutes < 1440) return `${Math.trunc(minutes / 60)}h${pad2(minutes % 60)}m`;
	return `${Math.trunc(minutes / 1440)}d${pad2(Math.trunc(minutes / 60) % 24)}h`;
}
function fmtK(n, d) {
	return `${fmtFixed(n / 1e3, d)}k`;
}
function fmtM(n) {
	return `${fmtFixed(n / 1e6, 0)}M`;
}
//#endregion
//#region src/render/segments.ts
var BLUE = "\x1B[34m";
var CYAN$1 = "\x1B[36m";
var DIM = "\x1B[2m";
var GREEN$1 = "\x1B[32m";
var PURPLE = "\x1B[35m";
var RED$1 = "\x1B[31m";
var RESET$1 = "\x1B[0m";
var YELLOW$1 = "\x1B[33m";
var BOLD = "\x1B[1m";
var GRAY = "\x1B[38;2;68;71;90m";
var MARK = "\x1B[1;97m";
var SHORT_AT = 15;
var PART = [
	"▏",
	"▎",
	"▍",
	"▌",
	"▋",
	"▊",
	"▉",
	"█"
];
var HEAT = [
	"\x1B[38;2;48;242;36m",
	"\x1B[38;2;63;242;36m",
	"\x1B[38;2;79;242;36m",
	"\x1B[38;2;95;242;36m",
	"\x1B[38;2;111;242;36m",
	"\x1B[38;2;126;242;36m",
	"\x1B[38;2;142;242;36m",
	"\x1B[38;2;158;242;36m",
	"\x1B[38;2;173;242;36m",
	"\x1B[38;2;189;242;36m",
	"\x1B[38;2;205;242;36m",
	"\x1B[38;2;220;242;36m",
	"\x1B[38;2;236;242;36m",
	"\x1B[38;2;242;232;36m",
	"\x1B[38;2;242;216;36m",
	"\x1B[38;2;242;200;36m",
	"\x1B[38;2;242;185;36m",
	"\x1B[38;2;242;169;36m",
	"\x1B[38;2;242;153;36m",
	"\x1B[38;2;242;138;36m",
	"\x1B[38;2;242;122;36m",
	"\x1B[38;2;242;106;36m",
	"\x1B[38;2;242;91;36m",
	"\x1B[38;2;242;75;36m",
	"\x1B[38;2;242;59;36m",
	"\x1B[38;2;242;44;36m"
];
function trunc(n) {
	return Math.trunc(n);
}
function modelPlain({ model }) {
	return model === "" ? "" : `${CYAN$1}${model}${RESET$1}`;
}
function modelBlock({ model }) {
	return model === "" ? "" : `\x1b[48;5;61m\x1b[38;5;231m ${model} \x1b[0m`;
}
function modelPill({ model }) {
	return model === "" ? "" : `\x1b[48;5;61m\x1b[38;5;231m\u{e0b6} ${model} \u{e0b4}\x1b[0m`;
}
function modelZen({ model }) {
	return model === "" ? "" : `${DIM}${model.replace(/[A-Z]/g, (c) => c.toLowerCase())}${RESET$1}`;
}
function effortPlain({ row }) {
	return row.effort === "" ? "" : `${CYAN$1}${row.effort}${RESET$1}`;
}
function effortDim({ row }) {
	return row.effort === "" ? "" : `${DIM}${row.effort}${RESET$1}`;
}
function statePill(label, bg, fg) {
	return `\x1b[48;5;${bg}m\x1b[38;5;${fg}m\u{e0b6} ${label} \u{e0b4}\x1b[0m`;
}
function statePills({ row }) {
	let out = "";
	if (row.vim !== "") out = row.vim === "INSERT" ? statePill(row.vim, 97, 16) : statePill(row.vim, 240, 231);
	if (row.think) out += ` ${statePill("THINK", 66, 16)}`;
	if (row.agent !== "") out += ` ${statePill(row.agent, 60, 231)}`;
	if (row.wt !== "") out += ` ${statePill(`wt:${row.wt}`, 131, 231)}`;
	if (row.styleName !== "" && row.styleName !== "default") out += ` ${statePill(row.styleName, 95, 16)}`;
	return out;
}
function splitPath(raw, home) {
	let p = raw;
	if (home !== "" && p.startsWith(home)) p = `~${p.slice(home.length)}`;
	return {
		lead: p.startsWith("/") ? "/" : "",
		parts: p.split("/").filter((part) => part !== ""),
		text: p
	};
}
function pathInit(raw, home) {
	const { lead, parts, text } = splitPath(raw, home);
	const n = parts.length;
	if (n <= 2) return text;
	let out = `${lead}${parts[0]}`;
	for (let i = 1; i < n - 1; i++) {
		const ini = parts[i].startsWith(".") ? parts[i].slice(0, 2) : parts[i].slice(0, 1);
		out += `/${ini}`;
	}
	return `${out}/${parts[n - 1]}`;
}
function pathTail(raw, home, lim) {
	const { lead, parts, text } = splitPath(raw, home);
	const cnt = parts.length;
	if (cnt <= lim || cnt <= 1) return text;
	let out = `${lead}${parts[0]}/…`;
	for (let i = cnt - lim; i < cnt; i++) out += `/${parts[i]}`;
	return out;
}
function cwdInit({ home, row }) {
	const { text } = splitPath(row.dir, home);
	return Buffer.byteLength(text, "utf8") > SHORT_AT ? pathInit(row.dir, home) : text;
}
function cwdFull({ home, row }) {
	return splitPath(row.dir, home).text;
}
function cwdTail({ home, row }) {
	return pathTail(row.dir, home, 1);
}
function baseName(dir) {
	return dir.slice(dir.lastIndexOf("/") + 1);
}
function cwdBase({ row }) {
	return baseName(row.dir);
}
function cwdIcon({ row }) {
	return `\u{f07b} ${baseName(row.dir)}`;
}
function branchInitials({ git }) {
	const branch = git.branch;
	if (branch === "") return "";
	if (Buffer.byteLength(branch, "utf8") <= SHORT_AT) return branch;
	const parts = branch.split("/").filter((part) => part !== "");
	if (parts.length <= 1) return branch;
	let out = "";
	for (let i = 0; i < parts.length - 1; i++) out += `${parts[i].slice(0, 1)}/`;
	return `${out}${parts[parts.length - 1]}`;
}
function branchFull({ git }) {
	return git.branch;
}
function branchLast({ git }) {
	return git.branch.slice(git.branch.lastIndexOf("/") + 1);
}
function branchIcon({ git }) {
	return git.branch === "" ? "" : `\u{e0a0} ${git.branch}`;
}
function statusCounts({ git }) {
	if (git.branch === "") return "";
	let c = "";
	if (git.staged > 0) c = `${GREEN$1}+${git.staged}${RESET$1}`;
	if (git.modified > 0) c = `${c} ${YELLOW$1}~${git.modified}${RESET$1}`;
	return c;
}
function statusIcons({ git }) {
	if (git.branch === "") return "";
	let out = "";
	let sep = "";
	if (git.staged > 0) {
		out += `${GREEN$1}●${git.staged}${RESET$1}`;
		sep = " ";
	}
	if (git.modified > 0) {
		out += `${sep}${YELLOW$1}✎${git.modified}${RESET$1}`;
		sep = " ";
	}
	if (git.untracked > 0) {
		out += `${sep}${CYAN$1}+${git.untracked}${RESET$1}`;
		sep = " ";
	}
	if (git.stashes > 0) out += `${sep}${PURPLE}⚑${git.stashes}${RESET$1}`;
	return out;
}
function aheadArrows({ git }) {
	let out = "";
	if (git.ahead > 0) out = `${GREEN$1}↑${git.ahead}${RESET$1}`;
	if (git.behind > 0) out += ` ${RED$1}↓${git.behind}${RESET$1}`;
	return out;
}
function prBadge({ row }) {
	if (row.prn === "") return "";
	let col;
	let mark;
	switch (row.prs) {
		case "approved":
			col = GREEN$1;
			mark = "✓";
			break;
		case "changes_requested":
			col = RED$1;
			mark = "✗";
			break;
		case "pending":
			col = YELLOW$1;
			mark = "⏳";
			break;
		default:
			col = "\x1B[90m";
			mark = "◌";
	}
	return `${BLUE}#${row.prn}${RESET$1} ${col}${mark} ${row.prs}${RESET$1}`;
}
function barFlatAt(input, w) {
	const pct = input.row.pct;
	let f = trunc(pct * w / 100);
	if (f > w) f = w;
	if (pct > 0 && f === 0) f = 1;
	return `${pct >= 90 ? RED$1 : pct >= 70 ? YELLOW$1 : GREEN$1}${"█".repeat(f)}${"░".repeat(w - f)}${RESET$1}`;
}
function barFlat(input) {
	return barFlatAt(input, 10);
}
function barGauge({ row }) {
	const pct = row.pct;
	const p = Math.max(0, Math.min(100, pct));
	const full = trunc(p * 26 / 100);
	const idx = trunc(p * 26 % 100 * 8 / 100);
	const lead = p >= 50 ? `\x1b[38;2;242;${trunc(4845 * (15e3 + 1683 * (100 - p)) / 2e6)};36m` : `\x1b[38;2;${trunc(4845 * (185e3 - 1683 * (100 - p)) / 2e6)};242;36m`;
	const moon = [
		"○",
		"◔",
		"◑",
		"◕",
		"●"
	][Math.min(trunc(p / 20), 4)];
	let bar = "";
	for (let i = 0; i < 26; i++) {
		let col;
		let cell;
		if (i === 20) {
			col = MARK;
			cell = i <= full ? "┃" : "│";
		} else if (i <= full) {
			col = HEAT[i];
			cell = i === full ? PART[idx] : "█";
		} else {
			col = GRAY;
			cell = "░";
		}
		bar += `${col}${cell}`;
	}
	return `${moon} ${lead}${bar}${RESET$1} ${MARK}${pct}%${RESET$1}`;
}
function tokensFull({ row }) {
	const t = row.tokens >= 1e3 ? fmtK(row.tokens, 1) : String(row.tokens);
	let c = String(row.ctxSize);
	if (row.ctxSize >= 1e6) c = fmtM(row.ctxSize);
	else if (row.ctxSize >= 1e3) c = fmtK(row.ctxSize, 0);
	return `${t}/${c}`;
}
function tokensCompact({ row }) {
	return row.tokens >= 1e3 ? fmtK(row.tokens, 0) : String(row.tokens);
}
function tokensFree({ row }) {
	const free = row.ctxSize - row.tokens;
	return `${DIM}${free >= 1e3 ? fmtK(free, 0) : String(free)} free${RESET$1}`;
}
function cacheHitPct(row) {
	return row.hit === null ? null : trunc(row.hit * 100);
}
function cacheHCol(hp) {
	return hp >= 90 ? GREEN$1 : hp >= 50 ? YELLOW$1 : RED$1;
}
function cacheHit({ row }) {
	const hp = cacheHitPct(row);
	return hp === null ? "" : `${cacheHCol(hp)}⚡${hp}%${RESET$1}`;
}
function cacheColdin({ now, row }) {
	const hp = cacheHitPct(row);
	if (hp === null) return "";
	if (row.warm && row.expires > now) {
		const mins = trunc((row.expires - now) / 60);
		return `${cacheHCol(hp)}⚡${hp}%${RESET$1} ${DIM}· cold in ${mins}m${RESET$1}`;
	}
	return `❄ ${DIM}cold · ${hp}%${RESET$1}`;
}
function cacheFuse({ now, row }) {
	if (row.ttl === "" || row.expires === 0) return "";
	const span = row.ttl === "1h" ? 3600 : 300;
	let left = row.expires - now;
	if (left < 0) left = 0;
	if (left <= 0) return `${RED$1}❄ cold${RESET$1}`;
	const full = trunc(left * 10 / span);
	const rem = left * 10 % span;
	let bar = left * 4 > span ? GREEN$1 : left * 25 > span * 2 ? YELLOW$1 : RED$1;
	for (let i = 0; i < 10; i++) if (i < full) bar += "▰";
	else if (i === full && rem * 20 > span) bar += PART[trunc(rem * 8 / span)];
	else bar += `${DIM}▱`;
	return `${bar}${RESET$1} ${DIM}${pad2(trunc(left / 60))}:${pad2(left % 60)}${RESET$1}`;
}
function costPlain({ row }) {
	return row.cost >= .005 ? `${YELLOW$1}$${fmtFixed(row.cost, 2)}${RESET$1}` : "";
}
function costBurn(input) {
	const hr = input.row.durationMs / 36e5;
	const burn = hr > .02 ? fmtFixed(input.row.cost / hr, 2) : "0";
	let out = costPlain(input);
	if (burn !== "0.00") out += ` ${DIM}· $${burn}/hr${RESET$1}`;
	return out;
}
function durationClock({ row }) {
	return fmtDuration(trunc(row.durationMs / 6e4));
}
function durationHours({ row }) {
	const m = trunc(row.durationMs / 6e4);
	if (m < 1440) return `${trunc(m / 60)}h${pad2(m % 60)}m`;
	return `${trunc(m / 1440)}d${pad2(trunc(m / 60) % 24)}h${pad2(m % 60)}m`;
}
function linesDiffstat({ row }) {
	if (row.la <= 0 && row.lr <= 0) return "";
	return `${GREEN$1}+${row.la}${RESET$1}${DIM}/${RESET$1}${RED$1}−${row.lr}${RESET$1}`;
}
function rateStrip({ now, row }) {
	const segs = [];
	for (const limit of row.rateRows) {
		const [intpText, fracp = ""] = limit.pctText.split(".");
		let f = 0;
		let scale = 1;
		for (const digit of fracp) {
			f = f * 10 + Number(digit);
			scale *= 10;
		}
		const intp = Number(intpText);
		const value = intp * scale + f;
		const col = value < 70 * scale ? GREEN$1 : value < 90 * scale ? YELLOW$1 : RED$1;
		const full = trunc(value * 14 / (100 * scale));
		const idx = trunc(value * 14 % (100 * scale) * 8 / (100 * scale));
		let bar = col;
		for (let i = 0; i < 14; i++) if (i < full) bar += "█";
		else if (i === full) bar += PART[idx];
		else bar += `${DIM}░`;
		const lbl = fracp === "" || f * 2 < scale ? intp : f * 2 > scale ? intp + 1 : intp + intp % 2;
		const s = limit.resets - now;
		let dur;
		if (s >= 3600) dur = `${trunc(s / 3600)}h${pad2(trunc(s % 3600 / 60))}m`;
		else {
			const sec = (s % 60 + 60) % 60;
			dur = `${trunc((s - sec) / 60)}m${pad2(sec)}s`;
		}
		segs.push(`${DIM}${limit.label}${RESET$1} ${bar}${RESET$1} ${BOLD}${lbl}%${RESET$1} ${DIM}· resets ${dur}${RESET$1}`);
	}
	return segs.join(`  ${DIM}│${RESET$1}  `);
}
function emptySegment() {
	return "";
}
function barFlat6(input) {
	return barFlatAt(input, 6);
}
function barFlat4(input) {
	return barFlatAt(input, 4);
}
function barPercent({ row }) {
	return `${row.pct}%`;
}
var SEGMENTS = {
	ahead: {
		arrows: aheadArrows,
		none: emptySegment
	},
	bar: {
		flat4: barFlat4,
		flat6: barFlat6,
		flat: barFlat,
		gauge: barGauge,
		none: emptySegment,
		percent: barPercent
	},
	branch: {
		full: branchFull,
		icon: branchIcon,
		initials: branchInitials,
		last: branchLast,
		none: emptySegment
	},
	cache: {
		coldin: cacheColdin,
		fuse: cacheFuse,
		hit: cacheHit,
		none: emptySegment
	},
	cost: {
		burn: costBurn,
		none: emptySegment,
		plain: costPlain
	},
	cwd: {
		base: cwdBase,
		full: cwdFull,
		icon: cwdIcon,
		init: cwdInit,
		tail: cwdTail
	},
	duration: {
		clock: durationClock,
		hours: durationHours,
		none: emptySegment
	},
	effort: {
		dim: effortDim,
		hidden: emptySegment,
		plain: effortPlain
	},
	lines: {
		diffstat: linesDiffstat,
		none: emptySegment
	},
	model: {
		block: modelBlock,
		pill: modelPill,
		plain: modelPlain,
		zen: modelZen
	},
	pr: {
		badge: prBadge,
		none: emptySegment
	},
	rate: {
		none: emptySegment,
		strip: rateStrip
	},
	state: {
		none: emptySegment,
		pills: statePills
	},
	status: {
		counts: statusCounts,
		icons: statusIcons,
		none: emptySegment
	},
	tokens: {
		compact: tokensCompact,
		full: tokensFull,
		free: tokensFree,
		none: emptySegment
	}
};
function renderSegment(item, alt, input) {
	const segment = SEGMENTS[item]?.[alt];
	return segment === void 0 ? "" : segment(input);
}
function styleSeparators(alt) {
	switch (alt) {
		case "bare": return {
			join: "  ",
			sep: "   "
		};
		case "dim": return {
			join: " ",
			sep: `${DIM} │ ${RESET$1}`
		};
		case "dots": return {
			join: " · ",
			sep: " · "
		};
		default: return {
			join: " ",
			sep: " │ "
		};
	}
}
//#endregion
//#region src/render/engine.ts
var RUNG_ITEMS = Object.keys(RUNG_ORDERS);
function stripSgr(text) {
	return text.replace(/\x1b\[[0-9;]*m/g, "");
}
function vlen$1(text) {
	const plain = stripSgr(text);
	let n = Array.from(plain).length;
	for (const ch of plain) if (ch === "⚡") n += 1;
	return n;
}
function warn(message) {
	process.stderr.write(`${message}\n`);
}
function stripModelSuffix(name) {
	const at = name.lastIndexOf("[");
	const cut = at === -1 ? name : name.slice(0, at);
	return cut.endsWith(" ") ? cut.slice(0, -1) : cut;
}
function resolvePicks(picks) {
	const resolved = {};
	for (const spec of ITEMS) {
		const pick = picks?.[spec.item] ?? spec.default;
		if (spec.alternatives.includes(pick)) resolved[spec.item] = pick;
		else {
			warn(`statusline: ${spec.item}=${pick} is not available, using ${spec.item}=${spec.default}`);
			resolved[spec.item] = spec.default;
		}
	}
	return resolved;
}
function parseLayout(layout, known) {
	let parsed;
	try {
		parsed = parseClusters(layout);
	} catch (e) {
		warn(`statusline: ${e.message}`);
		return [];
	}
	const clusters = [];
	for (const words of parsed) {
		const kept = words.filter((word) => {
			if (known.has(word)) return true;
			warn(`statusline: layout item '${word}' is not available, skipped`);
			return false;
		});
		if (kept.length > 0) clusters.push(kept);
	}
	return clusters;
}
function renderStatusline(input) {
	const row = parseRow(input.payload);
	const git = readGit(row.dir, { home: input.home });
	const picks = resolvePicks(input.picks);
	const { join, sep } = styleSeparators(picks.style);
	const clusters = parseLayout(input.layout ?? "{model effort state} {cwd branch status ahead pr} {bar tokens cache} {cost} {duration} {lines} {rate}", new Set(ITEMS.map((spec) => spec.item)));
	const wrapAt = clusters.length > 2 ? 2 : 1;
	let width = input.columns;
	if (width === void 0 || !Number.isInteger(width) || width < 0) width = 200;
	if (width < 20) width = 20;
	const avail = width - 3;
	let model = row.model;
	const initialRungs = RUNG_ITEMS.map((item) => [item, picks[item]]);
	function segmentInput() {
		return {
			git,
			home: input.home,
			model,
			now: input.now,
			row
		};
	}
	function compose(mode) {
		const from = mode === "l2" ? wrapAt : 0;
		const to = mode === "l1" ? wrapAt : clusters.length;
		let line = "";
		let first = true;
		for (let ci = from; ci < to; ci++) {
			let cseg = "";
			let cf = true;
			for (const item of clusters[ci]) {
				const out = renderSegment(item, picks[item], segmentInput());
				if (out === "") continue;
				if (cf) {
					cseg = out;
					cf = false;
				} else cseg += join + out;
			}
			if (cseg === "") continue;
			if (first) {
				line = cseg;
				first = false;
			} else line += sep + cseg;
		}
		return line;
	}
	function fits(line) {
		return vlen$1(line) <= avail;
	}
	function demote(item, target) {
		const order = RUNG_ORDERS[item];
		if (order === void 0) return;
		const at = order.indexOf(picks[item]);
		if (at === -1) return;
		if (order.slice(at + 1).includes(target)) picks[item] = target;
	}
	function resetRungs() {
		model = row.model;
		for (const [item, pick] of initialRungs) picks[item] = pick;
	}
	function applyStep(step) {
		if (step[0] === "model" && step[1] === "strip") model = stripModelSuffix(model);
		else demote(step[0], step[1]);
	}
	function fit(mode, steps) {
		let out = compose(mode);
		if (fits(out)) return out;
		for (const step of steps) {
			applyStep(step);
			out = compose(mode);
			if (fits(out)) return out;
		}
		return out;
	}
	function emit(line) {
		return `${input.noColor === true ? stripSgr(line) : line}\n`;
	}
	const full = fit("full", FULL_STEPS);
	if (fits(full)) return emit(full);
	resetRungs();
	const l1 = fit("l1", L1_STEPS);
	const l2 = fit("l2", L2_STEPS);
	return emit(l1) + emit(l2);
}
//#endregion
//#region src/render/panel.ts
var CYAN = "\x1B[36m";
var GREEN = "\x1B[32m";
var RED = "\x1B[31m";
var RESET = "\x1B[0m";
var YELLOW = "\x1B[33m";
var MS_THRESHOLD = 2e11;
var STEPS = [
	["descd", 1],
	["durd", 1],
	["statd", 1],
	["barb", 6],
	["modeld", 1],
	["barb", 4],
	["barb", 0],
	["modeld", 2],
	["statd", 2]
];
function field(source, key, fallback) {
	return orElse(source[key], fallback);
}
function cell(value) {
	return tsvEscape(jqText(value));
}
function truncateDesc(desc) {
	const chars = Array.from(desc);
	return chars.length > 24 ? `${chars.slice(0, 23).join("")}…` : desc;
}
function intValue(text) {
	return /^-?\d+$/.test(text) ? Number(text) : null;
}
function stylePick(picks) {
	const spec = specFor("style");
	if (spec === void 0) return "plain";
	const wanted = picks?.style ?? "";
	const alt = wanted === "" ? spec.default : wanted;
	if (!spec.alternatives.includes(alt)) {
		warn(`statusline: style=${alt} is not available, using style=${spec.default}`);
		return spec.default;
	}
	return alt;
}
function availColumns(tick) {
	const text = jqText(isRecord(tick) ? field(tick, "columns", 200) : 200);
	const columns = /^\d+$/.test(text) ? Number(text) : 200;
	return Math.max(columns, 20) - 1;
}
function extractFields(task) {
	return {
		ctx: cell(field(task, "contextWindowSize", 0)),
		desc: cell(truncateDesc(jqText(field(task, "description", "")))),
		effort: cell(field(task, "effort", "")),
		id: cell(field(task, "id", "")),
		label: cell(field(task, "label", "")),
		model: cell(field(task, "model", "")),
		name: cell(field(task, "name", "")),
		start: cell(field(task, "startTime", 0)),
		tokens: cell(field(task, "tokenCount", 0))
	};
}
function makeBar(pct, width) {
	let f = Math.trunc(pct * width / 100);
	if (f > width) f = width;
	let bar = "";
	for (let i = 0; i < width; i++) bar += i < f ? "█" : "░";
	return bar;
}
function duration(startText, now) {
	const start = intValue(startText);
	if (start === null || start <= 0) return "";
	const seconds = start > MS_THRESHOLD ? Math.trunc(start / 1e3) : start;
	const elapsed = Math.trunc(now) - seconds;
	if (elapsed < 0) return "";
	return fmtDuration(Math.trunc(elapsed / 60));
}
function rowFormats(fields, now) {
	const tokens = intValue(fields.tokens) ?? 0;
	const ctx = intValue(fields.ctx) ?? 0;
	let ctxText = fields.ctx;
	if (ctx >= 1e6) ctxText = fmtM(ctx);
	else if (ctx >= 1e3) ctxText = fmtK(ctx, 0);
	return {
		ctx: ctxText,
		dur: duration(fields.start, now),
		tickTok: tokens >= 1e3 ? fmtK(tokens, 0) : String(tokens),
		tokens: tokens >= 1e3 ? fmtK(tokens, 1) : String(tokens)
	};
}
function renderRow(fields, formats, state, sep) {
	let s = fields.label === "" ? fields.name : fields.label;
	if (fields.desc !== "" && fields.desc !== fields.label && state.descd === 0) s += ` ${fields.desc}`;
	if (fields.model !== "") {
		let name = fields.model;
		if (state.modeld >= 1) name = stripModelSuffix(name);
		const effort = state.modeld >= 2 ? "" : fields.effort;
		if (effort !== "") name += ` ${effort}`;
		s += `${sep}${CYAN}${name}${RESET}`;
	}
	const ctx = intValue(fields.ctx);
	if (ctx !== null && ctx > 0) {
		const tokens = intValue(fields.tokens) ?? 0;
		const pct = Math.trunc(tokens * 100 / ctx);
		const barColor = pct >= 90 ? RED : pct >= 70 ? YELLOW : GREEN;
		if (state.barb > 0) s += `${sep}${barColor}${makeBar(pct, state.barb)}${RESET} ${pct}%`;
		else s += `${sep}${barColor}${pct}%${RESET}`;
		const stats = state.statd === 1 ? formats.tickTok : state.statd === 2 ? "" : `${formats.tokens}/${formats.ctx}`;
		if (stats !== "") s += ` ${stats}`;
	}
	if (formats.dur !== "" && state.durd === 0) s += `${sep}${formats.dur}`;
	return s;
}
function vlen(text) {
	return Array.from(stripSgr(text)).length;
}
function fitRow(fields, formats, sep, avail) {
	const state = {
		barb: 10,
		descd: 0,
		durd: 0,
		modeld: 0,
		statd: 0
	};
	let out = renderRow(fields, formats, state, sep);
	if (vlen(out) <= avail) return out;
	for (const [key, value] of STEPS) {
		state[key] = value;
		out = renderRow(fields, formats, state, sep);
		if (vlen(out) <= avail) return out;
	}
	return out;
}
function emitLine(id, content) {
	return `{"id":${JSON.stringify(id)},"content":${JSON.stringify(content)}}`;
}
function renderPanel(input) {
	const tick = JSON.parse(input.payload);
	const avail = availColumns(tick);
	const sep = styleSeparators(stylePick(input.picks)).sep;
	const tasks = isRecord(tick) && Array.isArray(tick.tasks) ? tick.tasks : [];
	let out = "";
	for (const task of tasks) {
		if (!isRecord(task)) continue;
		const fields = extractFields(task);
		if (fields.id === "") continue;
		const row = fitRow(fields, rowFormats(fields, input.now), sep, avail);
		const content = input.noColor === true ? stripSgr(row) : row;
		out += `${emitLine(fields.id, content)}\n`;
	}
	return out;
}
//#endregion
//#region src/themes.ts
var THEMES = {
	quiet: {
		layout: "{model cwd}",
		summary: "model and directory, nothing else",
		variants: {
			cwd: "tail",
			model: "zen",
			style: "bare"
		}
	},
	classic: {
		layout: DEFAULT_LAYOUT,
		summary: "the shipped defaults, named",
		variants: {}
	},
	lean: {
		layout: DEFAULT_LAYOUT,
		summary: "text only, no graphics",
		variants: {
			model: "plain",
			effort: "dim",
			state: "none",
			cwd: "init",
			branch: "initials",
			status: "counts",
			ahead: "arrows",
			pr: "badge",
			bar: "percent",
			tokens: "full",
			cache: "hit",
			cost: "plain",
			duration: "clock",
			lines: "diffstat",
			rate: "none",
			style: "dots"
		}
	},
	rich: {
		layout: DEFAULT_LAYOUT,
		summary: "every gauge and counter",
		variants: {
			model: "pill",
			effort: "plain",
			state: "pills",
			cwd: "icon",
			branch: "icon",
			status: "icons",
			ahead: "arrows",
			pr: "badge",
			bar: "gauge",
			tokens: "full",
			cache: "fuse",
			cost: "burn",
			duration: "clock",
			lines: "diffstat",
			rate: "strip",
			style: "plain"
		}
	},
	custom: {
		layout: DEFAULT_LAYOUT,
		summary: "bare; you decide everything",
		variants: {
			model: "zen",
			effort: "hidden",
			state: "none",
			cwd: "base",
			branch: "none",
			status: "none",
			ahead: "none",
			pr: "none",
			bar: "none",
			tokens: "none",
			cache: "none",
			cost: "none",
			duration: "none",
			lines: "none",
			rate: "none",
			style: "bare"
		}
	}
};
//#endregion
//#region src/render/theme.ts
function resolvePaint(input) {
	const name = input.theme;
	const theme = name === void 0 ? void 0 : THEMES[name];
	if (name !== void 0 && theme === void 0) warn(`statusline: theme=${name} is not a known theme, ignored`);
	return {
		layout: input.layout ?? theme?.layout ?? "{model effort state} {cwd branch status ahead pr} {bar tokens cache} {cost} {duration} {lines} {rate}",
		picks: {
			...theme?.variants ?? {},
			...input.picks
		}
	};
}
//#endregion
//#region src/render/entry.ts
function readStdin() {
	return new Promise((resolve, reject) => {
		let payload = "";
		process.stdin.setEncoding("utf8");
		process.stdin.on("data", (chunk) => {
			payload += chunk;
		});
		process.stdin.on("end", () => {
			resolve(payload);
		});
		process.stdin.on("error", reject);
	});
}
function columnsFromEnv(text) {
	if (text === void 0 || text === "" || !/^\d+$/.test(text)) return;
	return Number(text);
}
async function main() {
	const argv = parseArgv(process.argv.slice(2));
	for (const warning of argv.warnings) process.stderr.write(`${warning}\n`);
	const payload = await readStdin();
	const env = process.env;
	const home = env.HOME ?? "";
	const noColor = (env.NO_COLOR ?? "") !== "";
	const now = argv.now ?? Math.floor(Date.now() / 1e3);
	const paint = resolvePaint(argv);
	if (argv.mode === "panel") {
		capturePayload(home, "tick", payload);
		process.stdout.write(renderPanel({
			now,
			payload,
			picks: paint.picks,
			noColor
		}));
		return;
	}
	capturePayload(home, "main", payload);
	const columns = columnsFromEnv(env.COLUMNS);
	process.stdout.write(renderStatusline({
		home,
		now,
		payload,
		picks: paint.picks,
		noColor,
		layout: paint.layout,
		...columns === void 0 ? {} : { columns }
	}));
}
await main();
//#endregion
export {};

//# sourceMappingURL=render.mjs.map