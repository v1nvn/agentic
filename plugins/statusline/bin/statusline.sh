input=$(cat)
RUNTIME=$(cd "$(dirname "$0")/.." && pwd)

CYAN=$'\033[36m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; RED=$'\033[31m'; PURPLE=$'\033[35m'; BLUE=$'\033[34m'; DIM=$'\033[2m'; RESET=$'\033[0m'
SHORT_AT=15
: ${NOW:=$(date +%s)}

row=$(printf '%s' "$input" | jq -r 2>/dev/null '[
  .model.display_name                 // "",
  .workspace.current_dir              // "",
  .cost.total_cost_usd                // 0,
  .context_window.used_percentage     // 0,
  .cost.total_duration_ms             // 0,
  .context_window.total_input_tokens  // 0,
  .context_window.context_window_size // 0,
  .effort.level                       // "",
  .prompt_cache.hit_ratio             // "",
  .prompt_cache.warm                  // false,
  .prompt_cache.expires_at            // 0,
  .prompt_cache.ttl                   // "",
  .vim.mode                           // "",
  .thinking.enabled                   // false,
  .worktree.name                      // "",
  .agent.name                         // "",
  .pr.number                          // "",
  .pr.review_state                    // "",
  .cost.total_lines_added             // 0,
  .cost.total_lines_removed           // 0,
  .output_style.name                  // ""
] | @tsv')
row=${row//$'\t'/$'\x1f'}
IFS=$'\x1f' read -r MODEL DIR COST PCT DURATION_MS TOKENS CTX_SIZE EFFORT HIT \
    WARM EXPIRES TTL VIM THINK WT AGENT PRN PRS LA LR STYLE <<EOF
$row
EOF

PCT=${PCT%%.*}; [ -z "$PCT" ] && PCT=0
: ${COST:=0} ${DURATION_MS:=0} ${TOKENS:=0} ${CTX_SIZE:=0} ${LA:=0} ${LR:=0}

BRANCH=""; STAGED=0; MODIFIED=0; AHEAD=0; BEHIND=0; UNTR=0; STASH=0
if [ -n "$DIR" ] && git -C "$DIR" rev-parse --git-dir >/dev/null 2>&1; then
    while IFS= read -r line; do
        case "$line" in
            "# branch.head "*) BRANCH="${line#"# branch.head "}" ;;
            [12]" "*)
                xy=${line:2:2}
                [ "${xy:0:1}" != "." ] && STAGED=$((STAGED + 1))
                [ "${xy:1:1}" != "." ] && MODIFIED=$((MODIFIED + 1))
                ;;
        esac
    done <<EOF2
$(git -C "$DIR" status --porcelain=v2 --branch 2>/dev/null)
EOF2
    [ "$BRANCH" = "(detached)" ] && BRANCH=""
    AHEAD=$(git -C "$DIR" rev-list --count '@{u}..HEAD' 2>/dev/null)
    BEHIND=$(git -C "$DIR" rev-list --count 'HEAD..@{u}' 2>/dev/null)
    UNTR=$(git -C "$DIR" ls-files --others --exclude-standard 2>/dev/null | wc -l | tr -d ' ')
    STASH=$(git -C "$DIR" stash list 2>/dev/null | wc -l | tr -d ' ')
fi
: ${AHEAD:=0} ${BEHIND:=0}

_slash_parts() {
    local c oldIFS=$IFS
    PARTS=()
    IFS=/
    for c in $1; do [ -n "$c" ] && PARTS+=("$c"); done
    IFS=$oldIFS
}
_split_path() {
    local p=$1
    SPLIT_LEAD=""
    [ "${p#"$HOME"}" != "$p" ] && p="~${p#"$HOME"}"
    SPLIT_P="$p"
    [ "${p#/}" != "$p" ] && SPLIT_LEAD="/"
    _slash_parts "$p"
}
_path_init() {
    local out i ini
    _split_path "$1"
    local n=${#PARTS[@]}
    if [ "$n" -le 2 ]; then printf '%s' "$SPLIT_P"; return; fi
    out="${SPLIT_LEAD}${PARTS[0]}"
    for ((i = 1; i < n - 1; i++)); do
        ini="${PARTS[i]:0:1}"
        case "${PARTS[i]}" in .*) ini="${PARTS[i]:0:2}" ;; esac
        out="$out/$ini"
    done
    printf '%s/%s' "$out" "${PARTS[n - 1]}"
}
_path_tail() {
    local out i cnt lim=$2
    _split_path "$1"
    cnt=${#PARTS[@]}
    if [ "$cnt" -le "$lim" ] || [ "$cnt" -le 1 ]; then printf '%s' "$SPLIT_P"; return; fi
    out="${SPLIT_LEAD}${PARTS[0]}/…"
    for ((i = cnt - lim; i < cnt; i++)); do out="$out/${PARTS[i]}"; done
    printf '%s' "$out"
}

for f in "$RUNTIME"/components/*.sh; do source "$f"; done

default_pick() {
    case $1 in
        model) echo plain ;;    effort) echo plain ;;    state) echo none ;;
        cwd) echo init ;;       branch) echo initials ;; status) echo counts ;;
        ahead) echo none ;;     pr) echo none ;;
        bar) echo flat ;;       tokens) echo full ;;     cache) echo hit ;;
        cost) echo plain ;;     duration) echo clock ;;  lines) echo none ;;
        rate) echo none ;;      style) echo plain ;;
    esac
}
COMPS="model effort state cwd branch status ahead pr bar tokens cache cost duration lines rate style"
for c in $COMPS; do
    eval "PICK_$c=\$(default_pick \$c)"
done
PICKS_FILE=$HOME/.claude/plugins/data/statusline-agentic/picks
if [ -f "$PICKS_FILE" ]; then
    while IFS= read -r line; do
        case "$line" in ''|\#*) continue ;; esac
        k=${line%%=*}; v=${line#*=}
        case " $COMPS " in *" $k "*) eval "PICK_$k=\$v" ;; esac
    done < "$PICKS_FILE"
fi
want_seg=0; seg_comp=""
for a in "$@"; do
    if [ "$a" = "--seg" ]; then want_seg=1; continue; fi
    k=${a%%=*}; v=${a#*=}
    case " $COMPS " in *" $k "*)
        if [ "$want_seg" = 1 ] && [ -z "$seg_comp" ]; then seg_comp=$k; fi
        eval "PICK_$k=\$v" ;;
    esac
done
for c in $COMPS; do
    eval "alt=\${PICK_$c}"
    if ! declare -f "seg_${c}_${alt}" >/dev/null; then
        echo "statusline: ${c}=${alt} is not available, using ${c}=$(default_pick "$c")" >&2
        eval "PICK_$c=\$(default_pick \$c)"
    fi
done

if [ "$want_seg" = 1 ]; then
    if [ -n "$seg_comp" ]; then
        eval "alt=\${PICK_${seg_comp}}"
        "seg_${seg_comp}_${alt}"
    else
        echo "statusline: --seg needs a component, e.g. statusline.sh --seg bar=percent" >&2
    fi
    exit 0
fi

"seg_style_${PICK_style}"
CLUSTERS=("model effort state" "cwd branch status ahead pr" "bar tokens cache" "cost" "duration" "lines" "rate")
LINE=""; cfirst_out=1
for cl in "${CLUSTERS[@]}"; do
    CSEG=""; cfirst=1
    for comp in $cl; do
        eval "alt=\${PICK_$comp}"
        out=$("seg_${comp}_${alt}")
        [ -n "$out" ] || continue
        if [ "$cfirst" = 1 ]; then CSEG="$out"; cfirst=0
        else CSEG="$CSEG$JOIN$out"; fi
    done
    [ -z "$CSEG" ] && continue
    if [ "$cfirst_out" = 1 ]; then LINE="$CSEG"; cfirst_out=0
    else LINE="$LINE$SEP$CSEG"; fi
done
printf '%s\n' "$LINE"
