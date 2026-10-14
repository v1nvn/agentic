// Runs in the page head before first paint: a ?theme=light|dark param wins,
// otherwise the CSS prefers-color-scheme media query decides on its own.
export function themeScript(): string {
  return `<script>
(function () {
  var m = /[?&]theme=(light|dark)\\b/.exec(location.search);
  if (m) document.documentElement.setAttribute('data-theme', m[1]);
})();
</script>`;
}
