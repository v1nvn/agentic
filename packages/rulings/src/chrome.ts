// The interactive chrome: the pick composer bar and the one script that
// drives it. Both are static text — every page emits the same bytes, the
// storage key rides on <body data-key="…">, and all mutable state lives in
// localStorage under that key, never in the file.
export function panelHtml(): string {
  return `<footer class="bar">
<div class="bar-in">
<div class="chips" id="picks" aria-live="polite"></div>
<textarea id="rulings-notes" rows="1" placeholder="page note — anything the answer should carry"></textarea>
<button type="button" class="go" id="copy-answer">Copy answer</button>
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
  var noteIns = Array.prototype.slice.call(document.querySelectorAll('.onote'));
  var sum = document.getElementById('picks');
  var notesIn = document.getElementById('rulings-notes');
  var copyBtn = document.getElementById('copy-answer');
  var pick = {};
  var onotes = {};
  var note = '';

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
    for (var k in p) if (LIVE[k] && typeof p[k] === 'string' && LIVE[k][p[k]]) pick[k] = p[k];
    var on = s.onotes || {};
    for (var t in on) if (typeof on[t] === 'string') onotes[t] = on[t];
    if (typeof s.note === 'string') note = s.note;
    else if (typeof s.notes === 'string') note = s.notes;
  }
  function save() {
    if (!KEY) return;
    try { localStorage.setItem(KEY, JSON.stringify({ picks: pick, onotes: onotes, note: note })); } catch (e) {}
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
  function chipHue(id) {
    var c = document.querySelector('[data-pick="' + id + '"]');
    if (!c) return 'var(--ink)';
    for (var i = 0; i < c.classList.length; i++) {
      if (c.classList[i].indexOf('o-') === 0) return 'var(--' + c.classList[i] + ')';
    }
    return 'var(--ink)';
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
    var es = entries();
    if (es.length === 0) {
      sum.innerHTML = '<span class="empty">no picks yet — click a view</span>';
      return;
    }
    sum.innerHTML = es.map(function (e) {
      return '<span class="chip' + (e.bad.length ? ' unmet' : '') + '">' +
        '<span class="d" style="background:' + chipHue(e.label) + '">' + e.label.slice(-1) + '</span>' +
        e.label +
        (e.bad.length ? '<span class="need">needs ' + e.bad.join(' ') + '</span>' : '') +
        '<button type="button" class="x" data-unpick="' + e.label + '" aria-label="unpick ' + e.label + '">×</button>' +
        '</span>';
    }).join('');
  }
  function commit() { render(); save(); }

  document.addEventListener('click', function (e) {
    var x = e.target.closest('[data-unpick]');
    if (x) {
      var xm = REF.exec(x.getAttribute('data-unpick'));
      if (xm) delete pick[xm[1]];
      commit();
      return;
    }
    if (e.target.closest('.onote, a, textarea')) return;
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
  if (notesIn) notesIn.addEventListener('input', function () { note = notesIn.value; save(); });
  noteIns.forEach(function (inp) {
    inp.addEventListener('input', function () { onotes[inp.getAttribute('data-note')] = inp.value; save(); });
  });

  var links = {};
  var sideLinks = document.querySelectorAll('.side a.rl');
  for (var si = 0; si < sideLinks.length; si++) {
    var h = (sideLinks[si].getAttribute('href') || '').slice(1);
    if (h) links[h] = sideLinks[si];
  }
  if ('IntersectionObserver' in window && Object.keys(links).length) {
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (!en.isIntersecting) return;
        for (var k in links) links[k].classList.remove('here');
        var l = links[en.target.id];
        if (l) { l.classList.add('here'); }
      });
    }, { rootMargin: '-12% 0px -78% 0px' });
    var secs = document.querySelectorAll('section[id]');
    for (var sj = 0; sj < secs.length; sj++) io.observe(secs[sj]);
  }

  function answerText() {
    var line = entries().map(function (e) {
      var t = e.label + (e.bad.length ? ' (needs ' + e.bad.join(' ') + ')' : '');
      var n = (onotes[e.label] || '').replace(/^\\s+|\\s+$/g, '');
      return n ? t + ' — ' + n : t;
    }).join(', ');
    var extra = (notesIn ? notesIn.value : note).replace(/^\\s+|\\s+$/g, '');
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
  if (notesIn) notesIn.value = note;
  noteIns.forEach(function (inp) { inp.value = onotes[inp.getAttribute('data-note')] || ''; });
  render();
})();
</script>`;
}
