'use strict';
// Optional email alert for new requests. Silently skips if SMTP isn't configured.
const nodemailer = require('nodemailer');

const configured = Boolean(process.env.SMTP_HOST && process.env.NOTIFY_EMAIL);
const transport = configured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    })
  : null;

const LABELS = { pickup: 'Pickup order', group: 'Group / platter order', question: 'Question' };

async function notifyNewRequest(r) {
  if (!transport) return;
  const text = [
    `New ${LABELS[r.kind] || r.kind} from the website`,
    '',
    `Name:   ${r.name}`,
    `Phone:  ${r.phone}`,
    r.email ? `Email:  ${r.email}` : null,
    r.pickup_time ? `Pickup: ${r.pickup_time}` : null,
    '',
    r.details,
    '',
    'Manage it in the dashboard: /admin',
  ].filter((l) => l !== null).join('\n');
  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: process.env.NOTIFY_EMAIL,
      subject: `Hillview website: ${LABELS[r.kind] || 'New request'} — ${r.name}`,
      text,
    });
  } catch (err) {
    console.error('Email alert failed:', err.message);
  }
}

module.exports = { notifyNewRequest };
