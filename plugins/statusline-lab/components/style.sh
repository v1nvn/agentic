# style - separator + cluster join. alternatives: plain (current) | dots | dim | bare
# standalone (--seg) each prints a sample line so the separator is visible
seg_style_plain() { SEP=" │ "; JOIN=" "; _style_preview; }
seg_style_dots()  { SEP=" · "; JOIN=" · "; _style_preview; }
seg_style_dim()   { SEP="${DIM} │ ${RESET}"; JOIN=" "; _style_preview; }
seg_style_bare()  { SEP="   "; JOIN="  "; _style_preview; }
_style_preview() {
    if [ "$want_seg" = 1 ]; then
        printf '%s' "Opus${SEP}atlas-web${JOIN}feature/login-flow"
    fi
}
