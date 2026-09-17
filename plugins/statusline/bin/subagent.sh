export LC_ALL=C

input=$(cat)
RUNTIME=$(cd "$(dirname "$0")/.." && pwd)

AVAIL=$(printf '%s' "$input" | jq -r '.columns // 200' 2>/dev/null)
case "$AVAIL" in ''|*[!0-9]*) AVAIL=200 ;; esac
[ "$AVAIL" -lt 20 ] && AVAIL=20
AVAIL=$((AVAIL - 1))

CYAN=$'\033[36m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; RED=$'\033[31m'
RESET=$'\033[0m'

source "$RUNTIME/bin/lib.sh"
source "$RUNTIME/components/style.sh"
read_picks style
check_picks style
"seg_style_$PICK_style"

vlen() {
    printf '%s' "$1" | jq -Rr 'gsub("\u001b\\[[0-9;]*m"; "") | length'
}

fmt_k() { awk "BEGIN {printf \"%.${2}fk\", $1/1000}"; }

make_bar() {
    local f=$(($1 * $2 / 100)) i b=""
    [ "$f" -gt "$2" ] && f=$2
    for ((i = 0; i < $2; i++)); do
        if [ "$i" -lt "$f" ]; then b+="█"; else b+="░"; fi
    done
    printf '%s' "$b"
}

render_row() {
    local s="" name=$MODEL eff=$EFFORT stats="" bar_color=$GREEN
    s="${LABEL:-$NAME}"
    if [ -n "$DESC" ] && [ "$DESC" != "$LABEL" ] && [ "$DESCD" -eq 0 ]; then
        s="$s $DESC"
    fi
    if [ -n "$MODEL" ]; then
        [ "$MODELD" -ge 1 ] && { name=${name%\[*}; name=${name% }; }
        [ "$MODELD" -ge 2 ] && eff=""
        [ -n "$eff" ] && name="$name $eff"
        s="$s$SEP${CYAN}${name}${RESET}"
    fi
    if [ "$CTX_SIZE" -gt 0 ] 2>/dev/null; then
        local pct=$((TOKENS * 100 / CTX_SIZE))
        [ "$pct" -ge 70 ] && bar_color=$YELLOW
        [ "$pct" -ge 90 ] && bar_color=$RED
        if [ "$BARB" -gt 0 ]; then
            s="$s$SEP${bar_color}$(make_bar "$pct" "$BARB")${RESET} ${pct}%"
        else
            s="$s$SEP${bar_color}${pct}%${RESET}"
        fi
        case $STATD in
            1) stats="$TOK_FMT" ;;
            2) stats="" ;;
            *) stats="$TOKENS_FMT/$CTX_FMT" ;;
        esac
        [ -n "$stats" ] && s="$s $stats"
    fi
    [ -n "$DUR" ] && [ "$DURD" -eq 0 ] && s="$s$SEP$DUR"
    printf '%s' "$s"
}

STEPS=('DESCD=1' 'DURD=1' 'STATD=1' 'BARB=6' 'MODELD=1' 'BARB=4' 'BARB=0' 'MODELD=2' 'STATD=2')

fit_row() {
    local step
    DESCD=0; DURD=0; STATD=0; MODELD=0; BARB=10
    ROW_OUT=$(render_row)
    [ "$(vlen "$ROW_OUT")" -le "$AVAIL" ] && return 0
    for step in "${STEPS[@]}"; do
        eval "$step"
        ROW_OUT=$(render_row)
        [ "$(vlen "$ROW_OUT")" -le "$AVAIL" ] && return 0
    done
}

: ${NOW:=$(date +%s)}
while IFS=$'\x1f' read -r ID LABEL NAME DESC MODEL EFFORT CTX_SIZE TOKENS START; do
    [ -z "$ID" ] && continue
    DUR=""
    if [ -n "$START" ] && [ "$START" -gt 0 ] 2>/dev/null; then
        [ "$START" -gt 200000000000 ] && START=$((START / 1000))
        elapsed=$((NOW - START))
        [ "$elapsed" -ge 0 ] && DUR=$(printf '%dm%02ds' $((elapsed / 60)) $((elapsed % 60)))
    fi
    TOKENS_FMT="$TOKENS"; [ "$TOKENS" -ge 1000 ] 2>/dev/null && TOKENS_FMT=$(fmt_k "$TOKENS" 1)
    TOK_FMT="$TOKENS";     [ "$TOKENS" -ge 1000 ] 2>/dev/null && TOK_FMT=$(fmt_k "$TOKENS" 0)
    CTX_FMT="$CTX_SIZE"
    if [ "$CTX_SIZE" -ge 1000000 ] 2>/dev/null; then CTX_FMT=$(awk "BEGIN {printf \"%.0fM\", $CTX_SIZE/1000000}")
    elif [ "$CTX_SIZE" -ge 1000 ] 2>/dev/null; then CTX_FMT=$(fmt_k "$CTX_SIZE" 0); fi
    fit_row
    jq -cn --arg id "$ID" --arg content "$ROW_OUT" '{id: $id, content: $content}'
done <<EOF
$(printf '%s' "$input" | jq -r '
    .tasks[]? |
    [ .id // "",
      (.label // "" | tostring),
      (.name // "" | tostring),
      (.description // "" | tostring | if 24 < length then .[0:23] + "…" else . end),
      (.model // "" | tostring),
      (.effort // "" | tostring),
      (.contextWindowSize // 0),
      (.tokenCount // 0),
      (.startTime // 0 | tostring)
    ] | @tsv' 2>/dev/null | sed $'s/\t/\x1f/g')
EOF
