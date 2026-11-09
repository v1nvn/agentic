export function composerHtml(): string {
  return `<footer class="composer" id="rulings-composer">
<p class="rhint" id="rulings-hint" hidden>Restored from your last visit</p>
<div class="chips" id="picks" aria-live="polite"></div>
<label class="nlabel" for="rulings-notes">Page note</label>
<textarea id="rulings-notes" name="page-note" rows="1"></textarea>
<button type="button" class="go" id="copy-answer">Copy answer</button>
</footer>`;
}

export function chromeScript(): string {
  return `<script>
(function () {
  'use strict';
  var KEY = document.body.getAttribute('data-key');
  function all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function stored(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  var sections = all('section.ruling');
  var sum = document.getElementById('picks');
  var notesIn = document.getElementById('rulings-notes');
  var copyBtn = document.getElementById('copy-answer');
  var hintEl = document.getElementById('rulings-hint');

  var LIVE = {};
  var ORDER = [];
  all('input[data-pick]').forEach(function (i) {
    if (!LIVE[i.name]) { LIVE[i.name] = {}; ORDER.push(i.name); }
    LIVE[i.name][i.value] = true;
  });
  var pick = {};
  var onotes = {};
  var note = '';
  var restored = false;

  function load() {
    if (!KEY) return;
    var s;
    try { s = JSON.parse(stored(KEY) || 'null'); } catch (e) { return; }
    if (!s || typeof s !== 'object') return;
    var p = s.picks || {};
    for (var k in p) if (LIVE[k] && LIVE[k][p[k]]) pick[k] = p[k];
    var on = s.onotes || {};
    for (var t in on) if (typeof on[t] === 'string' && LIVE[t]) onotes[t] = on[t];
    if (typeof s.note === 'string') note = s.note;
    restored = Object.keys(pick).length > 0 || Object.keys(onotes).length > 0 || note !== '';
  }
  function save() {
    if (KEY) store(KEY, JSON.stringify({ picks: pick, onotes: onotes, note: note }));
  }

  function sectionOf(id) { return document.getElementById('r-' + id); }
  function show(section, view) {
    if (!section || !section.querySelector('.vw[data-view="' + view + '"]')) return;
    all('.vw', section).forEach(function (w) { w.hidden = w.getAttribute('data-view') !== view; });
    all('.vt', section).forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-view') === view ? 'true' : 'false'); });
  }
  function viewFor(section, k) {
    var id = section.id.slice(2);
    if (section.querySelector('.vw[data-view="' + id + k + '"]')) return id + k;
    var t = section.querySelector('.vt[data-view="today"] .disc');
    return t && t.textContent === k ? 'today' : null;
  }
  function rest(section) {
    var first = section.querySelector('.vw');
    if (!first) return;
    var p = pick[section.id.slice(2)];
    show(section, (p && viewFor(section, p)) || first.getAttribute('data-view'));
  }

  function render() {
    all('input[data-pick]').forEach(function (i) { i.checked = pick[i.name] === i.value; });
    sections.forEach(function (s) {
      var p = pick[s.id.slice(2)];
      all('[data-k]', s).forEach(function (c) { c.classList.toggle('picked', !!p && c.getAttribute('data-k') === p); });
    });
    if (hintEl) hintEl.hidden = !restored;
    var es = ORDER.filter(function (id) { return pick[id]; });
    sum.innerHTML = es.length === 0
      ? '<span class="empty">No picks yet</span>'
      : es.map(function (id) {
        return '<span class="chip"><i></i>' + id + pick[id] +
          '<button type="button" class="x" data-unpick="' + id + '" aria-label="unpick ' + id + pick[id] + '">×</button></span>';
      }).join('');
    copyBtn.disabled = answerText() === '';
  }
  function commit() { render(); save(); }
  function setPick(id, k) {
    if (pick[id] === k) delete pick[id];
    else pick[id] = k;
    rest(sectionOf(id));
    commit();
  }
  function endsDragSelect(e) {
    return e.detail > 0 && String(window.getSelection ? window.getSelection() : '') !== '';
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    var x = t.closest('[data-unpick]');
    if (x) { delete pick[x.getAttribute('data-unpick')]; rest(sectionOf(x.getAttribute('data-unpick'))); commit(); return; }
    var tab = t.closest('.vt');
    if (tab) { show(tab.closest('section'), tab.getAttribute('data-view')); return; }
    var cell = t.closest('.card [data-k]');
    if (!cell || t.closest('textarea')) return;
    if (t.closest('label.pick') && t.tagName !== 'INPUT') return;
    if (endsDragSelect(e)) { render(); return; }
    setPick(cell.closest('.card').getAttribute('data-ruling'), cell.getAttribute('data-k'));
  });
  document.addEventListener('change', function (e) {
    var i = e.target;
    if (!i.matches || !i.matches('input[data-pick]')) return;
    pick[i.name] = i.value;
    rest(sectionOf(i.name));
    commit();
  });

  function hover(section, k) {
    if (section.getAttribute('data-hov') === (k || '')) return;
    section.setAttribute('data-hov', k || '');
    all('.hov', section).forEach(function (c) { c.classList.remove('hov'); });
    if (k) all('[data-k="' + k + '"]', section).forEach(function (c) { c.classList.add('hov'); });
    var v = k && viewFor(section, k);
    if (v) show(section, v);
    else if (!k) rest(section);
  }
  document.addEventListener('mouseover', function (e) {
    var c = e.target.closest && e.target.closest('.card [data-k]');
    if (c) hover(c.closest('section'), c.getAttribute('data-k'));
  });
  all('.card').forEach(function (card) {
    card.addEventListener('mouseleave', function () { hover(card.closest('section'), null); });
  });

  function sizeNote() {
    notesIn.style.height = 'auto';
    notesIn.style.height = notesIn.scrollHeight + notesIn.offsetHeight - notesIn.clientHeight + 'px';
  }
  notesIn.addEventListener('input', function () { note = notesIn.value; commit(); sizeNote(); });
  all('.rnote').forEach(function (inp) {
    inp.addEventListener('input', function () { onotes[inp.getAttribute('data-note')] = inp.value; commit(); });
  });

  function answerText() {
    var line = ORDER.map(function (id) {
      var t = pick[id] ? id + pick[id] : id;
      var n = (onotes[id] || '').trim();
      return n ? t + ' — ' + n : pick[id] ? t : '';
    }).filter(Boolean).join(', ');
    var extra = note.trim();
    return extra ? (line ? line + '\\n\\n' : '') + extra : line;
  }
  function fallbackCopy(t) {
    var ta = document.createElement('textarea');
    ta.value = t;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    return ok;
  }
  function within(p, ms) {
    return new Promise(function (res) {
      var t = setTimeout(function () { res(false); }, ms);
      p.then(function () { clearTimeout(t); res(true); }, function () { clearTimeout(t); res(false); });
    });
  }
  function say(text) {
    copyBtn.textContent = text;
    setTimeout(function () { copyBtn.textContent = 'Copy answer'; }, 1800);
  }
  copyBtn.addEventListener('click', function () {
    var t = answerText();
    var done = function (ok) { say(ok ? 'Copied' : 'Copy failed. Copy the summary by hand.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      within(navigator.clipboard.writeText(t), 1500).then(function (ok) { done(ok || fallbackCopy(t)); });
    } else done(fallbackCopy(t));
  });

  load();
  sections.forEach(rest);
  notesIn.value = note;
  sizeNote();
  all('.rnote').forEach(function (inp) { inp.value = onotes[inp.getAttribute('data-note')] || ''; });
  render();
})();
</script>`;
}
