'use strict';

const express = require('express');
const trusted = require('../../lib/trusted-device');

const router = express.Router();

router.post('/trusted-device/restore', async (req, res, next) => {
  try {
    const raw = req.cookies?.[trusted.COOKIE_NAME];
    if (!raw) {
      return res.status(401).json({ code: 'TRUSTED_DEVICE_MISSING' });
    }
    const result = await trusted.restoreChildSessionFromDevice(req, res, raw);
    if (!result.ok) {
      const status = result.code === 'TRUSTED_DEVICE_DISABLED' ? 403 : 401;
      return res.status(status).json({ code: result.code });
    }
    return res.json({
      ok: true,
      user: result.child,
      redirect: '/child/today',
      session_mode: 'resume',
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
