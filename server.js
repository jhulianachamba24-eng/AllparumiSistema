'use strict';
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const sharp = require('sharp');
const { db, UPLOAD_DIR } = require('./db');

const PORT = Number(process.env.PORT || 3000);
const SESSION_DAYS = 30;
const ROLE_SYSTEM = 'Administrador del Sistema';
const ROLE_COMPANY = 'Administrador de Empresa';
const NUMBER_TYPES = ['COT', 'PED', 'FAC', 'RES', 'NC', 'NV', 'COM'];

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '60mb' }));

class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const sha = s => crypto.createHash('sha256').update(s).digest('hex');

/* ---------- Imágenes: base64 -> archivos comprimidos en disco ---------- */
const DATA_IMG = /^data:image\/(png|jpe?g|webp|gif);base64,/i;
async function saveImage(dataUrl) {
  const buf = Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
  const hash = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 20);
  for (const ext of ['jpg', 'png']) {
    if (fs.existsSync(path.join(UPLOAD_DIR, `${hash}.${ext}`))) return `/uploads/${hash}.${ext}`;
  }
  const meta = await sharp(buf, { failOn: 'none' }).metadata();
  let pipe = sharp(buf, { failOn: 'none' }).rotate().resize({ width: 1000, height: 1000, fit: 'inside', withoutEnlargement: true });
  let out, ext;
  if (meta.hasAlpha) { out = await pipe.png({ compressionLevel: 9 }).toBuffer(); ext = 'png'; }
  else { out = await pipe.jpeg({ quality: 80 }).toBuffer(); ext = 'jpg'; }
  fs.writeFileSync(path.join(UPLOAD_DIR, `${hash}.${ext}`), out);
  return `/uploads/${hash}.${ext}`;
}
// El logo de la empresa (clave "logo") se deja como está para no alterar los PDF/cotizaciones.
async function extractImages(node) {
  if (!node || typeof node !== 'object') return;
  for (const key of Object.keys(node)) {
    const v = node[key];
    if (typeof v === 'string') {
      if (key !== 'logo' && v.length > 3000 && DATA_IMG.test(v)) {
        try { node[key] = await saveImage(v); } catch (e) { console.warn('Imagen no procesada:', e.message); }
      }
    } else if (v && typeof v === 'object') {
      await extractImages(v);
    }
  }
}

/* ---------- Usuarios y sesiones ---------- */
function publicUser(r) {
  let profile = {};
  try { profile = JSON.parse(r.profile || '{}'); } catch (e) {}
  return { ...profile, id: r.id, company_id: r.company_id, username: r.username, role: r.role, status: r.status, system_admin: !!r.system_admin, created_at: r.created_at };
}
function visibleUsers(me) {
  const rows = db.prepare('SELECT * FROM users ORDER BY created_at').all();
  return rows.filter(r => me.system_admin || r.company_id === me.company_id).map(publicUser);
}
function getSession(req) {
  const token = req.get('x-integra-session');
  if (!token) return null;
  const s = db.prepare('SELECT s.token_hash, s.expires_at, u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?').get(sha(token));
  if (!s || s.expires_at < Date.now() || s.status !== 'Activo') return null;
  db.prepare('UPDATE sessions SET expires_at=? WHERE token_hash=?').run(Date.now() + SESSION_DAYS * 864e5, s.token_hash);
  return s;
}
function requireSession(req) {
  const s = getSession(req);
  if (!s) throw new HttpError(401, 'Sesión no válida. Inicie sesión de nuevo.');
  return s;
}
function currentState() {
  const r = db.prepare('SELECT json, revision FROM app_state WHERE id=1').get();
  return { state: JSON.parse(r.json), revision: r.revision };
}
function bundle(me) {
  const { state, revision } = currentState();
  return { state, revision, users: visibleUsers(me), user: publicUser(me) };
}

/* ---------- Límite de intentos de login ---------- */
const attempts = new Map();
function checkRate(key) {
  const now = Date.now();
  const a = (attempts.get(key) || []).filter(t => now - t < 10 * 60 * 1000);
  attempts.set(key, a);
  if (a.length >= 8) throw new HttpError(429, 'Demasiados intentos. Espere 10 minutos.');
}
const failAttempt = key => attempts.set(key, [...(attempts.get(key) || []), Date.now()]);

/* ---------- Acciones ---------- */
const actions = {
  async bootstrap() {
    const { state } = currentState();
    const pick = (arr, f) => (Array.isArray(arr) ? arr.map(x => Object.fromEntries(f.map(k => [k, x[k]]))) : []);
    return { companies: pick(state.companies, ['id', 'name']), branches: pick(state.branches, ['id', 'company_id', 'name']) };
  },

  async login(req, p) {
    const username = String(p.username || '').trim();
    const password = String(p.password || '');
    const key = `${req.ip}|${username.toLowerCase()}`;
    checkRate(key);
    const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    const ok = bcrypt.compareSync(password, row ? row.pass_hash : '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvali');
    if (!row || !ok) { failAttempt(key); throw new HttpError(401, 'Credenciales inválidas'); }
    if (row.status !== 'Activo') throw new HttpError(403, 'Usuario inactivo');
    if (!row.system_admin) {
      if (!p.company_id) throw new HttpError(400, 'Seleccione una empresa');
      if (row.company_id !== p.company_id) throw new HttpError(403, 'El usuario no pertenece a esta empresa');
    }
    attempts.delete(key);
    const token = crypto.randomBytes(32).toString('hex');
    db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?,?,?)').run(sha(token), row.id, Date.now() + SESSION_DAYS * 864e5);
    db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
    return { session_token: token, ...bundle(row) };
  },

  async resume(req) { return bundle(requireSession(req)); },

  async logout(req) {
    const t = req.get('x-integra-session');
    if (t) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(sha(t));
    return { ok: true };
  },

  async state_if_newer(req, p) {
    const me = requireSession(req);
    const { revision } = currentState();
    if (revision <= Number(p.revision || 0)) return { changed: false, revision };
    return { changed: true, ...bundle(me) };
  },

  async save_state(req, p) {
    const me = requireSession(req);
    if (!p.state || typeof p.state !== 'object') throw new HttpError(400, 'Estado inválido');
    const state = p.state;
    delete state.users;
    await extractImages(state);
    const json = JSON.stringify(state);
    const tx = db.transaction(() => {
      const cur = db.prepare('SELECT revision FROM app_state WHERE id=1').get();
      if (Number(p.base_revision) !== cur.revision) throw new HttpError(409, 'Otro usuario actualizó los datos');
      const next = cur.revision + 1;
      db.prepare('UPDATE app_state SET json=?, revision=? WHERE id=1').run(json, next);
      return next;
    });
    return { ok: true, revision: tx(), saved_by: me.id };
  },

  async reserve_numbers(req, p) {
    const me = requireSession(req);
    const type = String(p.type || '');
    if (!NUMBER_TYPES.includes(type)) throw new HttpError(400, 'Tipo de numeración inválido');
    const count = Math.min(Math.max(parseInt(p.count, 10) || 1, 1), 200);
    const key = `${me.company_id || 'global'}:${type}`;
    const tx = db.transaction(() => {
      let row = db.prepare('SELECT value FROM counters WHERE key=?').get(key);
      let value;
      if (row) value = row.value;
      else { // primera vez: continuar después del número más alto que ya exista en los datos
        const json = db.prepare('SELECT json FROM app_state WHERE id=1').get().json;
        value = 0;
        for (const m of json.matchAll(new RegExp(type + '-(\\d{3,9})', 'g'))) value = Math.max(value, Number(m[1]));
      }
      db.prepare('INSERT INTO counters (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key, value + count);
      return { start: value + 1, end: value + count };
    });
    return tx();
  },

  async upsert_user(req, p) {
    const me = requireSession(req);
    if (!me.system_admin && me.role !== ROLE_COMPANY) throw new HttpError(403, 'No tiene permisos para administrar usuarios');
    const u = p.user || {};
    const username = String(u.username || '').trim();
    if (!u.id || !username) throw new HttpError(400, 'Usuario obligatorio');
    if (u.role === ROLE_SYSTEM && !me.system_admin) throw new HttpError(403, 'Solo el Administrador del Sistema puede asignar ese rol');
    const company_id = me.system_admin ? (u.company_id || '') : me.company_id;
    const existing = db.prepare('SELECT * FROM users WHERE id=?').get(u.id);
    if (existing && !me.system_admin && existing.company_id !== me.company_id) throw new HttpError(403, 'Usuario de otra empresa');
    const dup = db.prepare('SELECT id FROM users WHERE username=? AND id<>?').get(username, u.id);
    if (dup) throw new HttpError(409, 'Ese nombre de usuario ya existe');
    const password = String(p.password || '');
    if (!existing && password.length < 6) throw new HttpError(400, 'La contraseña debe tener mínimo 6 caracteres');
    if (password && password.length < 6) throw new HttpError(400, 'La contraseña debe tener mínimo 6 caracteres');
    const profile = u.profile || {};
    await extractImages(profile);
    const isSys = u.role === ROLE_SYSTEM ? 1 : 0;
    if (existing) {
      db.prepare('UPDATE users SET username=?, company_id=?, role=?, status=?, system_admin=?, profile=? WHERE id=?')
        .run(username, company_id, u.role, u.status || 'Activo', isSys, JSON.stringify(profile), u.id);
      if (password) db.prepare('UPDATE users SET pass_hash=? WHERE id=?').run(bcrypt.hashSync(password, 12), u.id);
    } else {
      db.prepare('INSERT INTO users (id, username, pass_hash, company_id, role, status, system_admin, profile, created_at) VALUES (?,?,?,?,?,?,?,?,?)')
        .run(u.id, username, bcrypt.hashSync(password, 12), company_id, u.role, u.status || 'Activo', isSys, JSON.stringify(profile), new Date().toISOString());
    }
    return { ok: true, users: visibleUsers(me) };
  },

  async delete_user(req, p) {
    const me = requireSession(req);
    if (!me.system_admin && me.role !== ROLE_COMPANY) throw new HttpError(403, 'No tiene permisos para administrar usuarios');
    const target = db.prepare('SELECT * FROM users WHERE id=?').get(p.id);
    if (!target) throw new HttpError(404, 'Usuario no encontrado');
    if (target.id === me.id) throw new HttpError(400, 'No puede eliminar su propio usuario');
    if (!me.system_admin && (target.company_id !== me.company_id || target.system_admin)) throw new HttpError(403, 'No tiene permisos sobre ese usuario');
    db.prepare('DELETE FROM sessions WHERE user_id=?').run(target.id);
    db.prepare('DELETE FROM users WHERE id=?').run(target.id);
    return { ok: true, users: visibleUsers(me) };
  },

  async change_password(req, p) {
    const me = requireSession(req);
    const pass = String(p.password || '');
    if (pass.length < 6) throw new HttpError(400, 'La contraseña debe tener mínimo 6 caracteres');
    let profile = {};
    try { profile = JSON.parse(me.profile || '{}'); } catch (e) {}
    profile.force_change = false; profile.first_login = false;
    db.prepare('UPDATE users SET pass_hash=?, profile=? WHERE id=?').run(bcrypt.hashSync(pass, 12), JSON.stringify(profile), me.id);
    return { ok: true };
  }
};

app.post('/api/integra', async (req, res) => {
  try {
    const fn = actions[req.body && req.body.action];
    if (!fn) throw new HttpError(400, 'Acción desconocida');
    res.json(await fn(req, req.body));
  } catch (e) {
    if (!(e instanceof HttpError)) console.error(e);
    res.status(e.status || 500).json({ error: e instanceof HttpError ? e.message : 'Error interno del servidor' });
  }
});

app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '30d', immutable: true }));
app.use(express.static(path.join(__dirname, 'public'), { index: 'index.html', maxAge: 0 }));

app.listen(PORT, '127.0.0.1', () => console.log(`Integra Suite escuchando en http://127.0.0.1:${PORT}`));
