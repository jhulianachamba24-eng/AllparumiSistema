'use strict';
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'integra.db'));
db.pragma('journal_mode = WAL');
db.exec(`
CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK (id = 1), json TEXT NOT NULL, revision INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  pass_hash TEXT NOT NULL,
  company_id TEXT DEFAULT '',
  role TEXT NOT NULL,
  status TEXT DEFAULT 'Activo',
  system_admin INTEGER DEFAULT 0,
  profile TEXT DEFAULT '{}',
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS counters (key TEXT PRIMARY KEY, value INTEGER NOT NULL);
`);
db.prepare("INSERT OR IGNORE INTO app_state (id, json, revision) VALUES (1, '{}', 0)").run();

module.exports = { db, DATA_DIR, UPLOAD_DIR };
