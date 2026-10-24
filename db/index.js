'use strict';
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dataDir = path.resolve(process.env.DATA_DIR || path.join(__dirname, '..', 'data'));
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'hillview.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS requests (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    kind        TEXT NOT NULL,
    name        TEXT NOT NULL,
    phone       TEXT NOT NULL,
    email       TEXT,
    pickup_time TEXT,
    details     TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'new',
    notes       TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const STATUSES = ['new', 'confirmed', 'ready', 'picked_up', 'closed'];
const KINDS = ['pickup', 'group', 'question'];

module.exports = {
  STATUSES,
  KINDS,
  insert: db.prepare(`INSERT INTO requests (kind, name, phone, email, pickup_time, details)
                      VALUES (@kind, @name, @phone, @email, @pickup_time, @details)`),
  all: db.prepare(`SELECT * FROM requests ORDER BY datetime(created_at) DESC, id DESC`),
  get: db.prepare(`SELECT * FROM requests WHERE id = ?`),
  update: db.prepare(`UPDATE requests SET status = COALESCE(@status, status), notes = COALESCE(@notes, notes) WHERE id = @id`),
  remove: db.prepare(`DELETE FROM requests WHERE id = ?`),
};
