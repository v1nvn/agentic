# branch - git branch name. alternatives: initials (current) | full | last | icon
seg_branch_initials() {
    local out="" i n
    if [ -z "$BRANCH" ]; then return; fi
    if [ "${#BRANCH}" -le "$SHORT_AT" ]; then printf '%s' "$BRANCH"; return; fi
    _slash_parts "$BRANCH"
    n=${#PARTS[@]}
    if [ "$n" -le 1 ]; then printf '%s' "$BRANCH"; return; fi
    for ((i = 0; i < n - 1; i++)); do out="$out${PARTS[i]:0:1}/"; done
    printf '%s%s' "$out" "${PARTS[n - 1]}"
}
seg_branch_full() { printf '%s' "$BRANCH"; }
seg_branch_last() { printf '%s' "${BRANCH##*/}"; }
seg_branch_icon() {
    if [ -n "$BRANCH" ]; then printf '%s' $'\356\202\240 '"$BRANCH"; fi
}
