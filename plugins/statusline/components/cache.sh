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
seg_cache_none() { :; }
