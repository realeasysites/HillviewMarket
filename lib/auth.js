'use strict';
// Password-only admin login. No username. Disabled until ADMIN_PASSWORD is set.
const crypto = require('crypto');

const COOKIE = 'hv_admin';
const MAX_AGE_MS = 1000 * 60 * 60 * 12; // 12 hours
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

function loginEnabled() {
  return Boolean(process.env.ADMIN_PASSWORD);
}

function passwordMatches(input) {
  if (!loginEnabled() || typeof input !== 'string') return false;
  const a = crypto.createHash('sha256').update(input).digest();
  const b = crypto.createHash('sha256').update(process.env.ADMIN_PASSWORD).digest();
  return crypto.timingSafeEqual(a, b);
}

function sign(value) {
  return crypto.createHmac('sha256', SECRET).update(value).digest('base64url');
}

function makeToken() {
  const expires = String(Date.now() + MAX_AGE_MS);
  return `${expires}.${sign(expires)}`;
}

function tokenValid(token) {
  if (!token || !token.includes('.')) return false;
  const [expires, sig] = token.split('.');
  const expected = sign(expires);
  if (sig.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  return Number(expires) > Date.now();
}

function readCookie(req, name) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

function attachSession(req, _res, next) {
  req.isAdmin = loginEnabled() && tokenValid(readCookie(req, COOKIE));
  next();
}

function setSession(req, res) {
  const secure = req.secure ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE}=${makeToken()}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${MAX_AGE_MS / 1000}${secure}`);
}

function clearSession(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);
}

function requireAdmin(req, res, next) {
  if (req.isAdmin) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Not signed in' });
  return res.redirect('/admin/login');
}

module.exports = { attachSession, setSession, clearSession, requireAdmin, passwordMatches, loginEnabled };
