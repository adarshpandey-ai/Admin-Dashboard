const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'mis.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
  password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('admin','viewer')),
  active INTEGER NOT NULL DEFAULT 1, must_change INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS sessions(
  token TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS categories(
  id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL, prefix TEXT UNIQUE NOT NULL,
  grp TEXT NOT NULL DEFAULT 'Other', fields TEXT NOT NULL DEFAULT '[]',
  next_seq INTEGER NOT NULL DEFAULT 1, sort INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS items(
  id INTEGER PRIMARY KEY, category_id INTEGER NOT NULL REFERENCES categories(id),
  seq INTEGER NOT NULL, code TEXT UNIQUE NOT NULL, status TEXT NOT NULL DEFAULT 'Active',
  data TEXT NOT NULL DEFAULT '{}', image TEXT, created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE INDEX IF NOT EXISTS idx_items_cat ON items(category_id, seq);
CREATE TABLE IF NOT EXISTS history(
  id INTEGER PRIMARY KEY, item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  type TEXT NOT NULL, event_date TEXT NOT NULL, note TEXT, auto INTEGER NOT NULL DEFAULT 0,
  by_user TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE INDEX IF NOT EXISTS idx_hist_item ON history(item_id, event_date);
CREATE TABLE IF NOT EXISTS attachments(
  id INTEGER PRIMARY KEY, history_id INTEGER NOT NULL REFERENCES history(id) ON DELETE CASCADE,
  original_name TEXT NOT NULL, stored_name TEXT NOT NULL, mime TEXT, size INTEGER);
CREATE INDEX IF NOT EXISTS idx_att_hist ON attachments(history_id);
`);

const STATUSES = ['Active', 'In Stock', 'Issued', 'Under Repair', 'Inactive', 'Lost', 'Scrapped'];
const HISTORY_TYPES = ['Purchase', 'Issued / Assigned', 'Returned', 'Transferred', 'Repair / Service',
  'Maintenance', 'Inspection', 'Reading', 'Payment / Invoice', 'Note', 'Other'];

// First run: seed categories and a default admin.
if (db.prepare('SELECT COUNT(*) c FROM categories').get().c === 0) {
  const seed = require('./seed');
  const ins = db.prepare('INSERT INTO categories(name,prefix,grp,fields,sort) VALUES(?,?,?,?,?)');
  db.transaction(() => seed.forEach((c) => ins.run(c.name, c.prefix, c.grp, JSON.stringify(c.fields), c.sort)))();
}
if (db.prepare('SELECT COUNT(*) c FROM users').get().c === 0) {
  const pw = process.env.ADMIN_PASSWORD || 'Admin@12345';
  db.prepare('INSERT INTO users(username,name,password_hash,role,must_change) VALUES(?,?,?,?,1)')
    .run('admin', 'Administrator', bcrypt.hashSync(pw, 10), 'admin');
  console.log('Default login created: username "admin". Change the password after first sign-in.');
}
// Upgrade: older databases get the extended PC Details fields (existing fields and data are kept).
{
  const pc = db.prepare("SELECT * FROM categories WHERE prefix='PC'").get();
  if (pc) {
    const cur = JSON.parse(pc.fields);
    if (!cur.some((f) => f.key === 'device_type')) {
      const want = require('./seed').find((c) => c.prefix === 'PC').fields, byKey = new Map(cur.map((f) => [f.key, f]));
      const merged = want.map((f) => byKey.get(f.key) || f);
      cur.forEach((f) => { if (!want.some((w) => w.key === f.key)) merged.push(f); });
      db.prepare('UPDATE categories SET fields=? WHERE id=?').run(JSON.stringify(merged), pc.id);
    }
  }
}
// Upgrade (runs once): add fields and select options introduced in newer versions to existing categories.
// Existing fields, options and data are never removed or changed.
if (!(db.prepare("SELECT value FROM settings WHERE key='fieldsMigration'").get() || {}).value) {
  const seedList = require('./seed');
  const upd = db.prepare('UPDATE categories SET fields=? WHERE id=?');
  const atEnd = new Set(['original_sheet_data', 'issuance_log']);
  db.transaction(() => {
    for (const cat of db.prepare('SELECT * FROM categories').all()) {
      const want = seedList.find((c) => c.prefix === cat.prefix); if (!want) continue;
      const cur = JSON.parse(cat.fields); let changed = false;
      for (const wf of want.fields) {
        const ex = cur.find((f) => f.key === wf.key);
        if (!ex) {
          const at = atEnd.has(wf.key) ? -1 : cur.findIndex((f) => f.key === 'remarks');
          cur.splice(at < 0 ? cur.length : at, 0, wf); changed = true;
        } else if (wf.type === 'select' && ex.type === 'select') {
          const miss = wf.options.filter((o) => !ex.options.includes(o));
          if (miss.length) { ex.options.push(...miss); changed = true; }
        }
      }
      if (changed) upd.run(JSON.stringify(cur), cat.id);
    }
    db.prepare("INSERT INTO settings(key,value) VALUES('fieldsMigration','2')").run();
  })();
}
const setDefault = db.prepare('INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)');
setDefault.run('orgName', 'Perfact Group');
setDefault.run('baseUrl', process.env.BASE_URL || '');

module.exports = { db, DATA_DIR, UPLOAD_DIR, STATUSES, HISTORY_TYPES };
