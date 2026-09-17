# model - model name. alternatives: plain (current) | block | pill | zen
seg_model_plain() {
    if [ -n "$MODEL" ]; then printf '%s' "${CYAN}${MODEL}${RESET}"; fi
}
seg_model_block() {
    if [ -n "$MODEL" ]; then printf '%s' $'\033[48;5;61m\033[38;5;231m '"$MODEL"$' \033[0m'; fi
}
seg_model_pill() {
    if [ -n "$MODEL" ]; then
        printf '%s' $'\033[48;5;61m\033[38;5;231m\356\202\266 '"$MODEL"$' \356\202\264\033[0m'
    fi
}
seg_model_zen() {
    if [ -n "$MODEL" ]; then
        printf '%s' "${DIM}$(printf '%s' "$MODEL" | tr '[:upper:]' '[:lower:]')${RESET}"
    fi
}
