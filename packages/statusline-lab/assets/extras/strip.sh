# rate=strip solo preview — python3 lives lab-side only; the runtime stays bash
input=$(cat)
: ${NOW:=$(date +%s)}
python3 - "$input" "$NOW" <<'EOF'
import sys, json
d = json.loads(sys.argv[1]); now = int(sys.argv[2])
rl = d.get("rate_limits") or {}
def bar(p, w=14):
    exact = p/100*w; full = int(exact); frac = exact-full
    partials = '▏▎▍▌▋▊▉█'
    col = "\033[32m" if p < 70 else ("\033[33m" if p < 90 else "\033[31m")
    out = col
    for i in range(w):
        if i < full: out += "█"
        elif i == full: out += partials[min(int(frac*8), 7)]
        else: out += "\033[2m░"
    return out + "\033[0m"
def dur(s):
    s = int(s)
    if s >= 3600: return f"{s//3600}h{int(s%3600/60):02d}m"
    return f"{s//60}m{int(s%60):02d}s"
segs = []
for key, label in (("five_hour", "5h"), ("seven_day", "7d"), ("spend_limit", "spend")):
    v = rl.get(key)
    if not v: continue
    p = v["used_percentage"]
    segs.append(f"\033[2m{label}\033[0m {bar(p)} \033[1m{p:.0f}%\033[0m \033[2m· resets {dur(v['resets_at']-now)}\033[0m")
print("  \033[2m│\033[0m  ".join(segs), end="")
EOF
