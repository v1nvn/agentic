# cost - session spend. alternatives: plain (current) | burn | none
seg_cost_plain() {
    if [ "$(awk -v c="$COST" 'BEGIN{print (c >= 0.005) ? 1 : 0}')" = 1 ]; then
        printf '%s' "${YELLOW}$(awk -v c="$COST" 'BEGIN{printf "$%.2f", c}')${RESET}"
    fi
}
seg_cost_burn() {
    local hr burn
    hr=$(awk -v d="$DURATION_MS" 'BEGIN{print d/3600000}')
    burn=$(awk -v c="$COST" -v h="$hr" 'BEGIN{if(h>0.02) printf "%.2f", c/h; else print 0}')
    local out
    out="$(seg_cost_plain)"
    if [ -n "$burn" ] && [ "$burn" != "0.00" ]; then out="$out ${DIM}· \$${burn}/hr${RESET}"; fi
    printf '%s' "$out"
}
seg_cost_none() { :; }
