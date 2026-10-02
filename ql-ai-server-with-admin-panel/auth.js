'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || crypto.randomBytes(48).toString('hex');
if (!process.env.ADMIN_JWT_SECRET) {
  process.stderr.write('ADMIN_JWT_SECRET not set — using a random secret for this process only (sessions will not survive restarts). Set ADMIN_JWT_SECRET in your environment for production.\n');
}

const TOKEN_TTL = '12h';

function hashPassword(plain) {
  return bcrypt.hash(String(plain), 10);
}

function verifyPassword(plain, hash) {
  return bcrypt.compare(String(plain || ''), String(hash || ''));
}

function signToken(admin) {
  return jwt.sign(
    { sub: admin.id, username: admin.username, role: admin.role, name: admin.name },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (_err) {
    return null;
  }
}

function publicAdmin(admin) {
  if (!admin) return null;
  return {
    id: admin.id,
    username: admin.username,
    name: admin.name,
    role: admin.role,
    telegramId: admin.telegram_id || null,
    avatarUrl: admin.avatar_url || null,
    active: admin.active !== 0 && admin.active !== false,
    createdAt: admin.created_at || null
  };
}

function requireAuth(req, res, next) {
  var header = String(req.headers.authorization || '');
  var token = header.indexOf('Bearer ') === 0 ? header.slice(7) : null;
  if (!token) return res.status(401).json({ ok: false, error: 'unauthorized' });
  var payload = verifyToken(token);
  if (!payload) return res.status(401).json({ ok: false, error: 'unauthorized' });
  req.auth = payload;
  next();
}

function requireSuperAdmin(req, res, next) {
  if (!req.auth || req.auth.role !== 'super_admin') {
    return res.status(403).json({ ok: false, error: 'forbidden' });
  }
  next();
}

module.exports = {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  publicAdmin,
  requireAuth,
  requireSuperAdmin
};
