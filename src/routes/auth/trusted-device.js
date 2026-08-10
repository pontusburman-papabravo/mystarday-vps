'use strict';

const express = require('express');
const trusted = require('../../lib/trusted-device');

const router = express.Router();

router.get('/trusted-device/context', async (req, res, next) => {
  try {
    const raw = req.cookies?.[trusted.COOKIE_NAME];
    if (!raw) {
      return res.status(401).json({ code: 'TRUSTED_DEVICE_MISSING' });
    }
    const result = await trusted.getTrustedDeviceContext(raw);
    if (!result.ok) {
      const status = result.code === 'TRUSTED_DEVICE_DISABLED' ? 403 : 401;
      return res.status(status).json({ code: result.code });
    }
    return res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/trusted-device/restore', async (req, res, next) => {
  try {
    const raw = req.cookies?.[trusted.COOKIE_NAME];
    if (!raw) {
      return res.status(401).json({ code: 'TRUSTED_DEVICE_MISSING' });
    }
    const preview = await trusted.verifyTrustedDeviceRaw(raw);
    if (preview && preview.device_mode === 'parent') {
      const result = await trusted.restoreParentSessionFromDevice(res, raw);
      if (!result.ok) {
        const status = result.code === 'TRUSTED_DEVICE_DISABLED' ? 403
          : result.code === 'PARENT_ACCESS_DENIED' ? 403
            : 401;
        return res.status(status).json({ code: result.code });
      }
      return res.json({
        ok: true,
        user: result.parent,
        redirect: '/dashboard',
        session_mode: 'resume',
        device_mode: result.device_mode,
      });
    }
    const result = await trusted.restoreChildSessionFromDevice(req, res, raw, {
      forcePicker: req.body?.force_picker === true,
    });
    if (!result.ok) {
      if (result.code === 'SHARED_PICKER_REQUIRED') {
        return res.status(200).json({
          ok: false,
          code: result.code,
          device_mode: result.device_mode,
          allowed_children: result.allowed_children,
          allowed_count_bucket: result.allowed_count_bucket,
        });
      }
      const status = result.code === 'TRUSTED_DEVICE_DISABLED' ? 403 : 401;
      return res.status(status).json({ code: result.code });
    }
    return res.json({
      ok: true,
      user: result.child,
      redirect: '/child/today',
      session_mode: 'resume',
      device_mode: result.device_mode,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/trusted-device/select-child', async (req, res, next) => {
  try {
    const raw = req.cookies?.[trusted.COOKIE_NAME];
    if (!raw) {
      return res.status(401).json({ code: 'TRUSTED_DEVICE_MISSING' });
    }
    const childId = req.body?.child_id;
    if (!childId) {
      return res.status(400).json({ code: 'CHILD_ID_REQUIRED' });
    }
    const result = await trusted.selectChildOnTrustedDevice(res, raw, childId);
    if (!result.ok) {
      const status = result.code === 'CHILD_ACCESS_DENIED' ? 403
        : result.code === 'TRUSTED_DEVICE_DISABLED' ? 403
          : 401;
      return res.status(status).json({ code: result.code });
    }
    return res.json({
      ok: true,
      user: result.child,
      redirect: '/child/today',
      session_mode: 'select',
      device_mode: result.device_mode,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
