'use strict';

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const FILE_PATH = process.env.LICENSE_FILE || path.join(__dirname, 'licenses.json');
const ADMIN_FILE_PATH = process.env.ADMIN_FILE || path.join(path.dirname(FILE_PATH), 'admins.json');
const ACTIVITY_FILE_PATH = process.env.ACTIVITY_FILE || path.join(path.dirname(FILE_PATH), 'activity.json');

function ensureFileDir() {
  try {
    fs.mkdirSync(path.dirname(FILE_PATH), { recursive: true });
  } catch (_) {}
}

function nowSql() {
  return new Date().toISOString();
}

function FileStore() {
  this.rows = [];
  this.nextId = 1;
  this.admins = [];
  this.nextAdminId = 1;
  this.activity = [];
  this.nextActivityId = 1;
  this._load();
  this._loadAdmins();
  this._loadActivity();
}

FileStore.prototype._load = function () {
  ensureFileDir();
  try {
    var raw = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));
    this.rows = Array.isArray(raw.rows) ? raw.rows : [];
    this.rows.forEach(function (row) {
      if (row.billing !== 'free') row.billing = 'paid';
      if (row.created_by_admin_id === undefined) row.created_by_admin_id = null;
    });
    this.nextId = Number(raw.nextId) || (this.rows.length + 1);
  } catch (_) {
    this.rows = [];
    this.nextId = 1;
  }
};

FileStore.prototype._save = function () {
  ensureFileDir();
  fs.writeFileSync(FILE_PATH, JSON.stringify({ nextId: this.nextId, rows: this.rows }, null, 2));
};

FileStore.prototype._loadAdmins = function () {
  ensureFileDir();
  try {
    var raw = JSON.parse(fs.readFileSync(ADMIN_FILE_PATH, 'utf8'));
    this.admins = Array.isArray(raw.admins) ? raw.admins : [];
    this.nextAdminId = Number(raw.nextAdminId) || (this.admins.length + 1);
  } catch (_) {
    this.admins = [];
    this.nextAdminId = 1;
  }
};

FileStore.prototype._saveAdmins = function () {
  ensureFileDir();
  fs.writeFileSync(ADMIN_FILE_PATH, JSON.stringify({ nextAdminId: this.nextAdminId, admins: this.admins }, null, 2));
};

FileStore.prototype._loadActivity = function () {
  ensureFileDir();
  try {
    var raw = JSON.parse(fs.readFileSync(ACTIVITY_FILE_PATH, 'utf8'));
    this.activity = Array.isArray(raw.activity) ? raw.activity : [];
    this.nextActivityId = Number(raw.nextActivityId) || (this.activity.length + 1);
  } catch (_) {
    this.activity = [];
    this.nextActivityId = 1;
  }
};

FileStore.prototype._saveActivity = function () {
  ensureFileDir();
  fs.writeFileSync(ACTIVITY_FILE_PATH, JSON.stringify({ nextActivityId: this.nextActivityId, activity: this.activity }, null, 2));
};

FileStore.prototype.createAdmin = async function (admin) {
  var saved = Object.assign({
    id: this.nextAdminId++,
    telegram_id: null,
    avatar_url: null,
    active: 1,
    created_by: null,
    created_at: nowSql()
  }, admin);
  this.admins.push(saved);
  this._saveAdmins();
  return saved;
};

FileStore.prototype.listAdmins = async function () {
  return this.admins.slice().sort(function (a, b) { return Number(a.id) - Number(b.id); });
};

FileStore.prototype.findAdminById = async function (id) {
  var want = Number(id);
  return this.admins.find(function (a) { return Number(a.id) === want; }) || null;
};

FileStore.prototype.findAdminByUsername = async function (username) {
  var want = String(username || '').toLowerCase();
  return this.admins.find(function (a) { return String(a.username || '').toLowerCase() === want; }) || null;
};

FileStore.prototype.findAdminByTelegramId = async function (telegramId) {
  var want = String(telegramId || '');
  return this.admins.find(function (a) { return String(a.telegram_id || '') === want; }) || null;
};

FileStore.prototype.updateAdmin = async function (id, patch) {
  var admin = this.admins.find(function (a) { return Number(a.id) === Number(id); });
  if (!admin) return null;
  Object.assign(admin, patch);
  this._saveAdmins();
  return admin;
};

FileStore.prototype.deleteAdmin = async function (id) {
  var idx = this.admins.findIndex(function (a) { return Number(a.id) === Number(id); });
  if (idx < 0) return false;
  this.admins.splice(idx, 1);
  this._saveAdmins();
  return true;
};

FileStore.prototype.logActivity = async function (entry) {
  var saved = Object.assign({
    id: this.nextActivityId++,
    created_at: nowSql()
  }, entry);
  this.activity.unshift(saved);
  if (this.activity.length > 2000) this.activity.length = 2000;
  this._saveActivity();
  return saved;
};

FileStore.prototype.listActivity = async function (limit, offset) {
  return this.activity.slice(Number(offset) || 0, (Number(offset) || 0) + (Number(limit) || 50));
};

FileStore.prototype.insertUnused = async function (row) {
  if (this.rows.some(function (item) { return item.key_hash === row.key_hash; })) {
    var err = new Error('dup');
    err.code = 'ER_DUP_ENTRY';
    throw err;
  }
  var saved = Object.assign({
    id: this.nextId++,
    status: 'unused',
    billing: 'paid',
    key_plain: null,
    display_name: null,
    device_id: null,
    session_token: null,
    activated_at: null,
    expires_at: null,
    created_at: nowSql(),
    last_seen_at: null
  }, row);
  if (saved.billing !== 'free') saved.billing = 'paid';
  this.rows.push(saved);
  this._save();
  return saved;
};

FileStore.prototype.findByHash = async function (hash) {
  return this.rows.find(function (row) { return row.key_hash === hash; }) || null;
};

FileStore.prototype.findBySession = async function (token, deviceId) {
  return this.rows.find(function (row) {
    return row.session_token === token && row.device_id === deviceId;
  }) || null;
};

FileStore.prototype.findById = async function (id) {
  var want = Number(id);
  return this.rows.find(function (row) { return Number(row.id) === want; }) || null;
};

FileStore.prototype.listAll = async function () {
  return this.rows.slice().sort(function (a, b) { return Number(b.id) - Number(a.id); });
};

FileStore.prototype.update = async function (id, patch) {
  var row = this.rows.find(function (item) { return Number(item.id) === Number(id); });
  if (!row) return null;
  Object.assign(row, patch);
  this._save();
  return row;
};

FileStore.prototype.remove = async function (id) {
  var idx = this.rows.findIndex(function (item) { return Number(item.id) === Number(id); });
  if (idx < 0) return false;
  this.rows.splice(idx, 1);
  this._save();
  return true;
};

function MysqlStore(pool) {
  this.pool = pool;
}

MysqlStore.prototype.insertUnused = async function (row) {
  var billing = row.billing === 'free' ? 'free' : 'paid';
  await this.pool.query(
    'INSERT INTO licenses (key_hash, key_suffix, key_plain, plan, status, billing, created_by, created_by_admin_id, created_at) VALUES (?, ?, ?, ?, \'unused\', ?, ?, ?, ?)',
    [row.key_hash, row.key_suffix, row.key_plain || null, row.plan, billing, row.created_by, row.created_by_admin_id || null, new Date()]
  );
};

MysqlStore.prototype.findByHash = async function (hash) {
  var result = await this.pool.query('SELECT * FROM licenses WHERE key_hash = ? LIMIT 1', [hash]);
  return result[0][0] || null;
};

MysqlStore.prototype.findBySession = async function (token, deviceId) {
  var result = await this.pool.query(
    'SELECT * FROM licenses WHERE session_token = ? AND device_id = ? LIMIT 1',
    [token, deviceId]
  );
  return result[0][0] || null;
};

MysqlStore.prototype.findById = async function (id) {
  var result = await this.pool.query('SELECT * FROM licenses WHERE id = ? LIMIT 1', [id]);
  return result[0][0] || null;
};

MysqlStore.prototype.listAll = async function () {
  var result = await this.pool.query('SELECT * FROM licenses ORDER BY id DESC');
  return result[0] || [];
};

MysqlStore.prototype.update = async function (id, patch) {
  var fields = [];
  var values = [];
  Object.keys(patch).forEach(function (key) {
    fields.push(key + ' = ?');
    values.push(patch[key]);
  });
  values.push(id);
  await this.pool.query('UPDATE licenses SET ' + fields.join(', ') + ' WHERE id = ?', values);
  var result = await this.pool.query('SELECT * FROM licenses WHERE id = ? LIMIT 1', [id]);
  return result[0][0] || null;
};

MysqlStore.prototype.remove = async function (id) {
  var result = await this.pool.query('DELETE FROM licenses WHERE id = ?', [id]);
  return result[0].affectedRows > 0;
};

MysqlStore.prototype.createAdmin = async function (admin) {
  var result = await this.pool.query(
    'INSERT INTO admins (username, password_hash, name, role, telegram_id, active, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [admin.username, admin.password_hash, admin.name, admin.role || 'admin', admin.telegram_id || null, admin.active == null ? 1 : admin.active, admin.created_by || null, new Date()]
  );
  return this.findAdminById(result[0].insertId);
};

MysqlStore.prototype.listAdmins = async function () {
  var result = await this.pool.query('SELECT * FROM admins ORDER BY id ASC');
  return result[0] || [];
};

MysqlStore.prototype.findAdminById = async function (id) {
  var result = await this.pool.query('SELECT * FROM admins WHERE id = ? LIMIT 1', [id]);
  return result[0][0] || null;
};

MysqlStore.prototype.findAdminByUsername = async function (username) {
  var result = await this.pool.query('SELECT * FROM admins WHERE LOWER(username) = LOWER(?) LIMIT 1', [username]);
  return result[0][0] || null;
};

MysqlStore.prototype.findAdminByTelegramId = async function (telegramId) {
  var result = await this.pool.query('SELECT * FROM admins WHERE telegram_id = ? LIMIT 1', [String(telegramId)]);
  return result[0][0] || null;
};

MysqlStore.prototype.updateAdmin = async function (id, patch) {
  var fields = [];
  var values = [];
  Object.keys(patch).forEach(function (key) {
    fields.push(key + ' = ?');
    values.push(patch[key]);
  });
  if (!fields.length) return this.findAdminById(id);
  values.push(id);
  await this.pool.query('UPDATE admins SET ' + fields.join(', ') + ' WHERE id = ?', values);
  return this.findAdminById(id);
};

MysqlStore.prototype.deleteAdmin = async function (id) {
  var result = await this.pool.query('DELETE FROM admins WHERE id = ?', [id]);
  return result[0].affectedRows > 0;
};

MysqlStore.prototype.logActivity = async function (entry) {
  await this.pool.query(
    'INSERT INTO activity_log (actor_id, actor_name, action, target_type, target_id, message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [entry.actor_id || null, entry.actor_name || null, entry.action, entry.target_type || null, entry.target_id || null, entry.message || null, new Date()]
  );
};

MysqlStore.prototype.listActivity = async function (limit, offset) {
  var result = await this.pool.query(
    'SELECT * FROM activity_log ORDER BY id DESC LIMIT ? OFFSET ?',
    [Number(limit) || 50, Number(offset) || 0]
  );
  return result[0] || [];
};

async function openStore() {
  if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_NAME) {
    return { kind: 'file', store: new FileStore(), mysql: 'not_configured' };
  }
  var pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 6,
    enableKeepAlive: true,
    timezone: 'Z',
    connectTimeout: 8000
  });
  try {
    await pool.query(
      'CREATE TABLE IF NOT EXISTS licenses (' +
        'id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,' +
        'key_hash CHAR(64) NOT NULL,' +
        'key_suffix VARCHAR(8) NOT NULL,' +
        'key_plain VARCHAR(32) DEFAULT NULL,' +
        'plan VARCHAR(16) NOT NULL,' +
        'status VARCHAR(16) NOT NULL,' +
        'billing VARCHAR(8) NOT NULL DEFAULT \'paid\',' +
        'display_name VARCHAR(80) DEFAULT NULL,' +
        'device_id VARCHAR(80) DEFAULT NULL,' +
        'session_token VARCHAR(64) DEFAULT NULL,' +
        'activated_at DATETIME DEFAULT NULL,' +
        'expires_at DATETIME DEFAULT NULL,' +
        'created_by BIGINT NOT NULL,' +
        'created_at DATETIME DEFAULT NULL,' +
        'last_seen_at DATETIME DEFAULT NULL,' +
        'UNIQUE KEY uq_key_hash (key_hash)' +
      ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
    );
    try {
      await pool.query(
        'ALTER TABLE licenses ADD COLUMN billing VARCHAR(8) NOT NULL DEFAULT \'paid\' AFTER status'
      );
    } catch (_) {}
    try {
      await pool.query(
        'ALTER TABLE licenses ADD COLUMN key_plain VARCHAR(32) DEFAULT NULL AFTER key_suffix'
      );
    } catch (_) {}
    try {
      await pool.query(
        'ALTER TABLE licenses ADD COLUMN created_by_admin_id INT DEFAULT NULL AFTER created_by'
      );
    } catch (_) {}
    await pool.query(
      'CREATE TABLE IF NOT EXISTS admins (' +
        'id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,' +
        'username VARCHAR(50) NOT NULL,' +
        'password_hash VARCHAR(100) NOT NULL,' +
        'name VARCHAR(80) NOT NULL,' +
        'role VARCHAR(16) NOT NULL DEFAULT \'admin\',' +
        'telegram_id VARCHAR(32) DEFAULT NULL,' +
        'avatar_url VARCHAR(255) DEFAULT NULL,' +
        'active TINYINT(1) NOT NULL DEFAULT 1,' +
        'created_by INT DEFAULT NULL,' +
        'created_at DATETIME DEFAULT NULL,' +
        'UNIQUE KEY uq_username (username)' +
      ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
    );
    try {
      await pool.query('ALTER TABLE admins ADD COLUMN avatar_url VARCHAR(255) DEFAULT NULL AFTER telegram_id');
    } catch (_) {}
    await pool.query(
      'CREATE TABLE IF NOT EXISTS activity_log (' +
        'id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,' +
        'actor_id INT DEFAULT NULL,' +
        'actor_name VARCHAR(80) DEFAULT NULL,' +
        'action VARCHAR(40) NOT NULL,' +
        'target_type VARCHAR(20) DEFAULT NULL,' +
        'target_id VARCHAR(40) DEFAULT NULL,' +
        'message VARCHAR(255) DEFAULT NULL,' +
        'created_at DATETIME DEFAULT NULL,' +
        'INDEX idx_created_at (created_at)' +
      ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
    );
    await pool.query('SELECT 1');
    return { kind: 'mysql', store: new MysqlStore(pool), mysql: 'ok' };
  } catch (err) {
    try { await pool.end(); } catch (_) {}
    var code = (err && (err.code || err.message)) ? String(err.code || err.message) : 'error';
    process.stderr.write('mysql unavailable: ' + code + '\n');
    return { kind: 'file', store: new FileStore(), mysql: code };
  }
}

module.exports = { openStore };
