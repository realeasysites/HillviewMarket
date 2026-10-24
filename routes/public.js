'use strict';
const express = require('express');
const db = require('../db');
const { notifyNewRequest } = require('../lib/mailer');

const router = express.Router();

// Simple in-memory rate limit: 5 submissions per IP per 10 minutes.
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 5;
}

const clean = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

router.post('/requests', (req, res) => {
  const b = req.body || {};
  if (b.website) return res.json({ ok: true }); // honeypot: bots fill this, people don't
  if (rateLimited(req.ip)) return res.status(429).json({ error: 'Too many requests — please call us instead.' });

  const r = {
    kind: db.KINDS.includes(b.kind) ? b.kind : 'pickup',
    name: clean(b.name, 80),
    phone: clean(b.phone, 30),
    email: clean(b.email, 120) || null,
    pickup_time: clean(b.pickup_time, 60) || null,
    details: clean(b.details, 2000),
  };

  const errors = [];
  if (!r.name) errors.push('Your name');
  if (r.phone.replace(/\D/g, '').length < 10) errors.push('A phone number we can reach you at');
  if (!r.details) errors.push('What you’d like to order or ask');
  if (r.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) errors.push('A valid email (or leave it blank)');
  if (errors.length) return res.status(400).json({ error: `Please add: ${errors.join(', ')}.` });

  const info = db.insert.run(r);
  notifyNewRequest(r);
  res.json({ ok: true, id: info.lastInsertRowid });
});

module.exports = router;
