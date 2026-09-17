# bar - context window visualization of used percentage.
# alternatives: flat (current) | gauge | percent | none
seg_bar_flat() {
    local f=$((PCT * 10 / 100)) e b="" col
    [ "$f" -gt 10 ] && f=10
    e=$((10 - f))
    col=$'\033[32m'
    [ "$PCT" -ge 70 ] && col=$'\033[33m'
    [ "$PCT" -ge 90 ] && col=$'\033[31m'
    if [ "$f" -gt 0 ]; then b=$(printf "%${f}s" | tr ' ' '█'); fi
    if [ "$e" -gt 0 ]; then b="$b$(printf "%${e}s" | tr ' ' '░')"; fi
    printf '%s' "${col}${b}${RESET}"
}
seg_bar_percent() { printf '%s' "${DIM}${PCT}%%${RESET}"; }
seg_bar_none() { :; }
