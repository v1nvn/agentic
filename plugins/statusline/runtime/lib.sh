DATA_DIR=$HOME/.claude/plugins/data/statusline-agentic

export DEFAULT_LAYOUT='{model effort state} {cwd branch status ahead pr} {bar tokens cache} {cost} {duration} {lines} {rate}'

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

read_config() {
    local c name
    for c in "$@"; do
        name="STATUSLINE_LAB_$(printf '%s' "$c" | tr '[:lower:]' '[:upper:]')"
        printf -v "PICK_$c" '%s' "${!name:-$(default_pick "$c")}"
    done
}

check_config() {
    local c p alt
    for c in "$@"; do
        p="PICK_$c"
        alt=${!p}
        if ! declare -f "seg_${c}_${alt}" >/dev/null; then
            echo "statusline: ${c}=${alt} is not available, using ${c}=$(default_pick "$c")" >&2
            printf -v "$p" '%s' "$(default_pick "$c")"
        fi
    done
}

capture() {
    local dest="$DATA_DIR/captures/$1"
    mkdir -p "${dest%/*}"
    printf '%s' "$2" > "${dest}.tmp"
    mv "${dest}.tmp" "$dest"
}

strip_sgr() {
    printf '%s' "$1" | sed $'s/\x1b\\[[0-9;]*m//g'
}
