#!/usr/bin/env python3
"""Regenerate the run-cost report for a Claude Code session.

Usage: analyze.py <session-id> [--project <dir>] [--exclude HH:MM:SS-HH:MM:SS,...]

Reads <project>/<session-id>.jsonl and <project>/<session-id>/subagents/agent-*.jsonl
and prints the ledgers behind references/run-costs.md. Transcript contract (verified
on glm-backed sessions): assistant records are delta chunks of one model call — a
message.id may stream as several records with identical usage, and a record carrying
the full usage shape is the billed one; thinking text lives in content blocks of
type "thinking" and is never counted by usage.output_tokens_details.
"""
import argparse
import collections
import datetime
import glob
import json
import os
import re
import sys

GATE_RE = re.compile(r"yarn test|vitest|yarn build|typecheck|tsc |yarn lint|eslint|claude plugin")


def ts(s):
    return datetime.datetime.fromisoformat(s.replace("Z", "+00:00"))


def load(path):
    recs = []
    for line in open(path):
        try:
            j = json.loads(line)
        except Exception:
            continue
        if j.get("timestamp"):
            recs.append((ts(j["timestamp"]), j))
    recs.sort(key=lambda r: r[0])
    return recs


def content_blocks(j):
    c = j.get("message", {}).get("content")
    return c if isinstance(c, list) else []


def model_calls(recs):
    """One model call per message.id; usage from the full-shape record, thinking summed."""
    by_mid = collections.OrderedDict()
    for t, j in recs:
        if j.get("type") != "assistant":
            continue
        mid = j.get("message", {}).get("id")
        if mid is None:
            continue
        u = j.get("message", {}).get("usage") or {}
        full = "cache_read_input_tokens" in u
        think = sum(len(b.get("thinking") or "") for b in content_blocks(j) if b.get("type") == "thinking")
        e = by_mid.setdefault(mid, {"t": t, "usage": None, "think_chars": 0, "tools": [], "text": ""})
        if full and (e["usage"] is None or u.get("input_tokens", 0) > 0):
            e["usage"] = u
        e["think_chars"] += think
        for b in content_blocks(j):
            if b.get("type") == "tool_use":
                e["tools"].append(b)
            elif b.get("type") == "text" and b.get("text"):
                e["text"] = b["text"]
    return list(by_mid.values())


def tool_pairs(recs):
    """tool_use id -> (start, end, name, command-or-path)."""
    pend, pairs = {}, []
    for t, j in recs:
        if j.get("type") == "assistant":
            for b in content_blocks(j):
                if b.get("type") == "tool_use":
                    pend[b.get("id")] = [t, b.get("name"), b.get("input", {})]
        elif j.get("type") == "user":
            for b in content_blocks(j):
                if b.get("type") == "tool_result" and b.get("tool_use_id") in pend:
                    st, name, inp = pend.pop(b["tool_use_id"])
                    pairs.append({"start": st, "end": t, "name": name, "input": inp,
                                  "dur": (t - st).total_seconds()})
    return pairs


def first_user_text(recs):
    for t, j in recs:
        if j.get("type") != "user":
            continue
        c = j.get("message", {}).get("content")
        if isinstance(c, str) and c.strip():
            return c.strip()
        if isinstance(c, list):
            for b in c:
                if isinstance(b, dict) and b.get("type") == "text" and b.get("text", "").strip():
                    return b["text"].strip()
    return ""


def fmt_min(sec):
    return f"{sec/60:.1f}m"


def agent_ledger(name, recs, calls, exclude):
    u_all = [c["usage"] for c in calls if c["usage"]]
    inp = sum(u.get("input_tokens", 0) for u in u_all)
    cr = sum(u.get("cache_read_input_tokens", 0) for u in u_all)
    cc = sum(u.get("cache_creation_input_tokens", 0) for u in u_all)
    out = sum(u.get("output_tokens", 0) for u in u_all)
    think = sum(c["think_chars"] for c in calls) // 4
    ctxs = [u.get("input_tokens", 0) + u.get("cache_read_input_tokens", 0) for u in u_all]
    first = ctxs[0] if ctxs else 0
    hit = 100.0 * cr / (cr + inp + cc) if (cr + inp + cc) else 0.0
    standing = cr - (u_all[0].get("cache_read_input_tokens", 0) if u_all else 0)
    return {"name": name, "calls": len(calls), "input": inp, "cache_read": cr, "cache_create": cc,
            "output": out, "think": think, "avg_ctx": (inp + cr) // max(1, len(u_all)),
            "max_ctx": max(ctxs) if ctxs else 0, "first_ctx": first, "hit": hit, "standing": standing}


def in_exclude(t, windows):
    return any(a <= t <= b for a, b in windows)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("session_id")
    ap.add_argument("--project", default=os.path.expanduser("~/.claude/projects/-Users-vineet-git-agentic"))
    ap.add_argument("--exclude", default="", help="comma list HH:MM:SS-HH:MM:SS (same UTC day)")
    args = ap.parse_args()

    day = None
    windows = []
    for w in filter(None, args.exclude.split(",")):
        a, b = w.split("-")
        windows.append((a.strip(), b.strip()))

    paths = [f"{args.project}/{args.session_id}.jsonl"]
    paths += sorted(glob.glob(f"{args.project}/{args.session_id}/subagents/agent-*.jsonl"))
    agents = []
    for p in paths:
        recs = load(p)
        if not recs:
            continue
        role = "PARENT" if p.endswith(f"{args.session_id}.jsonl") else os.path.basename(p)[6:-6]
        intro = first_user_text(recs)
        if role != "PARENT":
            role = (intro[:48] or role)
        agents.append({"label": role, "recs": recs, "calls": model_calls(recs),
                       "pairs": tool_pairs(recs), "path": p})

    print("== ROLE MAP ==")
    for a in agents:
        span = a["recs"][-1][0] - a["recs"][0][0]
        print(f"  {a['recs'][0][0].strftime('%H:%M:%S')} span {fmt_min(span.total_seconds()):>8}  {a['label']}")

    print("\n== TOKEN LEDGER ==")
    print(f"  {'agent':<50} {'calls':>5} {'input':>9} {'cache_read':>11} {'out':>7} {'think':>7} {'avg_ctx':>8} {'max_ctx':>8} {'1st_ctx':>8} {'hit%':>5}")
    tot = collections.Counter()
    for a in agents:
        L = agent_ledger(a["label"], a["recs"], a["calls"], windows)
        for k in ("calls", "input", "cache_read", "output", "think"):
            tot[k] += L[k]
        print(f"  {L['name'][:50]:<50} {L['calls']:>5} {L['input']:>9,} {L['cache_read']:>11,} "
              f"{L['output']:>7,} {L['think']:>7,} {L['avg_ctx']:>8,} {L['max_ctx']:>8,} {L['first_ctx']:>8,} {L['hit']:>5.1f}")
    print(f"  {'TOTAL':<50} {tot['calls']:>5} {tot['input']:>9,} {tot['cache_read']:>11,} "
          f"{tot['output']:>7,} {tot['think']:>7,}")
    print(f"  cache hit {(100.0*tot['cache_read']/max(1,tot['cache_read']+tot['input'])):.1f}%  "
          f"read:write {tot['cache_read']+tot['input']:,} : {tot['output']:,}")

    print("\n== GATES (root vs scoped) ==")
    for a in agents:
        gates = [p for p in a["pairs"] if p["name"] == "Bash" and GATE_RE.search(p["input"].get("command", ""))]
        if not gates:
            continue
        root = [g for g in gates if not re.search(r"cd packages/|yarn workspace|REGEN_GOLDENS", g["input"].get("command", ""))]
        sc = [g for g in gates if g not in root]
        suites = sum(1 for g in root if re.match(r"\s*(cd \S+ && )?yarn test", g["input"].get("command", "")))
        print(f"  {a['label'][:44]:<44} gates {len(gates):>3}  root {len(root):>3} ({fmt_min(sum(g['dur'] for g in root)):>6}, "
              f"{suites} root suites)  scoped {len(sc):>2} ({fmt_min(sum(g['dur'] for g in sc)):>6})")

    print("\n== DUPLICATE BASH (same agent, normalized, >=2x) ==")
    for a in agents:
        seen = collections.Counter()
        for p in a["pairs"]:
            if p["name"] == "Bash":
                cmd = re.sub(r"\s+", " ", p["input"].get("command", "")).strip()
                seen[cmd] += 1
        for cmd, n in seen.items():
            if n >= 2 and len(cmd) > 20:
                print(f"  {n}x  {a['label'][:30]:<30}  {cmd[:90]}")

    print("\n== FILE READS across agents ==")
    reads = collections.defaultdict(set)
    nreads = collections.Counter()
    for a in agents:
        for p in a["pairs"]:
            if p["name"] == "Read":
                fp = p["input"].get("file_path", "")
                reads[fp].add(a["label"])
                nreads[fp] += 1
    multi = sorted(reads.items(), key=lambda kv: -len(kv[1]))
    for fp, who in multi[:15]:
        if len(who) >= 2:
            print(f"  {len(who):>2} agents {nreads[fp]:>2}x  {fp}")

    print("\n== PARENT IDLE GAPS > 2min ==")
    parent = agents[0]
    prev = parent["recs"][0]
    for t, j in parent["recs"][1:]:
        gap = (t - prev[0]).total_seconds()
        if gap > 120:
            print(f"  {prev[0].strftime('%H:%M:%S')} -> {t.strftime('%H:%M:%S')} {fmt_min(gap):>7}  "
                  f"resumed by [{j.get('type')}{('/' + j.get('subtype')) if j.get('subtype') else ''}]")
        prev = (t, j)


if __name__ == "__main__":
    sys.exit(main())
