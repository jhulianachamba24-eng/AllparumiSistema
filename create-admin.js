'use strict';
// Uso: node create-admin.js <usuario> "<contraseña>" ["Nombre"]
const bcrypt = require('bcryptjs');
const { db } = require('./db');
const [username, password, name] = process.argv.slice(2);
if (!username || !password || password.length < 8) {
  console.error('Uso: node create-admin.js <usuario> "<contraseña de 8+ caracteres>" ["Nombre"]');
  process.exit(1);
}
const hash = bcrypt.hashSync(password, 12);
const row = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
const profile = JSON.stringify({ name: name || 'Administrador', lastname: 'Sistema', email: '', force_change: false, first_login: false });
if (row) {
  db.prepare('UPDATE users SET pass_hash=?, status=?, profile=? WHERE id=?').run(hash, 'Activo', profile, row.id);
  console.log('Contraseña actualizada para', username);
} else {
  db.prepare('INSERT INTO users (id, username, pass_hash, company_id, role, status, system_admin, profile, created_at) VALUES (?,?,?,?,?,?,?,?,?)')
    .run('sys_' + Date.now(), username, hash, '', 'Administrador del Sistema', 'Activo', 1, profile, new Date().toISOString());
  console.log('Administrador del sistema creado:', username);
}
