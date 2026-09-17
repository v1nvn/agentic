# bar=gauge solo preview — python3 lives lab-side only; the runtime stays bash
input=$(cat)
PCT=$(printf '%s' "$input" | jq -r '.context_window.used_percentage // 0')
PCT=${PCT%%.*}; [ -z "$PCT" ] && PCT=0
python3 - "$PCT" <<'EOF'
import sys, colorsys
pct=float(sys.argv[1])
w=26; partials='▏▎▍▌▋▊▉█'
def heat(t):
    t=max(0.0,min(1.0,t)); r,g,b=colorsys.hsv_to_rgb((1-t)*0.33,0.85,0.95)
    return f"\033[38;2;{int(r*255)};{int(g*255)};{int(b*255)}m"
exact=pct/100*w; full=int(exact); frac=exact-full; mark=int(0.8*w)
bar=""
for i in range(w):
    cell=partials[min(int(frac*8),7)] if i==full else ("█" if i<full else "░")
    if i==mark: col,cell="\033[1;97m",("┃" if i<=full else "│")
    else: col=heat((i+0.5)/w) if i<=full else "\033[38;2;68;71;90m"
    bar+=col+cell
moon="○◔◑◕●"[min(int(pct/20),4)]
print(f"{moon} {heat(pct/100)}{bar}\033[0m \033[1;97m{pct:.0f}%\033[0m", end="")
EOF
