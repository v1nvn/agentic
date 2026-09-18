# rate - usage limits. alternatives: none (current) | strip
seg_rate_none() { :; }
seg_rate_strip() {
    local rows key pct resets label intp fracp f scale s sec dur lbl col full rem idx i bar seg
    local bold=$'\033[1m' sep="  ${DIM}│${RESET}  "
    local part=('▏' '▎' '▍' '▌' '▋' '▊' '▉' '█')
    rows=$(printf '%s' "$input" | jq -r '
        (.rate_limits | if type == "object" then . else {} end) as $rl
        | [["5h", $rl.five_hour], ["7d", $rl.seven_day], ["spend", $rl.spend_limit]][]
        | select(.[1] != null and (.[1] | length) > 0)
        | [.[0], (.[1].used_percentage // 0), (.[1].resets_at // 0)]
        | @tsv')
    local segs=() out=""
    while IFS=$'\t' read -r label pct resets; do
        [ -n "$label" ] || continue
        case "$pct" in
            *.*) intp=${pct%%.*}; fracp=${pct#*.} ;;
            *) intp=$pct; fracp= ;;
        esac
        f=0
        scale=1
        for ((i = 0; i < ${#fracp}; i++)); do
            f=$((f * 10 + ${fracp:i:1}))
            scale=$((scale * 10))
        done
        if [ $((intp * scale + f)) -lt $((70 * scale)) ]; then col=$GREEN
        elif [ $((intp * scale + f)) -lt $((90 * scale)) ]; then col=$YELLOW
        else col=$RED; fi
        full=$(((intp * scale + f) * 14 / (100 * scale)))
        rem=$(((intp * scale + f) * 14 % (100 * scale)))
        idx=$((rem * 8 / (100 * scale)))
        bar=$col
        for ((i = 0; i < 14; i++)); do
            if [ "$i" -lt "$full" ]; then bar+="█"
            elif [ "$i" -eq "$full" ]; then bar+="${part[idx]}"
            else bar+="${DIM}░"
            fi
        done
        if [ -z "$fracp" ] || [ $((f * 2)) -lt "$scale" ]; then lbl=$intp
        elif [ $((f * 2)) -gt "$scale" ]; then lbl=$((intp + 1))
        else lbl=$((intp + intp % 2)); fi
        s=$((resets - NOW))
        if [ "$s" -ge 3600 ]; then dur=$(printf '%dh%02dm' $((s / 3600)) $((s % 3600 / 60)))
        else
            sec=$((s % 60))
            sec=$(((sec + 60) % 60))
            dur=$(printf '%dm%02ds' $(((s - sec) / 60)) "$sec")
        fi
        segs+=("${DIM}${label}${RESET} ${bar}${RESET} ${bold}${lbl}%${RESET} ${DIM}· resets ${dur}${RESET}")
    done <<< "$rows"
    for seg in "${segs[@]}"; do
        [ -n "$out" ] && out+="$sep"
        out+="$seg"
    done
    printf '%s' "$out"
}
