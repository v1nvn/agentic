# tokens - context window fill in tokens. alternatives: full (current) | compact | free | none
_tokens_k() { awk -v t="$1" -v d="$2" 'BEGIN{printf "%." d "fk", t/1000}'; }
seg_tokens_full() {
    local t="$TOKENS" c="$CTX_SIZE"
    [ "$TOKENS" -ge 1000 ] && t=$(_tokens_k "$TOKENS" 1)
    if [ "$CTX_SIZE" -ge 1000000 ]; then c=$(awk -v t="$CTX_SIZE" 'BEGIN{printf "%.0fM", t/1000000}')
    elif [ "$CTX_SIZE" -ge 1000 ]; then c=$(_tokens_k "$CTX_SIZE" 0); fi
    printf '%s/%s' "$t" "$c"
}
seg_tokens_compact() {
    local t="$TOKENS"
    [ "$TOKENS" -ge 1000 ] && t=$(_tokens_k "$TOKENS" 0)
    printf '%s' "$t"
}
seg_tokens_free() {
    local free=$((CTX_SIZE - TOKENS))
    if [ "$free" -ge 1000 ]; then free=$(_tokens_k "$free" 0); fi
    printf '%s' "${DIM}${free} free${RESET}"
}
seg_tokens_none() { :; }
