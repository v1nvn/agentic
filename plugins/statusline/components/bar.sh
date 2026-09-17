# bar - context window visualization of used percentage.
# alternatives: flat (current) | gauge | percent | none
_bar_flat_w() {
    local w=$1 f e b="" col i
    f=$((PCT * w / 100))
    [ "$f" -gt "$w" ] && f=$w
    e=$((w - f))
    col=$'\033[32m'
    [ "$PCT" -ge 70 ] && col=$'\033[33m'
    [ "$PCT" -ge 90 ] && col=$'\033[31m'
    for ((i = 0; i < f; i++)); do b+="█"; done
    for ((i = 0; i < e; i++)); do b+="░"; done
    printf '%s' "${col}${b}${RESET}"
}
seg_bar_flat() { _bar_flat_w 10; }
seg_bar_percent() { printf '%s' "${PCT}%"; }
seg_bar_none() { :; }
