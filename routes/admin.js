'use strict';
const path = require('path');
const express = require('express');
const db = require('../db');
const { requireAdmin, setSession, clearSession, passwordMatches, loginEnabled } = require('../lib/auth');

const router = express.Router();
const adminDir = path.join(__dirname, '..', 'public', 'admin');

// --- Login (public) ---
router.get('/admin/login', (req, res) => {
  if (req.isAdmin) return res.redirect('/admin');
  res.sendFile(path.join(adminDir, 'login.html'));
});

router.get('/admin/api/status', (req, res) => res.json({ loginEnabled: loginEnabled(), signedIn: req.isAdmin }));

let failures = 0;
router.post('/admin/api/login', (req, res) => {
  if (!loginEnabled()) return res.status(503).json({ error: 'Login is disabled until ADMIN_PASSWORD is set on the server.' });
  if (failures > 20) return res.status(429).json({ error: 'Too many attempts. Try again in a few minutes.' });
  if (!passwordMatches(req.body && req.body.password)) {
    failures++;
    setTimeout(() => { failures = Math.max(0, failures - 1); }, 5 * 60 * 1000);
    return res.status(401).json({ error: 'Wrong password.' });
  }
  setSession(req, res);
  res.json({ ok: true });
});

router.post('/admin/api/logout', (req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

// --- Everything below requires a signed-in admin ---
router.use('/admin', requireAdmin);

router.get(['/admin', '/admin/'], (req, res) => res.sendFile(path.join(adminDir, 'index.html')));
router.get('/admin/admin.js', (req, res) => res.sendFile(path.join(adminDir, 'admin.js')));
router.get('/admin/admin.css', (req, res) => res.sendFile(path.join(adminDir, 'admin.css')));

router.get('/admin/api/requests', (req, res) => res.json({ requests: db.all.all(), statuses: db.STATUSES }));

router.patch('/admin/api/requests/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!db.get.get(id)) return res.status(404).json({ error: 'Not found' });
  const { status, notes } = req.body || {};
  if (status !== undefined && !db.STATUSES.includes(status)) return res.status(400).json({ error: 'Bad status' });
  db.update.run({ id, status: status ?? null, notes: typeof notes === 'string' ? notes.slice(0, 2000) : null });
  res.json({ ok: true, request: db.get.get(id) });
});

router.delete('/admin/api/requests/:id', (req, res) => {
  const info = db.remove.run(Number(req.params.id));
  if (!info.changes) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

module.exports = router;
