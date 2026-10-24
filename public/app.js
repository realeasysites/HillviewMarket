(function () {
  'use strict';

  // Store hours in minutes from midnight, by day (0 = Sunday), Saco local time.
  var HOURS = { 0: [420, 1200], 1: [360, 1260], 2: [360, 1260], 3: [360, 1260], 4: [360, 1260], 5: [360, 1260], 6: [360, 1260] };
  var LABEL = { 0: '7:00 AM – 8:00 PM' };
  for (var d = 1; d <= 6; d++) LABEL[d] = '6:00 AM – 9:00 PM';

  function fmt(mins) {
    var h = Math.floor(mins / 60), m = mins % 60, ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + (m ? ':' + String(m).padStart(2, '0') : '') + ' ' + ap;
  }

  function maineNow() {
    try {
      var parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
      var get = function (t) { return parts.find(function (p) { return p.type === t; }).value; };
      var day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
      return { day: day, mins: Number(get('hour')) * 60 + Number(get('minute')) };
    } catch (e) {
      var n = new Date();
      return { day: n.getDay(), mins: n.getHours() * 60 + n.getMinutes() };
    }
  }

  function updateOpenStatus() {
    var now = maineNow(), h = HOURS[now.day];
    var open = now.mins >= h[0] && now.mins < h[1];
    var pill = document.getElementById('openPill');
    var text, status;
    if (open) {
      text = 'Open now · until ' + fmt(h[1]);
      status = (h[1] - now.mins <= 60) ? 'Closing soon — call it in!' : 'Open now';
    } else if (now.mins < h[0]) {
      text = 'Closed · opens today at ' + fmt(h[0]);
      status = 'Opens at ' + fmt(h[0]);
    } else {
      var next = HOURS[(now.day + 1) % 7];
      text = 'Closed · opens tomorrow at ' + fmt(next[0]);
      status = 'Closed for the night';
    }
    pill.classList.toggle('is-open', open);
    pill.classList.toggle('is-closed', !open);
    document.getElementById('openText').textContent = text;
    document.getElementById('todayHours').textContent = LABEL[now.day];
    document.getElementById('todayStatus').textContent = status;
    var row = document.querySelector('#hoursTable tr[data-day="' + now.day + '"]');
    document.querySelectorAll('#hoursTable tr.today').forEach(function (r) { r.classList.remove('today'); });
    if (row) row.classList.add('today');
  }
  updateOpenStatus();
  setInterval(updateOpenStatus, 60000);

  document.getElementById('year').textContent = new Date().getFullYear();

  // Mobile menu
  var btn = document.getElementById('menuBtn'), nav = document.getElementById('nav');
  function setMenu(open) {
    nav.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  btn.addEventListener('click', function () { setMenu(!nav.classList.contains('open')); });
  nav.addEventListener('click', function (e) { if (e.target.tagName === 'A') setMenu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  // Order-ahead form
  var form = document.getElementById('orderForm'), msg = document.getElementById('formMsg');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var data = Object.fromEntries(new FormData(form).entries());
    msg.className = 'form-msg';
    if (!data.name.trim() || data.phone.replace(/\D/g, '').length < 10 || !data.details.trim()) {
      msg.textContent = 'Please add your name, a 10-digit phone number and your order.';
      msg.classList.add('err');
      return;
    }
    var submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    submit.textContent = 'Sending…';
    fetch('/api/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, body: j }; }); })
      .then(function (res) {
        if (!res.ok) throw new Error(res.body.error || 'Something went wrong.');
        form.reset();
        msg.textContent = 'Got it, thanks! We’ll call or text you shortly to confirm.';
        msg.classList.add('ok');
      })
      .catch(function (err) {
        msg.textContent = err.message + ' You can always call us at 207-294-0102.';
        msg.classList.add('err');
      })
      .finally(function () {
        submit.disabled = false;
        submit.textContent = 'Send my order';
      });
  });
})();
