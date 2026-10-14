// The interactive chrome: the pick composer bar and the one script that
// drives it. Both are static text — every page emits the same bytes, the
// storage key rides on <body data-key="…">, and all mutable state lives in
// localStorage under that key, never in the file.
export function panelHtml(): string {
  return `<footer class="bar">
<div class="shell bar-in">
<div class="sum" id="picks" aria-live="polite"></div>
<textarea id="rulings-notes" rows="1" placeholder="notes — anything the answer should carry to the owner"></textarea>
<button type="button" id="copy-answer">Copy answer</button>
</div>
</footer>`;
}

export function chromeScript(): string {
  return `<script>
(function () {
  'use strict';
  var KEY = document.body.getAttribute('data-key');
  var REF = /^(G\\d+)([a-z])$/;
  var cards = Array.prototype.slice.call(document.querySelectorAll('[data-pick]'));
  var tracked = Array.prototype.slice.call(document.querySelectorAll('[data-needs]'));
  var sum = document.getElementById('picks');
  var notesIn = document.getElementById('rulings-notes');
  var copyBtn = document.getElementById('copy-answer');
  var pick = {};
  var notes = '';

  var LIVE = {};
  var CARD = {};
  var ORDER = [];
  cards.forEach(function (c) {
    var m = REF.exec(c.getAttribute('data-pick'));
    if (!m) return;
    if (!LIVE[m[1]]) { LIVE[m[1]] = { n: true }; ORDER.push(m[1]); }
    LIVE[m[1]][m[2]] = true;
    CARD[m[0]] = (c.getAttribute('data-needs') || '').split(/\\s+/).filter(Boolean);
  });

  function load() {
    if (!KEY) return;
    var raw;
    try { raw = localStorage.getItem(KEY); } catch (e) { return; }
    if (!raw) return;
    var s;
    try { s = JSON.parse(raw); } catch (e) { return; }
    if (!s || typeof s !== 'object') return;
    var p = s.picks || {};
    for (var k in p) if (LIVE[k] && LIVE[k][p[k]]) pick[k] = p[k];
    if (typeof s.notes === 'string') notes = s.notes;
  }
  function save() {
    if (!KEY) return;
    try { localStorage.setItem(KEY, JSON.stringify({ picks: pick, notes: notes })); } catch (e) {}
  }
  function unmetOf(list) {
    return list.filter(function (t) {
      var m = REF.exec(t);
      return !m || pick[m[1]] !== m[2];
    });
  }
  function entries() {
    var out = [];
    ORDER.forEach(function (id) {
      if (!pick[id]) return;
      var bad = pick[id] === 'n' ? [] : unmetOf(CARD[id + pick[id]] || []);
      out.push({ label: id + pick[id], bad: bad });
    });
    return out;
  }
  function render() {
    cards.forEach(function (c) {
      var m = REF.exec(c.getAttribute('data-pick'));
      if (m) c.setAttribute('aria-pressed', pick[m[1]] === m[2] ? 'true' : 'false');
    });
    tracked.forEach(function (el) {
      el.classList.toggle('unmet', unmetOf((el.getAttribute('data-needs') || '').split(/\\s+/).filter(Boolean)).length > 0);
    });
    var noneBtns = document.querySelectorAll('[data-none]');
    for (var i = 0; i < noneBtns.length; i++) {
      var b = noneBtns[i];
      b.classList.toggle('on', pick[b.getAttribute('data-none')] === 'n');
    }
    if (!sum) return;
    if (entries().length === 0) {
      sum.innerHTML = '<span class="pk empty">no picks yet — click a view</span>';
      return;
    }
    sum.innerHTML = entries().map(function (e) {
      return '<span class="pk' + (e.bad.length ? ' unmet' : '') + '">' + e.label +
        (e.bad.length ? ' <i>needs ' + e.bad.join(' ') + '</i>' : '') + '</span>';
    }).join('<span class="sep">, </span>');
  }
  function commit() { render(); save(); }

  document.addEventListener('click', function (e) {
    var card = e.target.closest('[data-pick]');
    if (card) {
      var m = REF.exec(card.getAttribute('data-pick'));
      if (m) { if (pick[m[1]] === m[2]) delete pick[m[1]]; else pick[m[1]] = m[2]; }
      commit();
      return;
    }
    var noneBtn = e.target.closest('[data-none]');
    if (noneBtn) {
      var id = noneBtn.getAttribute('data-none');
      if (pick[id] === 'n') delete pick[id]; else pick[id] = 'n';
      commit();
      return;
    }
    var quickBtn = e.target.closest('[data-picks]');
    if (quickBtn) {
      quickBtn.getAttribute('data-picks').split(/\\s+/).filter(Boolean).forEach(function (t) {
        var q = REF.exec(t);
        if (q) pick[q[1]] = q[2];
      });
      commit();
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var card = e.target.closest('[data-pick]');
    if (card) { e.preventDefault(); card.click(); }
  });
  if (notesIn) notesIn.addEventListener('input', function () { notes = notesIn.value; save(); });

  function answerText() {
    var line = entries().map(function (e) {
      return e.label + (e.bad.length ? ' (needs ' + e.bad.join(' ') + ')' : '');
    }).join(', ');
    var extra = (notesIn ? notesIn.value : notes).replace(/^\\s+|\\s+$/g, '');
    return extra ? line + '\\n\\n' + extra : line;
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
  if (copyBtn) copyBtn.addEventListener('click', function () {
    var t = answerText();
    var done = function (ok) {
      copyBtn.textContent = ok ? 'Copied' : 'Copy failed — copy the summary by hand';
      setTimeout(function () { copyBtn.textContent = 'Copy answer'; }, 1800);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(function () { done(true); }, function () { done(fallbackCopy(t)); });
    } else done(fallbackCopy(t));
  });

  load();
  if (notesIn) notesIn.value = notes;
  render();
})();
</script>`;
}
