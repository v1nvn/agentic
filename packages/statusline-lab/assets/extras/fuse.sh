# cache=fuse solo preview — python3 lives lab-side only; the runtime stays bash
input=$(cat)
TTL=$(printf '%s' "$input" | jq -r '.prompt_cache.ttl // ""')
EXPIRES=$(printf '%s' "$input" | jq -r '.prompt_cache.expires_at // 0')
: ${NOW:=$(date +%s)}
python3 - "$TTL" "$EXPIRES" "$NOW" <<'EOF'
import sys
ttl, exp, now = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
if not ttl or exp == 0:
    raise SystemExit
span = 3600 if ttl == "1h" else 300
left = max(0, exp - now)
if left <= 0:
    print("\033[31m❄ cold\033[0m", end="")
    raise SystemExit
frac = left / span
W = 10
full = int(frac * W); partial = frac * W - full
partials = '▏▎▍▌▋▊▉█'
col = "\033[32m" if frac > 0.25 else ("\033[33m" if frac > 0.08 else "\033[31m")
bar = col
for i in range(W):
    if i < full: bar += "▰"
    elif i == full and partial > 0.05: bar += partials[min(int(partial * 8), 7)]
    else: bar += "\033[2m▱"
bar += "\033[0m"
print(f"{bar} \033[2m{left//60:02d}:{left%60:02d}\033[0m", end="")
EOF
