# state - session mode badges (vim / thinking / agent / worktree).
# alternatives: none (current) | pills
seg_state_none() { :; }
_state_pill() {
    printf '\033[48;5;%sm\033[38;5;%sm%s %s %s\033[0m' "$2" "$3" $'\356\202\266' "$1" $'\356\202\264'
}
seg_state_pills() {
    local out=""
    if [ -n "$VIM" ]; then
        if [ "$VIM" = "INSERT" ]; then out="$(_state_pill "$VIM" 97 16)"
        else out="$(_state_pill "$VIM" 240 231)"; fi
    fi
    if [ "$THINK" = "true" ]; then out="$out $(_state_pill "THINK" 66 16)"; fi
    if [ -n "$AGENT" ]; then out="$out $(_state_pill "$AGENT" 60 231)"; fi
    if [ -n "$WT" ]; then out="$out $(_state_pill "wt:$WT" 131 231)"; fi
    if [ -n "$STYLE" ] && [ "$STYLE" != "default" ]; then out="$out $(_state_pill "$STYLE" 95 16)"; fi
    printf '%s' "$out"
}
