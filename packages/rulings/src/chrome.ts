export function panelHtml(): string {
  return `<footer class="bar" id="rulings-bar">
<div class="bar-in" id="rulings-bar-in">
<div class="chips" id="picks" aria-live="polite"></div>
<textarea id="rulings-notes" rows="1" placeholder="page note — anything the answer should carry"></textarea>
<button type="button" class="go" id="copy-answer">Copy answer</button>
</div>
<button type="button" class="bar-tab" id="bar-tab" aria-expanded="false" aria-controls="rulings-bar-in">no picks yet</button>
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
  var wraps = Array.prototype.slice.call(document.querySelectorAll('.stage-wrap'));
  var vrows = Array.prototype.slice.call(document.querySelectorAll('.vrow'));
  var noteIns = Array.prototype.slice.call(document.querySelectorAll('.rnote'));
  var sum = document.getElementById('picks');
  var notesIn = document.getElementById('rulings-notes');
  var copyBtn = document.getElementById('copy-answer');
  var bar = document.getElementById('rulings-bar');
  var tab = document.getElementById('bar-tab');
  var countEl = document.getElementById('ruled-count');
  var where = document.getElementById('rulings-where');
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
  });
  tracked.forEach(function (el) {
    var d = el.getAttribute('data-pick') ? el : el.querySelector('.disc');
    var m = d && REF.exec(d.getAttribute('data-pick'));
    if (m) CARD[m[0]] = (el.getAttribute('data-needs') || '').split(/\\s+/).filter(Boolean);
  });

  function flip(el) {
    var d = el.getAttribute('data-pick') ? el : el.querySelector('.disc');
    var m = d && REF.exec(d.getAttribute('data-pick'));
    if (m) { if (pick[m[1]] === m[2]) delete pick[m[1]]; else pick[m[1]] = m[2]; }
  }

  var views = {};
  function rulingViews(el) {
    var sec = el.closest('section');
    var id = sec && sec.getAttribute('id');
    if (!id) return null;
    if (!views[id]) views[id] = { w: [], r: [] };
    return views[id];
  }
  wraps.forEach(function (w) { var u = rulingViews(w); if (u) u.w.push(w); });
  vrows.forEach(function (r) { var u = rulingViews(r); if (u) u.r.push(r); });

  function show(id, view) {
    var u = views[id];
    if (!u || !view) return;
    u.w.forEach(function (w) {
      if (w.getAttribute('data-view') === view) w.removeAttribute('hidden');
      else w.setAttribute('hidden', '');
    });
    u.r.forEach(function (r) {
      var on = r.getAttribute('data-view') === view;
      r.classList.toggle('shown', on);
      if (on) r.setAttribute('aria-current', 'true');
      else r.removeAttribute('aria-current');
    });
  }
  function restoreViews() {
    for (var id in views) {
      var u = views[id];
      var rid = id.slice(2);
      var p = pick[rid];
      var view = null;
      if (p && p !== 'n' && LIVE[rid] && LIVE[rid][p]) {
        u.w.forEach(function (w) {
          if (w.getAttribute('data-pick') === rid + p) view = w.getAttribute('data-view');
        });
      }
      show(id, view || (u.w[0] && u.w[0].getAttribute('data-view')) || null);
    }
  }

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
    for (var t in on) if (typeof on[t] === 'string' && ORDER.indexOf(t) !== -1) onotes[t] = on[t];
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
      out.push({ label: id + pick[id], rid: id, bad: bad });
    });
    return out;
  }
  function chipHue(id) {
    var c = document.querySelector('[data-pick="' + id + '"]');
    if (!c) return 'var(--ink)';
    for (var i = 0; i < c.classList.length; i++) {
      if (c.classList[i].indexOf('o-') === 0) return 'var(--opt-' + c.classList[i].slice(2) + ')';
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
    if (!sum) return;
    var es = entries();
    if (bar) bar.classList.toggle('rest', es.length === 0 && (notesIn ? note : '') === '');
    if (tab) {
      var open = bar !== null && bar.classList.contains('open');
      tab.setAttribute('aria-expanded', open ? 'true' : 'false');
      tab.textContent = open ? 'close'
        : es.length === 0 ? 'no picks yet'
        : es.length + (es.length === 1 ? ' pick' : ' picks');
    }
    if (countEl) {
      var ruled = 0;
      ORDER.forEach(function (id) { if (pick[id]) ruled++; });
      countEl.textContent = ruled + ' of ' + ORDER.length + ' ruled';
    }
    for (var rk in links) links[rk].classList.toggle('ruled', !!pick[rk.slice(2)]);
    if (es.length === 0) {
      sum.innerHTML = '<span class="empty">no picks yet — pick a letter</span>';
      return;
    }
    sum.innerHTML = es.map(function (e) {
      return '<span class="chip' + (e.bad.length ? ' unmet' : '') + '">' +
        '<span class="d" style="background:' + chipHue(e.label) + '">' + e.label.slice(-1) + '</span>' +
        e.label.slice(0, -1) +
        (e.bad.length ? '<span class="need">needs ' + e.bad.join(' ') + '</span>' : '') +
        '<button type="button" class="x" data-unpick="' + e.label + '" aria-label="unpick ' + e.label + '">×</button>' +
        '</span>';
    }).join('');
  }
  function commit() { render(); save(); }

  function exempt(t) {
    return t.closest('.rnote, a, textarea, summary');
  }

  function endsDragSelect(e) {
    var sel = window.getSelection ? window.getSelection() : null;
    return Boolean(sel && String(sel) && e.detail);
  }

  document.addEventListener('click', function (e) {
    var x = e.target.closest('[data-unpick]');
    if (x) {
      var xm = REF.exec(x.getAttribute('data-unpick'));
      if (xm) delete pick[xm[1]];
      commit();
      return;
    }
    if (exempt(e.target)) return;
    var quickBtn = e.target.closest('[data-picks]');
    if (quickBtn) {
      quickBtn.getAttribute('data-picks').split(/\\s+/).filter(Boolean).forEach(function (t) {
        var q = REF.exec(t);
        if (q) pick[q[1]] = q[2];
      });
      commit();
      return;
    }
    var row = e.target.closest('.vrow');
    if (row) {
      if (endsDragSelect(e)) return;
      flip(row);
      var v = row.getAttribute('data-view');
      var sec = v && row.closest('section');
      var sid = sec && sec.getAttribute('id');
      if (sid) show(sid, v);
      commit();
      return;
    }
    var card = e.target.closest('[data-pick]');
    if (card) {
      if (endsDragSelect(e)) return;
      flip(card);
      commit();
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (exempt(e.target)) return;
    var card = e.target.closest('[data-pick]');
    if (card) { e.preventDefault(); card.click(); return; }
    var row = e.target.closest('[data-view]');
    if (row) { e.preventDefault(); row.click(); }
  });
  function sizeNote() {
    if (!notesIn) return;
    var cap = Math.max(120, (window.innerHeight || 640) - 220);
    notesIn.style.height = 'auto';
    notesIn.style.height = Math.min(notesIn.scrollHeight, cap) + 'px';
  }
  if (tab && bar) tab.addEventListener('click', function () {
    var open = !bar.classList.contains('open');
    bar.classList.toggle('open', open);
    if (open) sizeNote();
    render();
  });
  if (notesIn) notesIn.addEventListener('input', function () { note = notesIn.value; save(); sizeNote(); });
  noteIns.forEach(function (inp) {
    inp.addEventListener('input', function () { onotes[inp.getAttribute('data-note')] = inp.value; save(); });
  });

  var links = {};
  var titles = {};
  var sideLinks = document.querySelectorAll('.side a.rl');
  for (var si = 0; si < sideLinks.length; si++) {
    var h = (sideLinks[si].getAttribute('href') || '').slice(1);
    if (!h) continue;
    links[h] = sideLinks[si];
    var t = sideLinks[si].querySelector('.t');
    titles[h] = t ? t.textContent : '';
  }
  var hereId = null;
  function setWhere(id) {
    if (!where) return;
    if (!id) { where.setAttribute('hidden', ''); return; }
    where.removeAttribute('hidden');
    where.setAttribute('href', '#r-' + id);
    where.textContent = id + ' · ' + (titles['r-' + id] || '');
  }
  if ('IntersectionObserver' in window && Object.keys(links).length) {
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        var l = links[en.target.id];
        if (!l) return;
        if (!en.isIntersecting) {
          l.classList.remove('here');
          if (hereId === en.target.id) { hereId = null; setWhere(null); }
          return;
        }
        for (var k in links) links[k].classList.remove('here');
        l.classList.add('here');
        hereId = en.target.id;
        setWhere(en.target.id.slice(2));
      });
    }, { rootMargin: '-12% 0px -78% 0px' });
    var secs = document.querySelectorAll('section[id]');
    for (var sj = 0; sj < secs.length; sj++) io.observe(secs[sj]);
  }

  function answerText() {
    var line = entries().map(function (e) {
      var t = e.label + (e.bad.length ? ' (needs ' + e.bad.join(' ') + ')' : '');
      var n = (onotes[e.rid] || '').replace(/^\\s+|\\s+$/g, '');
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
  function within(p, ms) {
    return new Promise(function (res) {
      var over = false;
      var t = setTimeout(function () { if (!over) { over = true; res(false); } }, ms);
      p.then(
        function () { if (!over) { over = true; clearTimeout(t); res(true); } },
        function () { if (!over) { over = true; clearTimeout(t); res(false); } }
      );
    });
  }
  if (copyBtn) copyBtn.addEventListener('click', function () {
    var done = function (ok) {
      copyBtn.textContent = ok ? 'Copied' : 'Copy failed — copy the summary by hand';
      setTimeout(function () { copyBtn.textContent = 'Copy answer'; }, 1800);
    };
    if (entries().length === 0) {
      copyBtn.textContent = 'No picks yet — pick a letter first';
      setTimeout(function () { copyBtn.textContent = 'Copy answer'; }, 1800);
      return;
    }
    var t = answerText();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      within(navigator.clipboard.writeText(t), 1500).then(function (ok) {
        done(ok ? true : fallbackCopy(t));
      });
    } else done(fallbackCopy(t));
  });

  load();
  restoreViews();
  if (notesIn) { notesIn.value = note; sizeNote(); }
  noteIns.forEach(function (inp) { inp.value = onotes[inp.getAttribute('data-note')] || ''; });
  render();
})();
</script>`;
}
