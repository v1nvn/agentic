# status - working tree changes. alternatives: counts (current) | icons | none
seg_status_counts() {
    local c=""
    if [ -z "$BRANCH" ]; then return; fi
    if [ "$STAGED" -gt 0 ]; then c="${GREEN}+${STAGED}${RESET}"; fi
    if [ "$MODIFIED" -gt 0 ]; then c="$c ${YELLOW}~${MODIFIED}${RESET}"; fi
    printf '%s' "$c"
}
seg_status_icons() {
    local out="" sep=""
    if [ -z "$BRANCH" ]; then return; fi
    if [ "$STAGED" -gt 0 ]; then out="${GREEN}●${STAGED}${RESET}"; sep=" "; fi
    if [ "$MODIFIED" -gt 0 ]; then out="$out${sep}${YELLOW}✎${MODIFIED}${RESET}"; sep=" "; fi
    if [ "${UNTR:-0}" -gt 0 ]; then out="$out${sep}${CYAN}+${UNTR}${RESET}"; sep=" "; fi
    if [ "${STASH:-0}" -gt 0 ]; then out="$out${sep}${PURPLE}⚑${STASH}${RESET}"; fi
    printf '%s' "$out"
}
seg_status_none() { :; }
