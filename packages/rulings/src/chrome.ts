export const LAYOUT_KEY = 'rulings-layout';

export function panelHtml(): string {
  return `<footer class="bar" id="rulings-bar">
<div class="bar-in" id="rulings-bar-in">
<div class="chips" id="picks" aria-live="polite"></div>
<textarea id="rulings-notes" rows="1" placeholder="Page note — anything the answer should carry"></textarea>
<button type="button" class="go" id="copy-answer">Copy answer</button>
</div>
<button type="button" class="bar-tab" id="bar-tab" aria-expanded="false" aria-controls="rulings-bar-in">No picks yet</button>
</footer>`;
}

export function chromeScript(): string {
  return `<script>
(function () {
  'use strict';
  var KEY = document.body.getAttribute('data-key');
  var REF = /^(G\\d+)([a-z])$/;
  function all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function words(s) { return (s || '').split(/\\s+/).filter(Boolean); }
  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function stored(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  var pickers = all('[data-pick]');
  var sections = all('section.ruling');
  var sum = document.getElementById('picks');
  var notesIn = document.getElementById('rulings-notes');
  var copyBtn = document.getElementById('copy-answer');
  var bar = document.getElementById('rulings-bar');
  var tab = document.getElementById('bar-tab');
  var countEl = document.getElementById('ruled-count');
  var where = document.getElementById('rulings-where');
  var links = {};
  all('.side a.rl').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });

  var LIVE = {};
  var ORDER = [];
  pickers.forEach(function (d) {
    var m = REF.exec(d.getAttribute('data-pick'));
    if (!LIVE[m[1]]) { LIVE[m[1]] = {}; ORDER.push(m[1]); }
    LIVE[m[1]][m[2]] = true;
  });
  var pick = {};
  var onotes = {};
  var note = '';

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
  }
  function save() {
    if (KEY) store(KEY, JSON.stringify({ picks: pick, onotes: onotes, note: note }));
  }

  function setLayout(v) {
    document.body.classList.toggle('stacked', v === 'stacked');
    all('[data-layout]').forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-layout') === v ? 'true' : 'false');
    });
  }

  function look(section, view) {
    all('.vw', section).forEach(function (w) {
      if (w.getAttribute('data-view') === view) w.removeAttribute('hidden');
      else w.setAttribute('hidden', '');
    });
    all('.opt[data-look]', section).forEach(function (r) {
      var on = r.getAttribute('data-look') === view;
      r.classList.toggle('looked', on);
      if (on) r.setAttribute('aria-current', 'true');
      else r.removeAttribute('aria-current');
    });
  }
  function pickedView(section) {
    var p = pick[section.id.slice(2)];
    var row = p && section.querySelector('.opt[data-look][data-pick="' + section.id.slice(2) + p + '"]');
    return row ? row.getAttribute('data-look') : null;
  }
  function restoreViews(list) {
    list.forEach(function (s) {
      var first = s.querySelector('.vw');
      if (first) look(s, pickedView(s) || first.getAttribute('data-view'));
    });
  }

  function flip(ref) {
    var m = REF.exec(ref);
    if (pick[m[1]] === m[2]) delete pick[m[1]];
    else pick[m[1]] = m[2];
  }
  function unmet(needs) {
    return needs.filter(function (t) { var m = REF.exec(t); return !m || pick[m[1]] !== m[2]; });
  }
  function entries() {
    return ORDER.filter(function (id) { return pick[id]; }).map(function (id) {
      var row = document.querySelector('[data-pick="' + id + pick[id] + '"]');
      return { label: id + pick[id], rid: id, bad: unmet(words(row.getAttribute('data-needs'))), hue: row.className.match(/\\bo-[a-d]\\b/) };
    });
  }

  function render() {
    pickers.forEach(function (d) {
      var m = REF.exec(d.getAttribute('data-pick'));
      d.setAttribute('aria-pressed', pick[m[1]] === m[2] ? 'true' : 'false');
    });
    all('.opt[data-needs]').forEach(function (r) {
      r.classList.toggle('unmet', unmet(words(r.getAttribute('data-needs'))).length > 0);
    });
    var es = entries();
    if (bar) bar.classList.toggle('rest', es.length === 0 && note === '');
    if (tab) {
      var open = bar.classList.contains('open');
      tab.setAttribute('aria-expanded', open ? 'true' : 'false');
      tab.textContent = open ? 'Close' : es.length === 0 ? 'No picks yet' : es.length + (es.length === 1 ? ' pick' : ' picks');
    }
    if (countEl) countEl.textContent = es.length + ' of ' + ORDER.length + ' ruled';
    for (var h in links) links[h].classList.toggle('ruled', !!pick[h.slice(2)]);
    if (!sum) return;
    sum.innerHTML = es.length === 0
      ? '<span class="empty">No picks yet — click an option</span>'
      : es.map(function (e) {
        return '<span class="chip' + (e.hue ? ' ' + e.hue[0] : '') + (e.bad.length ? ' unmet' : '') + '"><i></i>' + e.label +
          (e.bad.length ? '<span class="need">needs ' + e.bad.join(' ') + '</span>' : '') +
          '<button type="button" class="x" data-unpick="' + e.label + '" aria-label="unpick ' + e.label + '">×</button></span>';
      }).join('');
  }
  function commit() { render(); save(); }
  function endsDragSelect(e) {
    return e.detail > 0 && String(window.getSelection ? window.getSelection() : '') !== '';
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    var x = t.closest('[data-unpick]');
    if (x) { delete pick[REF.exec(x.getAttribute('data-unpick'))[1]]; commit(); return; }
    var lay = t.closest('[data-layout]');
    if (lay) { setLayout(lay.getAttribute('data-layout')); store('${LAYOUT_KEY}', lay.getAttribute('data-layout')); return; }
    var quick = t.closest('[data-picks]');
    if (quick) {
      words(quick.getAttribute('data-picks')).forEach(function (r) { var m = REF.exec(r); if (m) pick[m[1]] = m[2]; });
      restoreViews(sections);
      commit();
      return;
    }
    if (t.closest('input, textarea, a')) return;
    var picker = t.closest('[data-pick]');
    if (picker) {
      if (endsDragSelect(e)) return;
      flip(picker.getAttribute('data-pick'));
      commit();
    }
    var row = t.closest('.opt[data-look]');
    if (row) look(row.closest('section'), row.getAttribute('data-look'));
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var row = e.target.closest && e.target.closest('.opt');
    if (!row || e.target !== row) return;
    e.preventDefault();
    row.click();
  });
  function preview(e) {
    var row = e.target.closest && e.target.closest('.opts .opt');
    if (!row) return;
    var section = row.closest('section');
    if (row.hasAttribute('data-look')) look(section, row.getAttribute('data-look'));
    else restoreViews([section]);
  }
  document.addEventListener('mouseover', preview);
  document.addEventListener('focusin', preview);
  all('.opts').forEach(function (list) {
    var section = list.closest('section');
    list.addEventListener('mouseleave', function () { restoreViews([section]); });
    list.addEventListener('focusout', function (e) {
      if (!e.relatedTarget || !list.contains(e.relatedTarget)) restoreViews([section]);
    });
  });

  function sizeNote() {
    var cap = Math.max(120, (window.innerHeight || 640) - 220);
    notesIn.style.height = 'auto';
    notesIn.style.height = Math.min(notesIn.scrollHeight + notesIn.offsetHeight - notesIn.clientHeight, cap) + 'px';
  }
  if (tab) tab.addEventListener('click', function () {
    var open = !bar.classList.contains('open');
    bar.classList.toggle('open', open);
    if (open) sizeNote();
    render();
  });
  if (notesIn) notesIn.addEventListener('input', function () { note = notesIn.value; commit(); sizeNote(); });
  all('.rnote').forEach(function (inp) {
    inp.addEventListener('input', function () { onotes[inp.getAttribute('data-note')] = inp.value; save(); });
  });

  function setWhere(id) {
    if (!where) return;
    if (!id) { where.setAttribute('hidden', ''); return; }
    var l = links['r-' + id];
    where.removeAttribute('hidden');
    where.setAttribute('href', '#r-' + id);
    where.textContent = id + ' · ' + (l ? l.querySelector('.t').textContent : '');
  }
  if ('IntersectionObserver' in window) {
    var here = null;
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        var l = links[en.target.id];
        if (!l) return;
        if (!en.isIntersecting) {
          l.classList.remove('here');
          if (here === en.target.id) { here = null; setWhere(null); }
          return;
        }
        for (var k in links) links[k].classList.remove('here');
        l.classList.add('here');
        here = en.target.id;
        setWhere(here.slice(2));
      });
    }, { rootMargin: '-12% 0px -78% 0px' });
    sections.forEach(function (s) { io.observe(s); });
  }

  function answerText() {
    var es = entries();
    var line = ORDER.map(function (id) {
      var e = es.filter(function (x) { return x.rid === id; })[0];
      var t = e ? e.label + (e.bad.length ? ' (needs ' + e.bad.join(' ') + ')' : '') : id;
      var n = (onotes[id] || '').trim();
      return n ? t + ' — ' + n : e ? t : '';
    }).filter(Boolean).join(', ');
    var extra = note.trim();
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
      var t = setTimeout(function () { res(false); }, ms);
      p.then(function () { clearTimeout(t); res(true); }, function () { clearTimeout(t); res(false); });
    });
  }
  function say(text) {
    copyBtn.textContent = text;
    setTimeout(function () { copyBtn.textContent = 'Copy answer'; }, 1800);
  }
  if (copyBtn) copyBtn.addEventListener('click', function () {
    var t = answerText();
    if (t === '') { say('Nothing to copy yet — pick an option or write a note'); return; }
    var done = function (ok) { say(ok ? 'Copied' : 'Copy failed — copy the summary by hand'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      within(navigator.clipboard.writeText(t), 1500).then(function (ok) { done(ok || fallbackCopy(t)); });
    } else done(fallbackCopy(t));
  });

  setLayout(stored('${LAYOUT_KEY}') === 'stacked' ? 'stacked' : 'side');
  load();
  restoreViews(sections);
  if (notesIn) { notesIn.value = note; sizeNote(); }
  all('.rnote').forEach(function (inp) { inp.value = onotes[inp.getAttribute('data-note')] || ''; });
  render();
})();
</script>`;
}
