'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { hashPassword, verifyPassword, signToken, publicAdmin, requireAuth, requireSuperAdmin } = require('./auth');

var AVATAR_DIR = process.env.AVATAR_DIR || path.join(__dirname, 'uploads', 'avatars');
try { fs.mkdirSync(AVATAR_DIR, { recursive: true }); } catch (_) {}

var ALLOWED_MIME = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/gif': '.gif' };

var upload = multer({
  storage: multer.diskStorage({
    destination: function (_req, _file, cb) { cb(null, AVATAR_DIR); },
    filename: function (req, file, cb) {
      var ext = ALLOWED_MIME[file.mimetype] || '.png';
      cb(null, 'admin-' + req.auth.sub + '-' + crypto.randomBytes(6).toString('hex') + ext);
    }
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: function (_req, file, cb) {
    cb(null, !!ALLOWED_MIME[file.mimetype]);
  }
});

module.exports = function buildAdminApi(ctx) {
  var store = ctx.store;
  var PLANS = ctx.PLANS;
  var planLabel = ctx.planLabel;
  var billingOf = ctx.billingOf;
  var rowExpired = ctx.rowExpired;
  var statusLabel = ctx.statusLabel;
  var createLicense = ctx.createLicense;
  var changeSubscriberPlan = ctx.changeSubscriberPlan;
  var setSubscriberBilling = ctx.setSubscriberBilling;
  var adjustSubscriberDays = ctx.adjustSubscriberDays;
  var revokeSubscriber = ctx.revokeSubscriber;
  var resetSubscriberDevice = ctx.resetSubscriberDevice;

  var router = express.Router();

  function log(req, action, targetType, targetId, message) {
    var actor = req.auth ? { id: req.auth.sub, name: req.auth.name } : { id: null, name: 'System' };
    return store.logActivity({
      actor_id: actor.id,
      actor_name: actor.name,
      action: action,
      target_type: targetType || null,
      target_id: targetId != null ? String(targetId) : null,
      message: message || null
    }).catch(function () {});
  }

  function ownsRow(admin, row) {
    if (admin.role === 'super_admin') return true;
    if (row.created_by_admin_id != null && Number(row.created_by_admin_id) === Number(admin.id)) return true;
    if (admin.telegram_id && String(row.created_by) === String(admin.telegram_id)) return true;
    return false;
  }

  function publicKeyRow(row, adminsById, adminsByTg) {
    var creator = null;
    if (row.created_by_admin_id != null && adminsById[row.created_by_admin_id]) {
      creator = adminsById[row.created_by_admin_id].name;
    } else if (row.created_by && adminsByTg[String(row.created_by)]) {
      creator = adminsByTg[String(row.created_by)].name;
    } else if (row.created_by) {
      creator = 'Telegram #' + row.created_by;
    }
    return {
      id: row.id,
      key: row.key_plain || ('…' + (row.key_suffix || '')),
      maskedOnly: !row.key_plain,
      plan: row.plan,
      planLabel: planLabel(row.plan),
      billing: billingOf(row),
      status: row.status,
      statusLabel: statusLabel(row),
      expired: rowExpired(row, Date.now()),
      displayName: row.display_name || null,
      activatedBy: row.display_name || null,
      createdBy: creator,
      createdByAdminId: row.created_by_admin_id || null,
      createdAt: row.created_at || null,
      activatedAt: row.activated_at || null,
      expiresAt: row.expires_at || null,
      lastSeenAt: row.last_seen_at || null
    };
  }

  async function adminMaps() {
    var admins = await store.listAdmins();
    var byId = {};
    var byTg = {};
    admins.forEach(function (a) {
      byId[a.id] = a;
      if (a.telegram_id) byTg[String(a.telegram_id)] = a;
    });
    return { admins: admins, byId: byId, byTg: byTg };
  }

  // ---------- Auth ----------
  router.post('/auth/login', async function (req, res) {
    try {
      var body = req.body || {};
      var admin = await store.findAdminByUsername(body.username);
      if (!admin || admin.active === 0 || admin.active === false) {
        return res.status(401).json({ ok: false, error: 'invalid_credentials' });
      }
      var valid = await verifyPassword(body.password, admin.password_hash);
      if (!valid) return res.status(401).json({ ok: false, error: 'invalid_credentials' });
      var token = signToken(admin);
      log({ auth: { sub: admin.id, name: admin.name } }, 'admin_login', 'admin', admin.id, admin.name + ' logged in');
      res.json({ ok: true, token: token, admin: publicAdmin(admin) });
    } catch (_err) {
      res.status(500).json({ ok: false, error: 'server' });
    }
  });

  router.get('/auth/me', requireAuth, async function (req, res) {
    var admin = await store.findAdminById(req.auth.sub);
    if (!admin) return res.status(401).json({ ok: false, error: 'unauthorized' });
    res.json({ ok: true, admin: publicAdmin(admin) });
  });

  router.post('/me/avatar', requireAuth, function (req, res) {
    upload.single('avatar')(req, res, async function (err) {
      if (err || !req.file) return res.status(400).json({ ok: false, error: 'upload_failed' });
      try {
        var admin = await store.findAdminById(req.auth.sub);
        if (!admin) return res.status(401).json({ ok: false, error: 'unauthorized' });
        var oldPath = admin.avatar_url ? path.join(AVATAR_DIR, path.basename(admin.avatar_url)) : null;
        var publicPath = '/uploads/avatars/' + req.file.filename;
        var updated = await store.updateAdmin(admin.id, { avatar_url: publicPath });
        if (oldPath) { try { fs.unlinkSync(oldPath); } catch (_) {} }
        await log(req, 'admin_updated', 'admin', admin.id, admin.name + ' updated their profile photo');
        res.json({ ok: true, admin: publicAdmin(updated) });
      } catch (_err2) {
        res.status(500).json({ ok: false, error: 'server' });
      }
    });
  });

  // ---------- Stats ----------
  router.get('/stats', requireAuth, async function (req, res) {
    try {
      var me = await store.findAdminById(req.auth.sub);
      if (!me) return res.status(401).json({ ok: false, error: 'unauthorized' });
      var rows = await store.listAll();
      if (me.role !== 'super_admin') rows = rows.filter(function (r) { return ownsRow(me, r); });
      var now = Date.now();
      var users = rows.filter(function (r) { return r.status !== 'unused'; });
      var free = users.filter(function (r) { return billingOf(r) === 'free'; });
      var paid = users.filter(function (r) { return billingOf(r) === 'paid'; });
      var active = users.filter(function (r) { return r.status === 'active' && !rowExpired(r, now); });
      var expired = users.filter(function (r) { return r.status === 'expired' || (r.status === 'active' && rowExpired(r, now)); });
      var revoked = users.filter(function (r) { return r.status === 'revoked'; });
      var unused = rows.filter(function (r) { return r.status === 'unused'; });

      // growth series: last 14 days, cumulative activations
      var days = 14;
      var buckets = [];
      for (var i = days - 1; i >= 0; i--) {
        var d = new Date(now - i * 86400000);
        buckets.push(d.toISOString().slice(0, 10));
      }
      var sortedByActivation = users.filter(function (r) { return r.activated_at; })
        .sort(function (a, b) { return new Date(a.activated_at) - new Date(b.activated_at); });
      var series = buckets.map(function (day) {
        var upToDay = sortedByActivation.filter(function (r) { return r.activated_at.slice(0, 10) <= day; });
        var p = upToDay.filter(function (r) { return billingOf(r) === 'paid'; }).length;
        var f = upToDay.filter(function (r) { return billingOf(r) === 'free'; }).length;
        return { date: day, paid: p, free: f, total: p + f };
      });

      var adm = await adminMaps();
      var recentKeys = rows.slice().sort(function (a, b) { return Number(b.id) - Number(a.id); })
        .slice(0, 8).map(function (r) { return publicKeyRow(r, adm.byId, adm.byTg); });

      var topAdmins = adm.admins
        .filter(function (a) { return me.role === 'super_admin' || a.id === me.id; })
        .map(function (a) {
          var createdRows = rows.filter(function (r) { return ownsRow(a, r); });
          var activatedRows = createdRows.filter(function (r) { return r.status !== 'unused'; });
          return {
            id: a.id,
            name: a.name,
            role: a.role,
            createdKeys: createdRows.length,
            activatedUsers: activatedRows.length
          };
        })
        .sort(function (a, b) { return b.createdKeys - a.createdKeys; })
        .slice(0, 8);

      var recentActivity = await store.listActivity(8, 0);
      if (me.role !== 'super_admin') {
        recentActivity = recentActivity.filter(function (a) { return Number(a.actor_id) === Number(me.id); });
      }

      res.json({
        ok: true,
        totals: {
          totalUsers: users.length,
          freeUsers: free.length,
          paidUsers: paid.length,
          activeSubscriptions: active.length,
          expiredSubscriptions: expired.length,
          revokedSubscriptions: revoked.length,
          totalKeys: rows.length,
          unusedKeys: unused.length
        },
        distribution: {
          paid: paid.length,
          free: free.length
        },
        subscriptionStatus: {
          active: active.length,
          expired: expired.length,
          unused: unused.length
        },
        growth: series,
        recentKeys: recentKeys,
        topAdmins: topAdmins,
        recentActivity: recentActivity
      });
    } catch (_err) {
      res.status(500).json({ ok: false, error: 'server' });
    }
  });

  // ---------- Keys ----------
  router.get('/keys', requireAuth, async function (req, res) {
    var me = await store.findAdminById(req.auth.sub);
    if (!me) return res.status(401).json({ ok: false, error: 'unauthorized' });
    var rows = await store.listAll();
    if (me.role !== 'super_admin') rows = rows.filter(function (r) { return ownsRow(me, r); });
    var q = String(req.query.q || '').trim().toLowerCase();
    var status = String(req.query.status || '').trim();
    var billing = String(req.query.billing || '').trim();
    var plan = String(req.query.plan || '').trim();
    if (status) rows = rows.filter(function (r) { return status === 'expired' ? (r.status === 'expired' || (r.status === 'active' && rowExpired(r, Date.now()))) : r.status === status; });
    if (billing) rows = rows.filter(function (r) { return billingOf(r) === billing; });
    if (plan) rows = rows.filter(function (r) { return r.plan === plan; });
    if (q) {
      rows = rows.filter(function (r) {
        return (r.key_plain || '').toLowerCase().indexOf(q) >= 0 ||
          (r.key_suffix || '').toLowerCase().indexOf(q) >= 0 ||
          (r.display_name || '').toLowerCase().indexOf(q) >= 0;
      });
    }
    rows.sort(function (a, b) { return Number(b.id) - Number(a.id); });
    var page = Math.max(0, Number(req.query.page) || 0);
    var pageSize = Math.min(100, Number(req.query.pageSize) || 25);
    var total = rows.length;
    var slice = rows.slice(page * pageSize, page * pageSize + pageSize);
    var adm = await adminMaps();
    res.json({
      ok: true,
      total: total,
      page: page,
      pageSize: pageSize,
      items: slice.map(function (r) { return publicKeyRow(r, adm.byId, adm.byTg); })
    });
  });

  router.post('/keys', requireAuth, async function (req, res) {
    try {
      var me = await store.findAdminById(req.auth.sub);
      if (!me) return res.status(401).json({ ok: false, error: 'unauthorized' });
      var body = req.body || {};
      if (!PLANS[body.plan]) return res.status(400).json({ ok: false, error: 'invalid_plan' });
      var billing = body.billing === 'free' ? 'free' : 'paid';
      var key = await createLicense(body.plan, me.telegram_id ? Number(me.telegram_id) : 0, billing, me.id);
      await log(req, 'key_created', 'key', key, me.name + ' created a ' + planLabel(body.plan) + ' (' + billing + ') key');
      res.json({ ok: true, key: key });
    } catch (_err) {
      res.status(500).json({ ok: false, error: 'server' });
    }
  });

  router.patch('/keys/:id', requireAuth, async function (req, res) {
    try {
      var me = await store.findAdminById(req.auth.sub);
      if (!me) return res.status(401).json({ ok: false, error: 'unauthorized' });
      var row = await store.findById(req.params.id);
      if (!row) return res.status(404).json({ ok: false, error: 'not_found' });
      if (!ownsRow(me, row)) return res.status(403).json({ ok: false, error: 'forbidden' });
      var body = req.body || {};
      var updated = null;
      if (body.action === 'revoke') {
        updated = await revokeSubscriber(row.id);
        await log(req, 'key_revoked', 'key', row.id, me.name + ' revoked key ' + (row.key_plain || row.key_suffix));
      } else if (body.action === 'plan') {
        updated = await changeSubscriberPlan(row.id, body.plan);
        await log(req, 'key_plan_changed', 'key', row.id, me.name + ' changed plan to ' + planLabel(body.plan));
      } else if (body.action === 'billing') {
        updated = await setSubscriberBilling(row.id, body.billing);
        await log(req, 'key_billing_changed', 'key', row.id, me.name + ' changed billing to ' + body.billing);
      } else if (body.action === 'extend') {
        var result = await adjustSubscriberDays(row.id, body.days);
        updated = result && result.row;
        await log(req, 'key_extended', 'key', row.id, me.name + ' adjusted ' + body.days + ' day(s)');
      } else if (body.action === 'logout_device') {
        updated = await resetSubscriberDevice(row.id);
        await log(req, 'key_device_reset', 'key', row.id, me.name + ' logged the device out of key ' + (row.key_plain || row.key_suffix) + ' — it can be activated again');
      } else {
        return res.status(400).json({ ok: false, error: 'invalid_action' });
      }
      if (!updated) return res.status(400).json({ ok: false, error: 'update_failed' });
      var adm = await adminMaps();
      res.json({ ok: true, item: publicKeyRow(updated, adm.byId, adm.byTg) });
    } catch (_err) {
      res.status(500).json({ ok: false, error: 'server' });
    }
  });

  router.delete('/keys/:id', requireAuth, async function (req, res) {
    var me = await store.findAdminById(req.auth.sub);
    if (!me) return res.status(401).json({ ok: false, error: 'unauthorized' });
    var row = await store.findById(req.params.id);
    if (!row) return res.status(404).json({ ok: false, error: 'not_found' });
    if (!ownsRow(me, row)) return res.status(403).json({ ok: false, error: 'forbidden' });
    if (row.status !== 'unused') return res.status(400).json({ ok: false, error: 'already_activated' });
    var done = await store.remove(row.id);
    if (done) await log(req, 'key_deleted', 'key', row.id, me.name + ' deleted an unused key');
    res.json({ ok: done });
  });

  // ---------- Users ----------
  router.get('/users', requireAuth, async function (req, res) {
    var me = await store.findAdminById(req.auth.sub);
    if (!me) return res.status(401).json({ ok: false, error: 'unauthorized' });
    var rows = (await store.listAll()).filter(function (r) { return r.status !== 'unused'; });
    if (me.role !== 'super_admin') rows = rows.filter(function (r) { return ownsRow(me, r); });
    var q = String(req.query.q || '').trim().toLowerCase();
    var status = String(req.query.status || '').trim();
    var billing = String(req.query.billing || '').trim();
    if (status) rows = rows.filter(function (r) { return status === 'expired' ? (r.status === 'expired' || (r.status === 'active' && rowExpired(r, Date.now()))) : r.status === status; });
    if (billing) rows = rows.filter(function (r) { return billingOf(r) === billing; });
    if (q) rows = rows.filter(function (r) { return (r.display_name || '').toLowerCase().indexOf(q) >= 0; });
    rows.sort(function (a, b) { return Number(b.id) - Number(a.id); });
    var page = Math.max(0, Number(req.query.page) || 0);
    var pageSize = Math.min(100, Number(req.query.pageSize) || 25);
    var total = rows.length;
    var slice = rows.slice(page * pageSize, page * pageSize + pageSize);
    var adm = await adminMaps();
    res.json({
      ok: true,
      total: total,
      page: page,
      pageSize: pageSize,
      items: slice.map(function (r) { return publicKeyRow(r, adm.byId, adm.byTg); })
    });
  });

  // ---------- Admins (Super Admin only) ----------
  router.get('/admins', requireAuth, requireSuperAdmin, async function (req, res) {
    var adm = await adminMaps();
    var rows = await store.listAll();
    var list = adm.admins.map(function (a) {
      var createdRows = rows.filter(function (r) { return ownsRow(a, r); });
      var activatedRows = createdRows.filter(function (r) { return r.status !== 'unused'; });
      return Object.assign(publicAdmin(a), {
        createdKeys: createdRows.length,
        activatedUsers: activatedRows.length,
        users: activatedRows.map(function (r) { return r.display_name; }).filter(Boolean)
      });
    });
    res.json({ ok: true, items: list });
  });

  router.post('/admins', requireAuth, requireSuperAdmin, async function (req, res) {
    try {
      var body = req.body || {};
      if (!body.username || !body.password || !body.name) {
        return res.status(400).json({ ok: false, error: 'missing_fields' });
      }
      var existing = await store.findAdminByUsername(body.username);
      if (existing) return res.status(409).json({ ok: false, error: 'username_taken' });
      var hash = await hashPassword(body.password);
      var admin = await store.createAdmin({
        username: body.username,
        password_hash: hash,
        name: body.name,
        role: body.role === 'super_admin' ? 'super_admin' : 'admin',
        telegram_id: body.telegramId || null,
        active: 1,
        created_by: req.auth.sub
      });
      await log(req, 'admin_created', 'admin', admin.id, req.auth.name + ' added admin ' + admin.name);
      res.json({ ok: true, admin: publicAdmin(admin) });
    } catch (_err) {
      res.status(500).json({ ok: false, error: 'server' });
    }
  });

  router.patch('/admins/:id', requireAuth, requireSuperAdmin, async function (req, res) {
    try {
      var body = req.body || {};
      var patch = {};
      if (body.name) patch.name = body.name;
      if (body.role) patch.role = body.role === 'super_admin' ? 'super_admin' : 'admin';
      if (body.telegramId !== undefined) patch.telegram_id = body.telegramId || null;
      if (body.active !== undefined) patch.active = body.active ? 1 : 0;
      if (body.password) patch.password_hash = await hashPassword(body.password);
      var admin = await store.updateAdmin(req.params.id, patch);
      if (!admin) return res.status(404).json({ ok: false, error: 'not_found' });
      await log(req, 'admin_updated', 'admin', admin.id, req.auth.name + ' updated admin ' + admin.name);
      res.json({ ok: true, admin: publicAdmin(admin) });
    } catch (_err) {
      res.status(500).json({ ok: false, error: 'server' });
    }
  });

  router.delete('/admins/:id', requireAuth, requireSuperAdmin, async function (req, res) {
    if (Number(req.params.id) === Number(req.auth.sub)) {
      return res.status(400).json({ ok: false, error: 'cannot_delete_self' });
    }
    var target = await store.findAdminById(req.params.id);
    if (!target) return res.status(404).json({ ok: false, error: 'not_found' });
    var done = await store.deleteAdmin(req.params.id);
    if (done) await log(req, 'admin_deleted', 'admin', req.params.id, req.auth.name + ' deleted admin ' + target.name);
    res.json({ ok: done });
  });

  // ---------- Activity ----------
  router.get('/activity', requireAuth, async function (req, res) {
    var me = await store.findAdminById(req.auth.sub);
    if (!me) return res.status(401).json({ ok: false, error: 'unauthorized' });
    var limit = Math.min(200, Number(req.query.limit) || 50);
    var offset = Number(req.query.offset) || 0;
    var items = await store.listActivity(limit, offset);
    if (me.role !== 'super_admin') items = items.filter(function (a) { return Number(a.actor_id) === Number(me.id); });
    res.json({ ok: true, items: items });
  });

  return router;
};
