(function () {
  'use strict';
  var KIND = { pickup: 'Pickup', group: 'Group order', question: 'Question' };
  var STATUS = { new: 'New', confirmed: 'Confirmed', ready: 'Ready', picked_up: 'Picked up', closed: 'Closed' };
  var OPEN = ['new', 'confirmed', 'ready'];
  var all = [], filter = 'open';
  var list = document.getElementById('list'), stats = document.getElementById('stats');

  function api(url, opts) {
    opts = opts || {};
    opts.headers = { 'Content-Type': 'application/json' };
    return fetch(url, opts).then(function (r) {
      if (r.status === 401) { location.href = '/admin/login'; throw new Error('signed out'); }
      return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || 'Request failed'); return j; });
    });
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function when(iso) {
    var d = new Date(iso.replace(' ', 'T') + 'Z');
    return d.toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  function renderStats() {
    var today = new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York' });
    var count = function (fn) { return all.filter(fn).length; };
    var items = [
      [count(function (r) { return r.status === 'new'; }), 'New — need a call back'],
      [count(function (r) { return r.status === 'confirmed'; }), 'Confirmed / in progress'],
      [count(function (r) { return r.status === 'ready'; }), 'Ready for pickup'],
      [count(function (r) { return new Date(r.created_at.replace(' ', 'T') + 'Z').toLocaleDateString('en-US', { timeZone: 'America/New_York' }) === today; }), 'Received today'],
    ];
    stats.innerHTML = '';
    items.forEach(function (i) { var s = el('div', 'stat'); s.appendChild(el('b', null, i[0])); s.appendChild(el('span', null, i[1])); stats.appendChild(s); });
  }

  function render() {
    renderStats();
    var rows = all.filter(function (r) { return filter === 'all' ? true : filter === 'open' ? OPEN.indexOf(r.status) > -1 : r.status === filter; });
    list.innerHTML = '';
    if (!rows.length) { list.appendChild(el('div', 'empty', filter === 'open' ? 'All caught up — no open orders right now.' : 'Nothing here.')); return; }
    rows.forEach(function (r) {
      var c = el('article', 'card'); c.dataset.status = r.status;
      var top = el('div', 'card-top');
      var h = el('h3', null, r.name); h.appendChild(el('span', 'kind', KIND[r.kind] || r.kind));
      top.appendChild(h); top.appendChild(el('span', 'when', 'Received ' + when(r.created_at)));
      c.appendChild(top);

      var meta = el('div', 'meta');
      var tel = el('a', null, r.phone); tel.href = 'tel:' + r.phone.replace(/[^\d+]/g, ''); meta.appendChild(tel);
      var sms = el('a', null, 'Text'); sms.href = 'sms:' + r.phone.replace(/[^\d+]/g, ''); meta.appendChild(sms);
      if (r.email) { var m = el('a', null, r.email); m.href = 'mailto:' + r.email; meta.appendChild(m); }
      if (r.pickup_time) meta.appendChild(el('span', null, 'Pickup: ' + r.pickup_time));
      c.appendChild(meta);
      c.appendChild(el('p', 'details', r.details));

      var act = el('div', 'actions');
      var sel = el('select'); sel.setAttribute('aria-label', 'Status');
      Object.keys(STATUS).forEach(function (k) { var o = el('option', null, STATUS[k]); o.value = k; if (k === r.status) o.selected = true; sel.appendChild(o); });
      sel.addEventListener('change', function () { save(r.id, { status: sel.value }); });
      var notes = el('input'); notes.placeholder = 'Internal note (e.g. called, ready 12:15)'; notes.value = r.notes || ''; notes.setAttribute('aria-label', 'Note');
      notes.addEventListener('change', function () { save(r.id, { notes: notes.value }); });
      var del = el('button', 'del', 'Delete'); del.type = 'button';
      del.addEventListener('click', function () {
        if (!confirm('Delete this request from ' + r.name + '? This can’t be undone.')) return;
        api('/admin/api/requests/' + r.id, { method: 'DELETE' }).then(load).catch(function (e) { alert(e.message); });
      });
      act.appendChild(sel); act.appendChild(notes); act.appendChild(del);
      c.appendChild(act);
      list.appendChild(c);
    });
  }

  function save(id, body) {
    api('/admin/api/requests/' + id, { method: 'PATCH', body: JSON.stringify(body) })
      .then(function (j) { all = all.map(function (r) { return r.id === id ? j.request : r; }); render(); })
      .catch(function (e) { alert(e.message); });
  }

  function load() { return api('/admin/api/requests').then(function (j) { all = j.requests; render(); }); }

  document.getElementById('filters').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-f]'); if (!b) return;
    filter = b.dataset.f;
    document.querySelectorAll('#filters button[data-f]').forEach(function (x) { x.classList.toggle('active', x === b); });
    render();
  });
  document.getElementById('refresh').addEventListener('click', load);
  document.getElementById('logout').addEventListener('click', function () {
    fetch('/admin/api/logout', { method: 'POST' }).then(function () { location.href = '/admin/login'; });
  });
  load();
  setInterval(load, 60000);
})();
