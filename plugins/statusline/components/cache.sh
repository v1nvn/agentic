# cache - prompt cache health. alternatives: hit (current) | coldin | fuse | none
_cache_hitp() { [ -n "$HIT" ] && awk -v h="$HIT" 'BEGIN{printf "%d", h*100}'; }
_cache_hcol() {
    local hp; hp=$(_cache_hitp); [ -n "$hp" ] || return
    hcol=$'\033[31m'
    [ "$hp" -ge 50 ] && hcol=$'\033[33m'
    [ "$hp" -ge 90 ] && hcol=$'\033[32m'
    printf '%s' "$hcol"
}
seg_cache_hit() {
    local hp; hp=$(_cache_hitp)
    if [ -n "$hp" ]; then printf '%s' "$(_cache_hcol)⚡${hp}%${RESET}"; fi
}
seg_cache_coldin() {
    local hp; hp=$(_cache_hitp)
    if [ -z "$hp" ]; then return; fi
    if [ "$WARM" = "true" ] && [ "$EXPIRES" -gt "$NOW" ] 2>/dev/null; then
        local mins=$(((EXPIRES - NOW) / 60))
        printf '%s' "$(_cache_hcol)⚡${hp}%${RESET} ${DIM}· cold in ${mins}m${RESET}"
    else
        printf '%s' "❄ ${DIM}cold · ${hp}%${RESET}"
    fi
}
seg_cache_fuse() {
    [ -n "$TTL" ] || return
    [ "$EXPIRES" -ne 0 ] || return
    local span=300 left full rem idx i col bar
    local part=('▏' '▎' '▍' '▌' '▋' '▊' '▉' '█')
    [ "$TTL" = "1h" ] && span=3600
    left=$((EXPIRES - NOW))
    [ "$left" -lt 0 ] && left=0
    if [ "$left" -le 0 ]; then printf '%s' "${RED}❄ cold${RESET}"; return; fi
    full=$((left * 10 / span))
    rem=$((left * 10 % span))
    if [ $((left * 4)) -gt "$span" ]; then col=$GREEN
    elif [ $((left * 25)) -gt $((span * 2)) ]; then col=$YELLOW
    else col=$RED; fi
    bar=$col
    for ((i = 0; i < 10; i++)); do
        if [ "$i" -lt "$full" ]; then bar+="▰"
        elif [ "$i" -eq "$full" ] && [ $((rem * 20)) -gt "$span" ]; then
            idx=$((rem * 8 / span))
            bar+="${part[idx]}"
        else
            bar+="${DIM}▱"
        fi
    done
    printf '%s %s%02d:%02d%s' "$bar${RESET}" "$DIM" $((left / 60)) $((left % 60)) "$RESET"
}
seg_cache_none() { :; }
