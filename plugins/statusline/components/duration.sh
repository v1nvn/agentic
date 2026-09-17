# duration - wall-clock session time. alternatives: clock (current) | hours | none
seg_duration_clock() {
    printf '%dm%02ds' $((DURATION_MS / 60000)) $(((DURATION_MS % 60000) / 1000))
}
seg_duration_hours() {
    local m=$((DURATION_MS / 60000))
    printf '%dh%02dm' $((m / 60)) $((m % 60))
}
seg_duration_none() { :; }
