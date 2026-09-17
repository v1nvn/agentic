# effort - reasoning effort word. alternatives: plain (current) | dim | hidden
seg_effort_plain() {
    if [ -n "$EFFORT" ]; then printf '%s' "${CYAN}${EFFORT}${RESET}"; fi
}
seg_effort_dim() {
    if [ -n "$EFFORT" ]; then printf '%s' "${DIM}${EFFORT}${RESET}"; fi
}
seg_effort_hidden() { :; }
