# bar - context window visualization of used percentage.
# alternatives: flat (current) | gauge | percent | none
_bar_flat_w() {
    local w=$1 f e b="" col i
    f=$((PCT * w / 100))
    [ "$f" -gt "$w" ] && f=$w
    e=$((w - f))
    col=$'\033[32m'
    [ "$PCT" -ge 70 ] && col=$'\033[33m'
    [ "$PCT" -ge 90 ] && col=$'\033[31m'
    for ((i = 0; i < f; i++)); do b+="█"; done
    for ((i = 0; i < e; i++)); do b+="░"; done
    printf '%s' "${col}${b}${RESET}"
}
seg_bar_flat() { _bar_flat_w 10; }
seg_bar_gauge() {
    local p=$PCT full idx i cell col bar moon lead m
    local gray=$'\033[38;2;68;71;90m' mark=$'\033[1;97m'
    local part=('▏' '▎' '▍' '▌' '▋' '▊' '▉' '█')
    local heat=(
        $'\033[38;2;48;242;36m'  $'\033[38;2;63;242;36m'  $'\033[38;2;79;242;36m'
        $'\033[38;2;95;242;36m'  $'\033[38;2;111;242;36m' $'\033[38;2;126;242;36m'
        $'\033[38;2;142;242;36m' $'\033[38;2;158;242;36m' $'\033[38;2;173;242;36m'
        $'\033[38;2;189;242;36m' $'\033[38;2;205;242;36m' $'\033[38;2;220;242;36m'
        $'\033[38;2;236;242;36m' $'\033[38;2;242;232;36m' $'\033[38;2;242;216;36m'
        $'\033[38;2;242;200;36m' $'\033[38;2;242;185;36m' $'\033[38;2;242;169;36m'
        $'\033[38;2;242;153;36m' $'\033[38;2;242;138;36m' $'\033[38;2;242;122;36m'
        $'\033[38;2;242;106;36m' $'\033[38;2;242;91;36m'  $'\033[38;2;242;75;36m'
        $'\033[38;2;242;59;36m'  $'\033[38;2;242;44;36m'
    )
    [ "$p" -gt 100 ] && p=100
    [ "$p" -lt 0 ] && p=0
    full=$((p * 26 / 100))
    idx=$(((p * 26 % 100) * 8 / 100))
    if [ "$p" -ge 50 ]; then
        lead=$(printf '\033[38;2;242;%d;36m' $((4845 * (15000 + 1683 * (100 - p)) / 2000000)))
    else
        lead=$(printf '\033[38;2;%d;242;36m' $((4845 * (185000 - 1683 * (100 - p)) / 2000000)))
    fi
    m=$((p / 20))
    [ "$m" -gt 4 ] && m=4
    case $m in
        0) moon=○ ;; 1) moon=◔ ;; 2) moon=◑ ;; 3) moon=◕ ;; *) moon=● ;;
    esac
    bar=""
    for ((i = 0; i < 26; i++)); do
        if [ "$i" -eq 20 ]; then
            col=$mark
            [ "$i" -le "$full" ] && cell=┃ || cell=│
        elif [ "$i" -le "$full" ]; then
            col=${heat[i]}
            [ "$i" -eq "$full" ] && cell=${part[idx]} || cell=█
        else
            col=$gray
            cell=░
        fi
        bar+="$col$cell"
    done
    printf '%s' "$moon $lead$bar${RESET} ${mark}${PCT}%${RESET}"
}
seg_bar_percent() { printf '%s' "${PCT}%"; }
seg_bar_none() { :; }
