# lines - diffstat of the session. alternatives: none (current) | diffstat
seg_lines_none() { :; }
seg_lines_diffstat() {
    if [ "$LA" -gt 0 ] || [ "$LR" -gt 0 ]; then
        printf '%s' "${GREEN}+${LA}${RESET}${DIM}/${RESET}${RED}−${LR}${RESET}"
    fi
}
