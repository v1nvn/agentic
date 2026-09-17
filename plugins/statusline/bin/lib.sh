default_pick() {
    case $1 in
        model) echo plain ;;    effort) echo plain ;;    state) echo none ;;
        cwd) echo init ;;       branch) echo initials ;; status) echo counts ;;
        ahead) echo none ;;     pr) echo none ;;
        bar) echo flat ;;       tokens) echo full ;;     cache) echo hit ;;
        cost) echo plain ;;     duration) echo clock ;;  lines) echo none ;;
        rate) echo none ;;      style) echo plain ;;
    esac
}

read_picks() {
    local c line k v picks=$HOME/.claude/plugins/data/statusline-agentic/picks
    for c in "$@"; do
        eval "PICK_$c=\$(default_pick \$c)"
    done
    if [ -f "$picks" ]; then
        while IFS= read -r line; do
            case "$line" in ''|\#*) continue ;; esac
            k=${line%%=*}; v=${line#*=}
            case " $* " in *" $k "*) eval "PICK_$k=\$v" ;; esac
        done < "$picks"
    fi
}

check_picks() {
    local c alt
    for c in "$@"; do
        eval "alt=\${PICK_$c}"
        if ! declare -f "seg_${c}_${alt}" >/dev/null; then
            echo "statusline: ${c}=${alt} is not available, using ${c}=$(default_pick "$c")" >&2
            eval "PICK_$c=\$(default_pick \$c)"
        fi
    done
}
