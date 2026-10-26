const express = require('express');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const QRCode = require('qrcode');
const ExcelJS = require('exceljs');
const bcrypt = require('bcryptjs');
const archiver = require('archiver');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { db, DATA_DIR, UPLOAD_DIR, STATUSES, HISTORY_TYPES } = require('./db');

const app = express();
app.set('trust proxy', true);
app.disable('x-powered-by');
app.use((req, res, next) => { res.setHeader('X-Content-Type-Options', 'nosniff'); next(); });
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

/* ---------- helpers ---------- */
class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const bad = (msg, status = 400) => { throw new HttpError(status, msg); };
const wrap = (fn) => (req, res, next) => Promise.resolve().then(() => fn(req, res, next)).catch(next);
const today = () => new Date().toISOString().slice(0, 10);
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const rm = (name) => { if (name) fs.unlink(path.join(UPLOAD_DIR, path.basename(name)), () => {}); };
const getSetting = (k) => (db.prepare('SELECT value FROM settings WHERE key=?').get(k) || {}).value || '';

function baseUrl(req) {
  const v = getSetting('baseUrl').trim().replace(/\/+$/, '');
  return v || `${req.protocol}://${req.get('host')}`;
}

/* ---------- auth ---------- */
app.use((req, res, next) => {
  const t = req.cookies.sid;
  if (t) {
    req.user = db.prepare(`SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id
      WHERE s.token=? AND s.expires_at>? AND u.active=1`).get(t, Date.now());
  }
  next();
});
/* ---------- Excel two-way sync ---------- */
// The app writes Perfact-MIS-Live.xlsx after every change. When that file is changed in Excel
// (rows added, edited or deleted) the changes are read back into the database.
const SYNC_NAME = 'Perfact-MIS-Live.xlsx';
const DEFAULT_SYNC_DIR = path.join(DATA_DIR, 'excel');
const sync = { timer: null, running: false, again: false, dirty: false, retryAt: 0, rev: 1, lastOk: '', lastError: '', lastPull: '' };
const setSetting = (k, v) => db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(k, String(v));
const syncDir = () => (getSetting('syncDir').trim() || process.env.EXCEL_SYNC_DIR || DEFAULT_SYNC_DIR).trim();
const lockMsg = `${SYNC_NAME} is open in Excel, so the app could not update it. Close it, or save and close, and it refreshes by itself.`;
function scheduleSync() {
  sync.dirty = true; sync.rev++;
  clearTimeout(sync.timer);
  sync.timer = setTimeout(() => syncCycle(), 3000);
}
async function writeExcel(target) {
  const wb = await buildWorkbook({ history: true, index: true });
  const tmp = path.join(path.dirname(target), `.${SYNC_NAME}.tmp`);
  await wb.xlsx.writeFile(tmp);
  fs.renameSync(tmp, target);
  setSetting('syncMtime', fs.statSync(target).mtimeMs);
  setSetting('syncSnapshot', JSON.stringify(db.prepare('SELECT code FROM items').all().map((r) => r.code)));
}
async function syncCycle(opts = {}) {
  const dir = syncDir();
  if (sync.running) { sync.again = true; return; }
  if (Date.now() < sync.retryAt && !opts.force) return;
  sync.running = true;
  try {
    fs.mkdirSync(dir, { recursive: true });
    const target = path.join(dir, SYNC_NAME);
    let pulled = false;
    if (!opts.skipPull && fs.existsSync(target) && getSetting('syncSnapshot')) {
      const st = fs.statSync(target);
      if (String(st.mtimeMs) !== getSetting('syncMtime')) {
        try { pulled = await pullFromExcel(target); setSetting('syncMtime', st.mtimeMs); sync.lastError = ''; }
        catch (e) { sync.lastError = 'Could not read the Excel file yet, will retry: ' + e.message; sync.retryAt = Date.now() + 10000; return; }
      }
    }
    if (sync.dirty || pulled || opts.force || !fs.existsSync(target) || !getSetting('syncSnapshot')) {
      sync.dirty = false;
      try { await writeExcel(target); sync.lastOk = new Date().toISOString(); sync.lastError = ''; }
      catch (e) {
        sync.dirty = true; sync.retryAt = Date.now() + 30000;
        sync.lastError = /EBUSY|EPERM|EACCES/.test(String(e.code)) ? lockMsg : e.message;
        console.error('Excel sync write failed:', e.message);
      }
    }
  } catch (e) { sync.lastError = e.message; console.error('Excel sync failed:', e.message); }
  finally { sync.running = false; if (sync.again) { sync.again = false; setTimeout(() => syncCycle(), 500); } }
}
function pruneBackups(dir) {
  const files = fs.readdirSync(dir).filter((f) => f.startsWith('before-excel-sync-')).sort();
  files.slice(0, Math.max(0, files.length - 10)).forEach((f) => fs.unlink(path.join(dir, f), () => {}));
}
async function pullFromExcel(target) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(target);
  const cats = [...catMap().values()].sort((a, b) => a.sort - b.sort);
  const used = new Set(); sheetName('Index', used);
  const snapshot = new Set(JSON.parse(getSetting('syncSnapshot') || '[]'));
  const plan = []; const notes = [];
  for (const cat of cats) {
    const ws = wb.getWorksheet(sheetName(cat.name, used)); if (!ws) continue;
    const head = {}; ws.getRow(1).eachCell((c, i) => { head[cellText(c.value).toLowerCase()] = i; });
    if (!head.id) continue; // sheet without an ID column cannot be matched safely
    const fieldCols = cat.fields.map((f) => ({ f, col: head[f.label.toLowerCase()] })).filter((x) => x.col);
    const seen = new Set(), adds = [], edits = [];
    ws.eachRow((row, n) => {
      if (n === 1 || !row.hasValues) return;
      const rawId = cellText(row.getCell(head.id).value).toUpperCase().replace(/\s+/g, '');
      const m = rawId.match(/^([A-Z0-9]+)[\/-](\d+)$/);
      const seq = m && m[1] === cat.prefix ? Number(m[2]) : null;
      if (seq != null) seen.add(seq);
      const raw = {};
      for (const { f, col } of fieldCols) {
        let v = cellText(row.getCell(col).value);
        if (v && f.type === 'date') v = looseDate(v) || v;
        if (v && f.type === 'select') v = f.options.find((o) => o.toLowerCase() === v.toLowerCase()) || v;
        raw[f.key] = v;
      }
      let status = null;
      if (head.status) { const s = cellText(row.getCell(head.status).value); status = STATUSES.find((x) => x.toLowerCase() === s.toLowerCase()) || null; }
      (seq != null ? edits : adds).push({ seq, raw, status, n });
    });
    plan.push({ cat, seen, adds, edits, fieldCols });
  }
  let added = 0, updated = 0, removed = 0; const by = 'Excel sync';
  const dels = [];
  for (const p of plan) {
    const have = db.prepare('SELECT id, seq, code FROM items WHERE category_id=?').all(p.cat.id);
    const gone = have.filter((r) => snapshot.has(r.code) && !p.seen.has(r.seq));
    if (gone.length > Math.max(10, have.length * 0.3)) {
      notes.push(`${gone.length} rows missing from ${p.cat.name} were NOT deleted (too many at once). Delete them in the app if intended.`);
    } else gone.forEach((r) => dels.push(r));
  }
  if (dels.length) {
    const bdir = path.join(DATA_DIR, 'backups'); fs.mkdirSync(bdir, { recursive: true });
    db.prepare('VACUUM INTO ?').run(path.join(bdir, `before-excel-sync-${new Date().toISOString().replace(/[:.]/g, '-')}.db`));
    pruneBackups(bdir);
  }
  db.transaction(() => {
    for (const r of dels) { db.prepare('DELETE FROM items WHERE id=?').run(r.id); removed++; }
    for (const p of plan) {
      for (const e of p.edits) {
        const row = db.prepare('SELECT * FROM items WHERE category_id=? AND seq=?').get(p.cat.id, e.seq);
        if (!row) { // ID typed in Excel for a new asset: keep the number
          let data; try { data = validateData(p.cat, e.raw); } catch (er) { notes.push(`${p.cat.name} row ${e.n}: ${er.message}, skipped`); continue; }
          const code = `${p.cat.prefix}/${String(e.seq).padStart(2, '0')}`;
          const r = db.prepare('INSERT INTO items(category_id,seq,code,status,data,created_by) VALUES(?,?,?,?,?,?)').run(p.cat.id, e.seq, code, e.status || 'Active', JSON.stringify(data), by);
          db.prepare('UPDATE categories SET next_seq=MAX(next_seq,?) WHERE id=?').run(e.seq + 1, p.cat.id);
          addHistory(r.lastInsertRowid, 'Created', `Registered as ${code} (added in Excel)`, 1, by); added++;
          continue;
        }
        if (sync.dirty) continue; // app has newer unsaved changes, do not overwrite them from a stale sheet
        const full = { ...JSON.parse(row.data) };
        p.fieldCols.forEach(({ f }) => { full[f.key] = e.raw[f.key]; });
        let data; try { data = validateData(p.cat, full); } catch (er) { notes.push(`${row.code}: ${er.message}, not updated`); continue; }
        const old = JSON.parse(row.data), changes = [];
        for (const f of p.cat.fields) if ((old[f.key] || '') !== (data[f.key] || '')) changes.push(`${f.label}: ${old[f.key] || '(blank)'} → ${data[f.key] || '(blank)'}`);
        const status = e.status || row.status;
        if (!changes.length && status === row.status) continue;
        db.prepare("UPDATE items SET status=?, data=?, updated_at=datetime('now') WHERE id=?").run(status, JSON.stringify(data), row.id);
        if (status !== row.status) addHistory(row.id, 'Status Change', `${row.status} → ${status} (edited in Excel)`, 1, by);
        if (changes.length) addHistory(row.id, 'Updated', changes.join('\n') + '\n(edited in Excel)', 1, by);
        updated++;
      }
      for (const e of p.adds) {
        let data; try { data = validateData(p.cat, e.raw); } catch (er) { notes.push(`${p.cat.name} row ${e.n}: ${er.message}, skipped`); continue; }
        if (!Object.values(data).some(Boolean)) continue;
        const seq = db.prepare('SELECT next_seq FROM categories WHERE id=?').get(p.cat.id).next_seq;
        db.prepare('UPDATE categories SET next_seq=next_seq+1 WHERE id=?').run(p.cat.id);
        const code = `${p.cat.prefix}/${String(seq).padStart(2, '0')}`;
        const r = db.prepare('INSERT INTO items(category_id,seq,code,status,data,created_by) VALUES(?,?,?,?,?,?)').run(p.cat.id, seq, code, e.status || 'Active', JSON.stringify(data), by);
        addHistory(r.lastInsertRowid, 'Created', `Registered as ${code} (added in Excel)`, 1, by); added++;
      }
    }
  })();
  const changed = added + updated + removed > 0;
  if (changed || notes.length) {
    sync.rev++;
    sync.lastPull = `${new Date().toISOString()}|${added} added, ${updated} updated, ${removed} removed${notes.length ? '. ' + notes.join(' ') : ''}`;
  }
  return changed;
}
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.path.startsWith('/api/') && !/^\/api\/(login|logout|me)/.test(req.path)) {
    res.on('finish', () => { if (res.statusCode < 400) scheduleSync(); });
  }
  next();
});

const need = (req, res, next) => (req.user ? next() : res.status(401).json({ error: 'Please sign in' }));
const adminOnly = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Please sign in' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access is required for this action' });
  next();
};
const publicUser = (u) => ({ id: u.id, username: u.username, name: u.name, role: u.role, active: !!u.active, must_change: !!u.must_change, created_at: u.created_at });

const attempts = new Map();
app.post('/api/login', wrap((req, res) => {
  const username = String(req.body.username || '').trim().toLowerCase();
  const key = `${req.ip}|${username}`;
  const a = attempts.get(key);
  if (a && a.count >= 8 && Date.now() - a.first < 10 * 60e3) bad('Too many attempts. Try again in a few minutes.', 429);
  const u = db.prepare('SELECT * FROM users WHERE lower(username)=? AND active=1').get(username);
  if (!u || !bcrypt.compareSync(String(req.body.password || ''), u.password_hash)) {
    const n = a && Date.now() - a.first < 10 * 60e3 ? a : { count: 0, first: Date.now() };
    n.count++; attempts.set(key, n);
    bad('Incorrect username or password', 401);
  }
  attempts.delete(key);
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('DELETE FROM sessions WHERE expires_at<?').run(Date.now());
  db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(token, u.id, Date.now() + 7 * 864e5);
  res.cookie('sid', token, { httpOnly: true, sameSite: 'lax', secure: req.secure, maxAge: 7 * 864e5 });
  res.json({ user: publicUser(u) });
}));
app.post('/api/logout', (req, res) => {
  if (req.cookies.sid) db.prepare('DELETE FROM sessions WHERE token=?').run(req.cookies.sid);
  res.clearCookie('sid'); res.json({ ok: true });
});
app.get('/api/me', need, (req, res) => res.json({
  user: publicUser(req.user), statuses: STATUSES, historyTypes: HISTORY_TYPES,
  orgName: getSetting('orgName'), baseUrl: baseUrl(req), syncDir: syncDir(), syncFile: SYNC_NAME,
  syncOk: sync.lastOk, syncError: sync.lastError, syncPull: sync.lastPull,
}));
app.get('/api/sync/status', need, (req, res) => res.json({ rev: sync.rev, error: sync.lastError, pull: sync.lastPull, ok: sync.lastOk }));
app.post('/api/me/password', need, wrap((req, res) => {
  const { current, next } = req.body;
  if (!bcrypt.compareSync(String(current || ''), req.user.password_hash)) bad('Current password is incorrect');
  if (String(next || '').length < 8) bad('New password must be at least 8 characters');
  db.prepare('UPDATE users SET password_hash=?, must_change=0 WHERE id=?').run(bcrypt.hashSync(next, 10), req.user.id);
  res.json({ ok: true });
}));

/* ---------- users (admin) ---------- */
app.get('/api/users', adminOnly, (req, res) => res.json(db.prepare('SELECT * FROM users ORDER BY id').all().map(publicUser)));
app.post('/api/users', adminOnly, wrap((req, res) => {
  const { username, name, password, role } = req.body;
  if (!/^[a-z0-9._-]{3,30}$/i.test(username || '')) bad('Username must be 3 to 30 letters, numbers, dot, dash or underscore');
  if (!name || !String(name).trim()) bad('Name is required');
  if (String(password || '').length < 8) bad('Password must be at least 8 characters');
  if (!['admin', 'viewer'].includes(role)) bad('Invalid role');
  if (db.prepare('SELECT 1 FROM users WHERE lower(username)=lower(?)').get(username)) bad('Username already exists');
  const r = db.prepare('INSERT INTO users(username,name,password_hash,role,must_change) VALUES(?,?,?,?,1)')
    .run(username, String(name).trim(), bcrypt.hashSync(password, 10), role);
  res.json(publicUser(db.prepare('SELECT * FROM users WHERE id=?').get(r.lastInsertRowid)));
}));
app.put('/api/users/:id', adminOnly, wrap((req, res) => {
  const u = db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id);
  if (!u) bad('User not found', 404);
  const role = req.body.role ?? u.role, active = req.body.active === undefined ? u.active : (req.body.active ? 1 : 0);
  const name = req.body.name ? String(req.body.name).trim() : u.name;
  if (!['admin', 'viewer'].includes(role)) bad('Invalid role');
  const admins = db.prepare("SELECT COUNT(*) c FROM users WHERE role='admin' AND active=1 AND id<>?").get(u.id).c;
  if (admins === 0 && (role !== 'admin' || !active)) bad('At least one active admin is required');
  let hash = u.password_hash, mc = u.must_change;
  if (req.body.password) {
    if (String(req.body.password).length < 8) bad('Password must be at least 8 characters');
    hash = bcrypt.hashSync(req.body.password, 10); mc = 1;
  }
  db.prepare('UPDATE users SET name=?, role=?, active=?, password_hash=?, must_change=? WHERE id=?').run(name, role, active, hash, mc, u.id);
  if (!active || req.body.password) db.prepare('DELETE FROM sessions WHERE user_id=?').run(u.id);
  res.json(publicUser(db.prepare('SELECT * FROM users WHERE id=?').get(u.id)));
}));

/* ---------- settings ---------- */
app.put('/api/settings', adminOnly, wrap((req, res) => {
  const up = db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
  if (req.body.orgName !== undefined) up.run('orgName', String(req.body.orgName).trim() || 'Perfact Group');
  if (req.body.baseUrl !== undefined) {
    const b = String(req.body.baseUrl).trim().replace(/\/+$/, '');
    if (b && !/^https?:\/\/[^\s]+$/i.test(b)) bad('Base URL must start with http:// or https://');
    up.run('baseUrl', b);
  }
  if (req.body.syncDir !== undefined) {
    const d = String(req.body.syncDir).trim().replace(/^"+|"+$/g, '');
    if (d) {
      try { fs.mkdirSync(d, { recursive: true }); fs.accessSync(d, fs.constants.W_OK); }
      catch (e) { bad('This folder cannot be used: ' + e.message); }
    }
    up.run('syncDir', d);
    syncCycle({ force: true, skipPull: true });
  }
  res.json({ orgName: getSetting('orgName'), baseUrl: baseUrl(req), syncDir: syncDir(), syncFile: SYNC_NAME });
}));

/* ---------- categories ---------- */
const parseCat = (c) => ({ ...c, fields: JSON.parse(c.fields) });
const getCat = (id) => { const c = db.prepare('SELECT * FROM categories WHERE id=?').get(id); return c ? parseCat(c) : null; };
const FIELD_TYPES = ['text', 'textarea', 'number', 'money', 'date', 'select'];

function cleanFields(list) {
  if (!Array.isArray(list) || list.length === 0) bad('Add at least one field');
  const used = new Set();
  return list.map((f) => {
    const label = String(f.label || '').trim();
    if (!label) bad('Every field needs a label');
    if (!FIELD_TYPES.includes(f.type)) bad(`Invalid type for ${label}`);
    let key = f.key && /^[a-z0-9_]+$/.test(f.key) ? f.key : slug(label) || 'field';
    const base = key; let i = 2;
    while (used.has(key)) key = `${base}_${i++}`;
    used.add(key);
    const out = { key, label, type: f.type };
    if (f.type === 'select') {
      out.options = [...new Set((f.options || []).map((o) => String(o).replace(/,/g, ' ').trim()).filter(Boolean))];
      if (!out.options.length) bad(`${label}: add at least one dropdown option`);
    }
    if (f.required) out.required = true;
    if (f.expiry && f.type === 'date') out.expiry = true;
    return out;
  });
}

app.get('/api/categories', need, (req, res) => {
  const rows = db.prepare(`SELECT c.*, (SELECT COUNT(*) FROM items i WHERE i.category_id=c.id) AS count
    FROM categories c ORDER BY c.sort, c.id`).all();
  res.json(rows.map(parseCat));
});
app.post('/api/categories', adminOnly, wrap((req, res) => {
  const name = String(req.body.name || '').trim(), prefix = String(req.body.prefix || '').trim().toUpperCase();
  if (!name) bad('Category name is required');
  if (!/^[A-Z0-9]{1,8}$/.test(prefix)) bad('ID prefix must be 1 to 8 letters or digits, e.g. PC');
  if (db.prepare('SELECT 1 FROM categories WHERE lower(name)=lower(?) OR prefix=?').get(name, prefix)) bad('Name or prefix already exists');
  const fields = cleanFields(req.body.fields);
  const sort = (db.prepare('SELECT MAX(sort) m FROM categories').get().m || 0) + 1;
  const r = db.prepare('INSERT INTO categories(name,prefix,grp,fields,sort) VALUES(?,?,?,?,?)')
    .run(name, prefix, String(req.body.grp || 'Other').trim() || 'Other', JSON.stringify(fields), sort);
  res.json(getCat(r.lastInsertRowid));
}));
app.put('/api/categories/:id', adminOnly, wrap((req, res) => {
  const c = getCat(req.params.id); if (!c) bad('Category not found', 404);
  const count = db.prepare('SELECT COUNT(*) c FROM items WHERE category_id=?').get(c.id).c;
  const name = String(req.body.name || c.name).trim();
  const prefix = req.body.prefix ? String(req.body.prefix).trim().toUpperCase() : c.prefix;
  if (prefix !== c.prefix && count > 0) bad('The ID prefix cannot change once items exist, because printed QR codes use it');
  if (!/^[A-Z0-9]{1,8}$/.test(prefix)) bad('ID prefix must be 1 to 8 letters or digits');
  if (db.prepare('SELECT 1 FROM categories WHERE (lower(name)=lower(?) OR prefix=?) AND id<>?').get(name, prefix, c.id)) bad('Name or prefix already exists');
  const fields = req.body.fields ? cleanFields(req.body.fields) : c.fields;
  db.prepare('UPDATE categories SET name=?, prefix=?, grp=?, fields=? WHERE id=?')
    .run(name, prefix, String(req.body.grp || c.grp).trim() || 'Other', JSON.stringify(fields), c.id);
  res.json(getCat(c.id));
}));
app.delete('/api/categories/:id', adminOnly, wrap((req, res) => {
  const c = getCat(req.params.id); if (!c) bad('Category not found', 404);
  if (db.prepare('SELECT COUNT(*) c FROM items WHERE category_id=?').get(c.id).c) bad('Delete or move the items in this category first');
  db.prepare('DELETE FROM categories WHERE id=?').run(c.id);
  res.json({ ok: true });
}));

/* ---------- uploads ---------- */
const IMG_EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };
const FILE_MIME = { ...IMG_EXT, 'application/pdf': '.pdf' };
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, crypto.randomBytes(16).toString('hex') + (FILE_MIME[file.mimetype] || '')),
  }),
  limits: { fileSize: 25 * 1024 * 1024, files: 16 },
  fileFilter: (req, file, cb) => {
    const ok = file.fieldname === 'image' ? IMG_EXT[file.mimetype] : FILE_MIME[file.mimetype];
    cb(ok ? null : new HttpError(400, file.fieldname === 'image' ? 'Photo must be a JPG, PNG, WebP or GIF image' : 'Only PDF and image files can be attached'), !!ok);
  },
});
const uploadFields = upload.fields([{ name: 'image', maxCount: 1 }, { name: 'files', maxCount: 15 }]);
// Runs the upload, then the handler; removes saved files if the handler fails.
const withUpload = (handler) => (req, res, next) => uploadFields(req, res, (err) => {
  if (err) return next(err.code === 'LIMIT_FILE_SIZE' ? new HttpError(400, 'Each file must be 25 MB or smaller') : err);
  const saved = [...(req.files?.image || []), ...(req.files?.files || [])];
  Promise.resolve().then(() => handler(req, res)).catch((e) => { saved.forEach((f) => rm(f.filename)); next(e); });
});

app.get('/files/:name', need, (req, res) => {
  const name = path.basename(req.params.name), p = path.join(UPLOAD_DIR, name);
  if (!fs.existsSync(p)) return res.status(404).send('File not found');
  const att = db.prepare('SELECT original_name, mime FROM attachments WHERE stored_name=?').get(name);
  if (att) {
    res.type(att.mime || 'application/octet-stream');
    res.setHeader('Content-Disposition', `${req.query.download ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(att.original_name)}`);
  }
  res.sendFile(p);
});

/* ---------- items ---------- */
function validateData(cat, input) {
  const out = {};
  for (const f of cat.fields) {
    let v = input[f.key]; v = v == null ? '' : String(v).trim();
    if (f.required && !v) bad(`${f.label} is required`);
    if (v) {
      if (f.type === 'number' || f.type === 'money') {
        const n = Number(v.replace(/,/g, '')); if (!isFinite(n)) bad(`${f.label} must be a number`); v = String(n);
      } else if (f.type === 'date') {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || isNaN(Date.parse(v))) bad(`${f.label} must be a valid date`);
      } else if (f.type === 'select') {
        const m = f.options.find((o) => o.toLowerCase() === v.toLowerCase());
        if (!m) bad(`${f.label}: "${v}" is not one of the allowed options`); v = m;
      }
    }
    out[f.key] = v;
  }
  return out;
}
const titleOf = (cat, data) => cat.fields.map((f) => data[f.key]).filter(Boolean).slice(0, 2).join(' ');
function itemOut(row, cat) {
  const data = JSON.parse(row.data);
  return {
    id: row.id, category_id: row.category_id, category_name: cat.name, prefix: cat.prefix, code: row.code, seq: row.seq,
    status: row.status, data, title: titleOf(cat, data), image: row.image, imageUrl: row.image ? `/files/${row.image}` : null,
    created_by: row.created_by, created_at: row.created_at, updated_at: row.updated_at,
  };
}
function addHistory(itemId, type, note, auto, by, date, files = []) {
  const r = db.prepare('INSERT INTO history(item_id,type,event_date,note,auto,by_user) VALUES(?,?,?,?,?,?)')
    .run(itemId, type, date || today(), note || '', auto ? 1 : 0, by);
  const ins = db.prepare('INSERT INTO attachments(history_id,original_name,stored_name,mime,size) VALUES(?,?,?,?,?)');
  files.forEach((f) => ins.run(r.lastInsertRowid, Buffer.from(f.originalname, 'latin1').toString('utf8'), f.filename, f.mimetype, f.size));
  return r.lastInsertRowid;
}
const checkStatus = (s) => { if (!STATUSES.includes(s)) bad('Invalid status'); return s; };
const parseJson = (s, what) => { try { return JSON.parse(s || '{}'); } catch { bad(`Invalid ${what}`); } };

function queryItems({ category, q, status }, limit, offset) {
  const where = [], args = [];
  if (category) { where.push('i.category_id=?'); args.push(category); }
  if (status) { where.push('i.status=?'); args.push(status); }
  if (q) { where.push('(i.code LIKE ? OR i.data LIKE ?)'); args.push(`%${q}%`, `%${String(q).replace(/"/g, '')}%`); }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const total = db.prepare(`SELECT COUNT(*) c FROM items i ${w}`).get(...args).c;
  const rows = db.prepare(`SELECT i.* FROM items i JOIN categories c ON c.id=i.category_id ${w}
    ORDER BY c.sort, i.seq ${limit ? 'LIMIT ? OFFSET ?' : ''}`).all(...args, ...(limit ? [limit, offset] : []));
  return { total, rows };
}
const catMap = () => new Map(db.prepare('SELECT * FROM categories').all().map((c) => [c.id, parseCat(c)]));

app.get('/api/items', need, (req, res) => {
  const pageSize = Math.min(Math.max(parseInt(req.query.pageSize) || 25, 1), 200);
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const { total, rows } = queryItems(req.query, pageSize, (page - 1) * pageSize);
  const cats = catMap();
  res.json({ total, page, pageSize, items: rows.map((r) => itemOut(r, cats.get(r.category_id))) });
});
app.get('/api/items/lookup', need, wrap((req, res) => {
  const code = String(req.query.code || '').trim().toUpperCase().replace(/\s+/g, '');
  const m = code.match(/^([A-Z0-9]+)[\/-]0*(\d+)$/);
  const row = m && db.prepare('SELECT i.* FROM items i JOIN categories c ON c.id=i.category_id WHERE c.prefix=? AND i.seq=?').get(m[1], Number(m[2]));
  if (!row) bad('No item found with that ID', 404);
  res.json(itemOut(row, getCat(row.category_id)));
}));
app.get('/api/items/:id', need, wrap((req, res) => {
  const row = db.prepare('SELECT * FROM items WHERE id=?').get(req.params.id);
  if (!row) bad('Item not found', 404);
  const cat = getCat(row.category_id);
  res.json({ ...itemOut(row, cat), fields: cat.fields, url: `${baseUrl(req)}/i/${row.code}` });
}));
app.post('/api/categories/:id/items', adminOnly, withUpload((req, res) => {
  const cat = getCat(req.params.id); if (!cat) bad('Category not found', 404);
  const data = validateData(cat, parseJson(req.body.data, 'data'));
  const status = checkStatus(req.body.status || 'Active');
  const image = req.files?.image?.[0]?.filename || null;
  const id = db.transaction(() => {
    const seq = db.prepare('SELECT next_seq FROM categories WHERE id=?').get(cat.id).next_seq;
    db.prepare('UPDATE categories SET next_seq=next_seq+1 WHERE id=?').run(cat.id);
    const code = `${cat.prefix}/${String(seq).padStart(2, '0')}`;
    const r = db.prepare('INSERT INTO items(category_id,seq,code,status,data,image,created_by) VALUES(?,?,?,?,?,?,?)')
      .run(cat.id, seq, code, status, JSON.stringify(data), image, req.user.name);
    addHistory(r.lastInsertRowid, 'Created', `Registered as ${code}`, 1, req.user.name);
    return r.lastInsertRowid;
  })();
  res.json(itemOut(db.prepare('SELECT * FROM items WHERE id=?').get(id), cat));
}));
app.put('/api/items/:id', adminOnly, withUpload((req, res) => {
  const row = db.prepare('SELECT * FROM items WHERE id=?').get(req.params.id);
  if (!row) bad('Item not found', 404);
  const cat = getCat(row.category_id);
  const data = validateData(cat, parseJson(req.body.data, 'data'));
  const status = checkStatus(req.body.status || row.status);
  const old = JSON.parse(row.data), changes = [];
  for (const f of cat.fields) if ((old[f.key] || '') !== (data[f.key] || '')) changes.push(`${f.label}: ${old[f.key] || '(blank)'} → ${data[f.key] || '(blank)'}`);
  let image = row.image, oldImage = null;
  const newImg = req.files?.image?.[0]?.filename;
  if (newImg) { oldImage = row.image; image = newImg; changes.push('Photo updated'); }
  else if (req.body.removeImage === '1' && row.image) { oldImage = row.image; image = null; changes.push('Photo removed'); }
  db.transaction(() => {
    db.prepare("UPDATE items SET status=?, data=?, image=?, updated_at=datetime('now') WHERE id=?").run(status, JSON.stringify(data), image, row.id);
    if (status !== row.status) addHistory(row.id, 'Status Change', `${row.status} → ${status}`, 1, req.user.name);
    if (changes.length) addHistory(row.id, 'Updated', changes.join('\n'), 1, req.user.name);
  })();
  rm(oldImage);
  res.json(itemOut(db.prepare('SELECT * FROM items WHERE id=?').get(row.id), cat));
}));
app.delete('/api/items/:id', adminOnly, wrap((req, res) => {
  const row = db.prepare('SELECT * FROM items WHERE id=?').get(req.params.id);
  if (!row) bad('Item not found', 404);
  const files = db.prepare('SELECT stored_name FROM attachments WHERE history_id IN (SELECT id FROM history WHERE item_id=?)').all(row.id);
  db.prepare('DELETE FROM items WHERE id=?').run(row.id);
  files.forEach((f) => rm(f.stored_name)); rm(row.image);
  res.json({ ok: true });
}));
app.get('/api/items/:id/qr.png', need, wrap(async (req, res) => {
  const row = db.prepare('SELECT code FROM items WHERE id=?').get(req.params.id);
  if (!row) bad('Item not found', 404);
  const png = await QRCode.toBuffer(`${baseUrl(req)}/i/${row.code}`, { width: 480, margin: 1, errorCorrectionLevel: 'M' });
  res.type('png');
  if (req.query.download) res.setHeader('Content-Disposition', `attachment; filename="QR-${row.code.replace('/', '-')}.png"`);
  res.send(png);
}));
app.get('/i/:p/:n', (req, res) => res.redirect(`/#/item/${encodeURIComponent(req.params.p)}/${encodeURIComponent(req.params.n)}`));

/* ---------- history ---------- */
function withAttachments(rows) {
  if (!rows.length) return rows;
  const ids = rows.map((r) => r.id);
  const atts = db.prepare(`SELECT * FROM attachments WHERE history_id IN (${ids.map(() => '?').join(',')}) ORDER BY id`).all(...ids);
  return rows.map((r) => ({
    ...r, auto: !!r.auto,
    attachments: atts.filter((a) => a.history_id === r.id).map((a) => ({ id: a.id, name: a.original_name, mime: a.mime, size: a.size, url: `/files/${a.stored_name}` })),
  }));
}
app.get('/api/history', need, (req, res) => {
  const where = [], args = [];
  const { item, category, type, q, from, to, source } = req.query;
  if (item) { where.push('h.item_id=?'); args.push(item); }
  if (category) { where.push('i.category_id=?'); args.push(category); }
  if (type) { where.push('h.type=?'); args.push(type); }
  if (source === 'manual') where.push('h.auto=0');
  if (from) { where.push('h.event_date>=?'); args.push(from); }
  if (to) { where.push('h.event_date<=?'); args.push(to); }
  if (q) { where.push('(h.note LIKE ? OR i.code LIKE ? OR h.type LIKE ?)'); args.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const pageSize = Math.min(parseInt(req.query.pageSize) || 50, 500), page = Math.max(parseInt(req.query.page) || 1, 1);
  const base = `FROM history h JOIN items i ON i.id=h.item_id JOIN categories c ON c.id=i.category_id ${w}`;
  const total = db.prepare(`SELECT COUNT(*) c ${base}`).get(...args).c;
  const rows = db.prepare(`SELECT h.*, i.code, c.name AS category_name ${base} ORDER BY h.event_date DESC, h.id DESC LIMIT ? OFFSET ?`)
    .all(...args, pageSize, (page - 1) * pageSize);
  res.json({ total, page, pageSize, entries: withAttachments(rows) });
});
app.post('/api/items/:id/history', adminOnly, withUpload((req, res) => {
  const item = db.prepare('SELECT * FROM items WHERE id=?').get(req.params.id);
  if (!item) bad('Item not found', 404);
  const type = String(req.body.type || '');
  if (!HISTORY_TYPES.includes(type)) bad('Choose a valid entry type');
  const date = String(req.body.event_date || today());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) bad('Enter a valid date');
  const note = String(req.body.note || '').trim(), files = req.files?.files || [];
  if (!note && !files.length) bad('Add a note or attach at least one file');
  const id = db.transaction(() => {
    db.prepare("UPDATE items SET updated_at=datetime('now') WHERE id=?").run(item.id);
    return addHistory(item.id, type, note, 0, req.user.name, date, files);
  })();
  res.json(withAttachments([db.prepare('SELECT * FROM history WHERE id=?').get(id)])[0]);
}));
app.put('/api/history/:id', adminOnly, withUpload((req, res) => {
  const h = db.prepare('SELECT * FROM history WHERE id=?').get(req.params.id);
  if (!h) bad('Entry not found', 404);
  if (h.auto) bad('System entries cannot be edited');
  const type = req.body.type || h.type, date = req.body.event_date || h.event_date;
  if (!HISTORY_TYPES.includes(type)) bad('Invalid entry type');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) bad('Enter a valid date');
  const files = req.files?.files || [];
  let removeIds = []; try { removeIds = JSON.parse(req.body.removeAttachments || '[]'); } catch { /* ignore */ }
  db.transaction(() => {
    db.prepare('UPDATE history SET type=?, event_date=?, note=? WHERE id=?').run(type, date, String(req.body.note ?? h.note).trim(), h.id);
    removeIds.forEach((aid) => {
      const a = db.prepare('SELECT * FROM attachments WHERE id=? AND history_id=?').get(aid, h.id);
      if (a) { db.prepare('DELETE FROM attachments WHERE id=?').run(a.id); rm(a.stored_name); }
    });
    const ins = db.prepare('INSERT INTO attachments(history_id,original_name,stored_name,mime,size) VALUES(?,?,?,?,?)');
    files.forEach((f) => ins.run(h.id, Buffer.from(f.originalname, 'latin1').toString('utf8'), f.filename, f.mimetype, f.size));
  })();
  res.json(withAttachments([db.prepare('SELECT * FROM history WHERE id=?').get(h.id)])[0]);
}));
app.delete('/api/history/:id', adminOnly, wrap((req, res) => {
  const h = db.prepare('SELECT * FROM history WHERE id=?').get(req.params.id);
  if (!h) bad('Entry not found', 404);
  const files = db.prepare('SELECT stored_name FROM attachments WHERE history_id=?').all(h.id);
  db.prepare('DELETE FROM history WHERE id=?').run(h.id);
  files.forEach((f) => rm(f.stored_name));
  res.json({ ok: true });
}));

/* ---------- search & dashboard ---------- */
app.get('/api/search', need, (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json([]);
  const { rows } = queryItems({ q }, 12, 0);
  const cats = catMap();
  res.json(rows.map((r) => itemOut(r, cats.get(r.category_id))));
});
app.get('/api/dashboard', need, (req, res) => {
  const cats = catMap();
  const byCat = db.prepare(`SELECT c.id, c.name, c.prefix, COUNT(i.id) count FROM categories c LEFT JOIN items i ON i.category_id=c.id GROUP BY c.id ORDER BY c.sort`).all();
  const byStatus = db.prepare('SELECT status, COUNT(*) count FROM items GROUP BY status').all();
  const recent = withAttachments(db.prepare(`SELECT h.*, i.code, c.name AS category_name FROM history h JOIN items i ON i.id=h.item_id
    JOIN categories c ON c.id=i.category_id ORDER BY h.id DESC LIMIT 10`).all());
  const limit = new Date(Date.now() + 60 * 864e5).toISOString().slice(0, 10), from = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const soon = [];
  for (const row of db.prepare("SELECT * FROM items WHERE status NOT IN ('Scrapped','Lost','Inactive')").all()) {
    const cat = cats.get(row.category_id), data = JSON.parse(row.data);
    for (const f of cat.fields) {
      const v = f.expiry && data[f.key];
      if (v && v >= from && v <= limit) soon.push({ id: row.id, code: row.code, title: titleOf(cat, data), category: cat.name, field: f.label, date: v,
        days: Math.round((Date.parse(v) - Date.parse(today())) / 864e5) });
    }
  }
  soon.sort((a, b) => a.date.localeCompare(b.date));
  res.json({
    totalItems: byCat.reduce((s, c) => s + c.count, 0), totalCategories: byCat.length, byCat, byStatus, recent,
    expiring: soon.slice(0, 40), expiringTotal: soon.length,
  });
});

/* ---------- Excel export / import ---------- */
const INR_FMT = '[>=10000000]##\\,##\\,##\\,##0;[>=100000]##\\,##\\,##0;##,##0';
const DATE_FMT = 'dd-mmm-yy';
const CLASSIFICATION = 'CONFIDENTIAL';
const isoToDate = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const stamp = (s) => (s ? new Date(s.replace(' ', 'T') + 'Z') : null);
const safeName = (s) => String(s).replace(/[^\w.-]+/g, '_');

function sheetName(name, used) {
  const base = name.replace(/[\[\]:*?\/\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 31);
  let n = base, i = 2;
  while (used.has(n.toLowerCase())) n = `${base.slice(0, 28)} ${i++}`;
  used.add(n.toLowerCase());
  return n;
}
function styleHeader(ws, cols) {
  const r = ws.getRow(1);
  r.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F5C63' } };
  r.alignment = { vertical: 'middle', wrapText: true };
  r.height = 24;
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  cols.forEach((c, i) => { ws.getColumn(i + 1).width = c.width; });
  ws.headerFooter.oddFooter = `&C${CLASSIFICATION}`;
  ws.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
}
function addTableOrHeader(ws, name, cols, rows) {
  if (rows.length) {
    ws.addTable({ name, ref: 'A1', headerRow: true, totalsRow: false, style: { theme: 'TableStyleMedium2', showRowStripes: true },
      columns: cols.map((c) => ({ name: c.header, filterButton: true })), rows });
  } else ws.addRow(cols.map((c) => c.header));
  styleHeader(ws, cols);
}
function applyFormats(ws, cols, rowCount, extraRows) {
  const last = rowCount + 1 + extraRows;
  cols.forEach((c, i) => {
    for (let r = 2; r <= Math.max(rowCount + 1, 2); r++) {
      const cell = ws.getCell(r, i + 1);
      if (c.fmt) cell.numFmt = c.fmt;
      if (c.wrap) cell.alignment = { wrapText: true, vertical: 'top' };
    }
    if (c.list) {
      for (let r = 2; r <= last; r++) {
        ws.getCell(r, i + 1).dataValidation = { type: 'list', allowBlank: true, formulae: [`"${c.list.join(',')}"`],
          showErrorMessage: true, errorTitle: 'Invalid entry', error: 'Choose a value from the list' };
      }
    }
  });
}

function categorySheet(wb, cat, items, { images, history, used, template }) {
  const ws = wb.addWorksheet(sheetName(cat.name, used), { properties: { tabColor: { argb: 'FF0F5C63' } } });
  const cols = [{ header: 'ID', width: 12 }, { header: 'Status', width: 14, list: STATUSES }];
  if (images && !template) cols.push({ header: 'Photo', width: 14 });
  cat.fields.forEach((f) => cols.push({
    header: f.label, width: Math.min(Math.max(f.label.length + 4, 16), f.type === 'textarea' ? 40 : 30),
    fmt: f.type === 'date' ? DATE_FMT : f.type === 'money' ? INR_FMT : f.type === 'number' ? '#,##0.##' : undefined,
    wrap: f.type === 'textarea', list: f.type === 'select' ? f.options : undefined,
  }));
  if (!template) cols.push({ header: 'Created On', width: 14, fmt: DATE_FMT }, { header: 'Last Updated', width: 14, fmt: DATE_FMT }, { header: 'History Entries', width: 12 });
  const counts = new Map(db.prepare('SELECT item_id, COUNT(*) c FROM history GROUP BY item_id').all().map((r) => [r.item_id, r.c]));
  const rows = template ? [] : items.map((it) => {
    const d = JSON.parse(it.data);
    return [it.code, it.status, ...(images ? [''] : []), ...cat.fields.map((f) => {
      const v = d[f.key]; if (!v) return '';
      return f.type === 'date' ? isoToDate(v) : (f.type === 'number' || f.type === 'money') ? Number(v) : v;
    }), stamp(it.created_at), stamp(it.updated_at), counts.get(it.id) || 0];
  });
  addTableOrHeader(ws, `T_${cat.prefix}_${cat.id}`, cols, rows);
  applyFormats(ws, cols, rows.length, template ? 500 : 200);
  if (images && !template) {
    items.forEach((it, i) => {
      if (!it.image) return;
      const ext = path.extname(it.image).slice(1).replace('jpg', 'jpeg');
      if (!['jpeg', 'png', 'gif'].includes(ext)) return;
      try {
        const id = wb.addImage({ buffer: fs.readFileSync(path.join(UPLOAD_DIR, it.image)), extension: ext });
        ws.addImage(id, { tl: { col: 2, row: i + 1 }, ext: { width: 64, height: 64 }, editAs: 'oneCell' });
        ws.getRow(i + 2).height = 52;
      } catch { /* skip unreadable image */ }
    });
  }
  return ws;
}

function historySheet(wb, entries, used) {
  const ws = wb.addWorksheet(sheetName('Item History Log', used), { properties: { tabColor: { argb: 'FFB45309' } } });
  const cols = [{ header: 'ID', width: 12 }, { header: 'Category', width: 28 }, { header: 'Date', width: 12, fmt: DATE_FMT },
    { header: 'Type', width: 18 }, { header: 'Details', width: 60, wrap: true }, { header: 'Recorded By', width: 18 },
    { header: 'Source', width: 10 }, { header: 'Attachments', width: 40, wrap: true }, { header: 'Recorded On', width: 14, fmt: DATE_FMT }];
  const rows = entries.map((e) => [e.code, e.category_name, isoToDate(e.event_date), e.type, e.note || '', e.by_user || '',
    e.auto ? 'System' : 'Manual', e.attachments.map((a) => a.name).join('\n'), stamp(e.created_at)]);
  addTableOrHeader(ws, 'T_History', cols, rows);
  applyFormats(ws, cols, rows.length, 0);
}

function allHistory(filters = {}) {
  const where = [], args = [];
  if (filters.category) { where.push('i.category_id=?'); args.push(filters.category); }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const rows = db.prepare(`SELECT h.*, i.code, c.name AS category_name FROM history h JOIN items i ON i.id=h.item_id
    JOIN categories c ON c.id=i.category_id ${w} ORDER BY c.sort, i.seq, h.event_date, h.id`).all(...args);
  return withAttachments(rows);
}

async function buildWorkbook({ category, q, status, images, history, index }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = getSetting('orgName') || 'Perfact Group'; wb.created = new Date();
  const used = new Set();
  const cats = [...catMap().values()].sort((a, b) => a.sort - b.sort).filter((c) => !category || String(c.id) === String(category));
  if (category && !cats.length) bad('Category not found', 404);
  if (index) {
    const ws = wb.addWorksheet(sheetName('Index', used));
    const cols = [{ header: 'Category', width: 46 }, { header: 'ID Prefix', width: 12 }, { header: 'Items', width: 10 }, { header: 'Group', width: 28 }];
    const rows = cats.map((c) => [c.name, c.prefix, queryItems({ category: c.id, q, status }).total, c.grp]);
    addTableOrHeader(ws, 'T_Index', cols, rows);
  }
  for (const cat of cats) {
    const { rows } = queryItems({ category: cat.id, q, status });
    categorySheet(wb, cat, rows, { images, history, used });
  }
  if (history) historySheet(wb, allHistory({ category }), used);
  return wb;
}

app.get('/api/export.xlsx', need, wrap(async (req, res) => {
  const wb = await buildWorkbook({ category: req.query.category, q: req.query.q, status: req.query.status,
    images: req.query.images === '1', history: req.query.history === '1', index: !req.query.category });
  const label = req.query.category ? safeName(getCat(req.query.category)?.name || 'Category') : 'All-Categories';
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="MIS-${label}-${today()}.xlsx"`);
  await wb.xlsx.write(res); res.end();
}));
app.get('/api/history.xlsx', need, wrap(async (req, res) => {
  const wb = new ExcelJS.Workbook(); historySheet(wb, allHistory(req.query), new Set());
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="MIS-History-${today()}.xlsx"`);
  await wb.xlsx.write(res); res.end();
}));
app.get('/api/categories/:id/template.xlsx', need, wrap(async (req, res) => {
  const cat = getCat(req.params.id); if (!cat) bad('Category not found', 404);
  const wb = new ExcelJS.Workbook(); categorySheet(wb, cat, [], { template: true, used: new Set() });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="Import-Template-${safeName(cat.name)}.xlsx"`);
  await wb.xlsx.write(res); res.end();
}));

// Complete backup: workbook (with photos and history), organised attachments, photos and a database copy.
app.get('/api/export/backup.zip', adminOnly, wrap(async (req, res) => {
  const wb = await buildWorkbook({ images: true, history: true, index: true });
  const xlsx = await wb.xlsx.writeBuffer();
  const tmpDb = path.join(os.tmpdir(), `mis-${Date.now()}.db`);
  db.prepare('VACUUM INTO ?').run(tmpDb);
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="MIS-Full-Backup-${today()}.zip"`);
  const zip = archiver('zip', { zlib: { level: 6 } });
  zip.on('error', (e) => { console.error(e); res.destroy(); });
  res.on('close', () => fs.unlink(tmpDb, () => {}));
  zip.pipe(res);
  zip.append(Buffer.from(xlsx), { name: 'MIS-All-Data.xlsx' });
  zip.file(tmpDb, { name: 'database/mis.db' });
  for (const it of db.prepare('SELECT code, image FROM items WHERE image IS NOT NULL').all()) {
    if (fs.existsSync(path.join(UPLOAD_DIR, it.image))) zip.file(path.join(UPLOAD_DIR, it.image), { name: `photos/${safeName(it.code)}${path.extname(it.image)}` });
  }
  const atts = db.prepare(`SELECT a.*, h.event_date, i.code FROM attachments a JOIN history h ON h.id=a.history_id JOIN items i ON i.id=h.item_id`).all();
  for (const a of atts) {
    const p = path.join(UPLOAD_DIR, a.stored_name);
    if (fs.existsSync(p)) zip.file(p, { name: `history-files/${safeName(a.code)}/${a.event_date}_${a.id}_${safeName(a.original_name)}` });
  }
  await zip.finalize();
}));

/* import */
const memUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
function cellText(v) {
  if (v == null) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'object') {
    if (v.richText) return v.richText.map((r) => r.text).join('');
    if (v.text !== undefined) return String(v.text);
    if (v.result !== undefined) return cellText(v.result);
    return '';
  }
  return String(v).trim();
}
function looseDate(v) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const m = v.match(/^(\d{1,2})[-\/.\s]([A-Za-z]{3,9}|\d{1,2})[-\/.\s](\d{2,4})$/);
  if (!m) return null;
  const mon = isNaN(m[2]) ? MONTHS[m[2].slice(0, 3).toLowerCase()] : Number(m[2]);
  const yr = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  if (!mon || mon > 12 || Number(m[1]) > 31) return null;
  return `${yr}-${String(mon).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
}
app.post('/api/categories/:id/import', adminOnly, memUpload.single('file'), wrap(async (req, res) => {
  const cat = getCat(req.params.id); if (!cat) bad('Category not found', 404);
  if (!req.file) bad('Choose an Excel file (.xlsx) to import');
  const wb = new ExcelJS.Workbook();
  try { await wb.xlsx.load(req.file.buffer); } catch { bad('Could not read the file. Use the downloaded template (.xlsx).'); }
  const ws = wb.worksheets[0]; if (!ws) bad('The workbook has no sheets');
  const head = {}; ws.getRow(1).eachCell((c, i) => { head[cellText(c.value).toLowerCase()] = i; });
  const fieldCols = cat.fields.map((f) => ({ f, col: head[f.label.toLowerCase()] })).filter((x) => x.col);
  if (!fieldCols.length) bad('No matching column headings found. Download the template for this category and fill it in.');
  const statusCol = head.status, warnings = []; let created = 0, skipped = 0;
  const rows = [];
  ws.eachRow((row, n) => { if (n > 1 && row.hasValues) rows.push([row, n]); });
  db.transaction(() => {
    for (const [row, n] of rows) {
      const raw = {};
      for (const { f, col } of fieldCols) {
        let v = cellText(row.getCell(col).value);
        if (v && f.type === 'date') { const d = looseDate(v); if (!d) { warnings.push(`Row ${n}: ${f.label} "${v}" is not a valid date, left blank`); v = ''; } else v = d; }
        if (v && f.type === 'select' && !f.options.some((o) => o.toLowerCase() === v.toLowerCase())) { warnings.push(`Row ${n}: ${f.label} "${v}" is not an allowed option, left blank`); v = ''; }
        if (v && (f.type === 'number' || f.type === 'money') && !isFinite(Number(v.replace(/,/g, '')))) { warnings.push(`Row ${n}: ${f.label} "${v}" is not a number, left blank`); v = ''; }
        raw[f.key] = v;
      }
      if (!Object.values(raw).some(Boolean)) { skipped++; continue; }
      let data; try { data = validateData(cat, raw); } catch (e) { warnings.push(`Row ${n}: ${e.message}, row skipped`); skipped++; continue; }
      let status = 'Active';
      if (statusCol) { const s = cellText(row.getCell(statusCol).value); const m = STATUSES.find((x) => x.toLowerCase() === s.toLowerCase()); if (m) status = m; }
      let seq, code;
      const rawId = head.id ? cellText(row.getCell(head.id).value).toUpperCase().replace(/\s+/g, '') : '';
      if (rawId) { // keep the ID written in the sheet, e.g. PC/001
        const m = rawId.match(/^([A-Z0-9]+)[\/-](\d+)$/);
        if (!m || m[1] !== cat.prefix) { warnings.push(`Row ${n}: ID "${rawId}" does not belong to ${cat.prefix}, row skipped`); skipped++; continue; }
        seq = Number(m[2]); code = `${cat.prefix}/${m[2]}`;
        if (db.prepare('SELECT 1 FROM items WHERE category_id=? AND seq=?').get(cat.id, seq)) { warnings.push(`Row ${n}: ${code} already exists, row skipped`); skipped++; continue; }
        db.prepare('UPDATE categories SET next_seq=MAX(next_seq,?) WHERE id=?').run(seq + 1, cat.id);
      } else {
        seq = db.prepare('SELECT next_seq FROM categories WHERE id=?').get(cat.id).next_seq;
        db.prepare('UPDATE categories SET next_seq=next_seq+1 WHERE id=?').run(cat.id);
        code = `${cat.prefix}/${String(seq).padStart(2, '0')}`;
      }
      const r = db.prepare('INSERT INTO items(category_id,seq,code,status,data,created_by) VALUES(?,?,?,?,?,?)').run(cat.id, seq, code, status, JSON.stringify(data), req.user.name);
      addHistory(r.lastInsertRowid, 'Created', `Registered as ${code} (imported from Excel)`, 1, req.user.name);
      created++;
    }
  })();
  res.json({ created, skipped, warnings: warnings.slice(0, 50) });
}));

/* ---------- static + errors ---------- */
app.get('/vendor/jsQR.js', (req, res) => res.sendFile(path.join(__dirname, 'node_modules/jsqr/dist/jsQR.js')));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? 'Something went wrong on the server' : err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Perfact MIS running on http://localhost:${PORT}`);
  console.log(`Excel copy: ${path.join(syncDir(), SYNC_NAME)}`);
  syncCycle();                       // picks up edits made in Excel while the server was off, then refreshes the file
  setInterval(() => syncCycle(), 5000); // watches for changes saved in Excel
});
