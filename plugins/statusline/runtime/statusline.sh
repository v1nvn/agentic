input=$(cat; printf x); input=${input%x}
RUNTIME=$(cd "$(dirname "$0")" && pwd)
source "$RUNTIME/lib.sh"
capture main.json "$input"

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

seg_branch_none() { :; }
seg_bar_flat6() { _bar_flat_w 6; }
seg_bar_flat4() { _bar_flat_w 4; }

COMPS="model effort state cwd branch status ahead pr bar tokens cache cost duration lines rate style"
read_config $COMPS
check_config $COMPS

"seg_style_${PICK_style}"
: "${STATUSLINE_LAB_LAYOUT:=$DEFAULT_LAYOUT}"
parse_layout() {
    CLUSTERS=()
    local rest=$STATUSLINE_LAB_LAYOUT cluster word kept
    while :; do
        cluster=${rest%%\}*}
        cluster=${cluster#*\{}
        kept=""
        for word in $cluster; do
            case " $COMPS " in
                *" $word "*) kept="$kept $word" ;;
                *) echo "statusline: layout item '$word' is not available, skipped" >&2 ;;
            esac
        done
        [ -n "$kept" ] && CLUSTERS+=("${kept# }")
        case $rest in *'}'*) rest=${rest#*\}} ;; *) break ;; esac
    done
    WRAP_AT=$(( ${#CLUSTERS[@]} > 2 ? 2 : 1 ))
}
parse_layout

WIDTH=${COLUMNS:-200}
case "$WIDTH" in ''|*[!0-9]*) WIDTH=200 ;; esac
[ "$WIDTH" -lt 20 ] && WIDTH=20
AVAIL=$((WIDTH - 3))

compose() {
    local line="" first=1 from=0 to=${#CLUSTERS[@]} ci cl comp alt out cseg cf
    case $1 in
        l1) to=$WRAP_AT ;;
        l2) from=$WRAP_AT ;;
    esac
    for ((ci = from; ci < to; ci++)); do
        cl=${CLUSTERS[ci]}
        cseg=""; cf=1
        for comp in $cl; do
            eval "alt=\${PICK_$comp}"
            out=$("seg_${comp}_${alt}")
            [ -n "$out" ] || continue
            if [ "$cf" = 1 ]; then cseg="$out"; cf=0
            else cseg="$cseg$JOIN$out"; fi
        done
        [ -z "$cseg" ] && continue
        if [ "$first" = 1 ]; then line="$cseg"; first=0
        else line="$line$SEP$cseg"; fi
    done
    COMPOSE_OUT=$line
}

vlen() {
    local plain n
    plain=$(strip_sgr "$1")
    n=$(printf '%s' "$plain" | wc -c | tr -d ' ')
    n=$((n - $(printf '%s' "$plain" | LC_ALL=C tr -d '\0-\177\300-\377' | wc -c | tr -d ' ')))
    case "$plain" in
        *⚡*) n=$((n + $(printf '%s' "$plain" | LC_ALL=C grep -o '⚡' | wc -l))) ;;
    esac
    printf '%s' "$n"
}

rung_order() {
    case $1 in
        duration) printf '%s' "clock hours none" ;;
        cache)    printf '%s' "hit coldin none" ;;
        tokens)   printf '%s' "full free compact none" ;;
        bar)      printf '%s' "flat flat6 flat4 percent none" ;;
        status)   printf '%s' "counts icons none" ;;
        branch)   printf '%s' "icon full initials last none" ;;
        cwd)      printf '%s' "icon full init tail base" ;;
        effort)   printf '%s' "plain dim hidden" ;;
    esac
}

demote() {
    local comp=$1 target=$2 order cur rest
    order=$(rung_order "$comp")
    [ -n "$order" ] || return 0
    eval "cur=\$PICK_$comp"
    case " $order " in *" $cur "*) ;; *) return 0 ;; esac
    rest=${order#*" $cur "}
    case " $rest " in *" $target "*) eval "PICK_$comp=\$target" ;; esac
}

RUNGS="duration cache tokens bar status branch cwd effort"
P0_MODEL=$MODEL
for c in $RUNGS; do eval "P0_$c=\$PICK_$c"; done
reset_rungs() {
    local c
    MODEL=$P0_MODEL
    for c in $RUNGS; do eval "PICK_$c=\$P0_$c"; done
}

FULL_STEPS=(
    'duration=none' 'cache=none' 'tokens=compact' 'bar=flat6' 'status=none'
    'branch=initials' 'cwd=init' 'branch=last' 'bar=flat4' 'model=strip'
    'bar=percent' 'branch=none' 'cwd=tail' 'effort=hidden' 'cwd=base'
    'tokens=none'
)
L1_STEPS=('status=none' 'branch=initials' 'cwd=init' 'branch=last' 'model=strip' 'branch=none' 'cwd=tail' 'effort=hidden' 'cwd=base')
L2_STEPS=('duration=none' 'cache=none' 'tokens=compact' 'bar=flat6' 'bar=flat4' 'tokens=none' 'bar=percent')

fits() { [ "$(vlen "$1")" -le "$AVAIL" ]; }

fit() {
    local mode=$1 step
    shift
    compose "$mode"; FIT_OUT=$COMPOSE_OUT
    fits "$FIT_OUT" && return 0
    for step in "$@"; do
        if [ "$step" = "model=strip" ]; then
            MODEL=${MODEL%\[*}; MODEL=${MODEL% }
        else
            demote "${step%%=*}" "${step#*=}"
        fi
        compose "$mode"; FIT_OUT=$COMPOSE_OUT
        fits "$FIT_OUT" && return 0
    done
    return 1
}

emit() {
    if [ -n "$NO_COLOR" ]; then
        printf '%s\n' "$(strip_sgr "$1")"
    else
        printf '%s\n' "$1"
    fi
}

if fit full "${FULL_STEPS[@]}"; then
    emit "$FIT_OUT"
    exit 0
fi

reset_rungs
fit l1 "${L1_STEPS[@]}"
L1=$FIT_OUT
fit l2 "${L2_STEPS[@]}"
emit "$L1"
emit "$FIT_OUT"
