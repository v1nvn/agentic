# cwd - working directory. alternatives: init (current) | full | tail | base | icon
seg_cwd_init() {
    local p
    _split_path "$DIR"
    p="$SPLIT_P"
    if [ "${#SPLIT_P}" -gt "$SHORT_AT" ]; then p=$(_path_init "$DIR"); fi
    printf '%s' "$p"
}
seg_cwd_full() { _split_path "$DIR"; printf '%s' "$SPLIT_P"; }
seg_cwd_tail() { _path_tail "$DIR" 1; }
seg_cwd_base() { printf '%s' "${DIR##*/}"; }
seg_cwd_icon() { printf '%s' $'\357\201\273 '"${DIR##*/}"; }
