# pr - PR badge. alternatives: none (current) | badge
seg_pr_none() { :; }
seg_pr_badge() {
    if [ -z "$PRN" ]; then return; fi
    local col mark
    case "$PRS" in
        approved)          col=$'\033[32m'; mark="✓" ;;
        pending)           col=$'\033[33m'; mark="⏳" ;;
        changes_requested) col=$'\033[31m'; mark="✗" ;;
        *)                 col=$'\033[90m'; mark="◌" ;;
    esac
    printf '%s' "${BLUE}#${PRN}${RESET} ${col}${mark} ${PRS}${RESET}"
}
