# ahead - ahead/behind upstream. alternatives: none (current) | arrows
seg_ahead_none() { :; }
seg_ahead_arrows() {
    local out=""
    if [ "${AHEAD:-0}" -gt 0 ]; then out="${GREEN}↑${AHEAD}${RESET}"; fi
    if [ "${BEHIND:-0}" -gt 0 ]; then out="$out ${RED}↓${BEHIND}${RESET}"; fi
    printf '%s' "$out"
}
