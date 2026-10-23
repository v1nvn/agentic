export const LAYOUT_KEY = 'rulings-layout';

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
  var countEl = document.getElementById('ruled-count');
  var hintEl = document.getElementById('rulings-hint');
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
    restored = Object.keys(p).length > 0 || Object.keys(on).length > 0 || note !== '';
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

  function unmet(needs) {
    return needs.filter(function (t) { var m = REF.exec(t); return !m || pick[m[1]] !== m[2]; });
  }
  function entries() {
    return ORDER.filter(function (id) { return pick[id]; }).map(function (id) {
      var row = document.querySelector('[data-pick="' + id + pick[id] + '"]');
      return { label: id + pick[id], rid: id, bad: unmet(words(row.getAttribute('data-needs'))) };
    });
  }

  function render() {
    pickers.forEach(function (d) {
      var m = REF.exec(d.getAttribute('data-pick'));
      var input = d.querySelector('input');
      if (input) input.checked = pick[m[1]] === m[2];
    });
    all('.opt[data-needs]').forEach(function (r) {
      r.classList.toggle('unmet', unmet(words(r.getAttribute('data-needs'))).length > 0);
    });
    var es = entries();
    if (hintEl) hintEl.hidden = !restored;
    if (countEl) countEl.textContent = es.length + ' of ' + ORDER.length + ' ruled';
    for (var h in links) links[h].classList.toggle('ruled', !!pick[h.slice(2)]);
    if (!sum) return;
    sum.innerHTML = es.length === 0
      ? '<span class="empty">No picks yet</span>'
      : es.map(function (e) {
        return '<span class="chip' + (e.bad.length ? ' unmet' : '') + '"><i></i>' + e.label +
          (e.bad.length ? '<span class="need">needs ' + e.bad.join(' ') + '</span>' : '') +
          '<button type="button" class="x" data-unpick="' + e.label + '" aria-label="unpick ' + e.label + '">×</button></span>';
      }).join('');
    if (copyBtn) copyBtn.disabled = answerText() === '';
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
    var picker = t.closest('[data-pick]');
    if (picker) {
      var input = picker.querySelector('input');
      if (input && endsDragSelect(e)) { e.preventDefault(); return; }
      if (input && t !== input && input.checked) {
        e.preventDefault();
        input.checked = false;
        delete pick[REF.exec(picker.getAttribute('data-pick'))[1]];
        commit();
      }
      if (picker.hasAttribute('data-look')) look(picker.closest('section'), picker.getAttribute('data-look'));
      return;
    }
    if (t.closest('input, textarea, a')) return;
    var row = t.closest('.opt[data-look]');
    if (row) look(row.closest('section'), row.getAttribute('data-look'));
  });
  document.addEventListener('change', function (e) {
    var input = e.target;
    var picker = input.closest && input.closest('[data-pick]');
    if (!picker || input.type !== 'radio') return;
    var m = REF.exec(picker.getAttribute('data-pick'));
    pick[m[1]] = m[2];
    commit();
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
    notesIn.style.height = 'auto';
    notesIn.style.height = notesIn.scrollHeight + notesIn.offsetHeight - notesIn.clientHeight + 'px';
  }
  if (notesIn) notesIn.addEventListener('input', function () { note = notesIn.value; commit(); sizeNote(); });
  all('.rnote').forEach(function (inp) {
    inp.addEventListener('input', function () { onotes[inp.getAttribute('data-note')] = inp.value; save(); });
  });

  function setWhere(id) {
    if (!where) return;
    if (!id) { where.setAttribute('hidden', ''); return; }
    where.removeAttribute('hidden');
    where.setAttribute('href', '#r-' + id);
    where.textContent = id;
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
    var done = function (ok) { say(ok ? 'Copied' : 'Copy failed. Copy the summary by hand.'); };
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
