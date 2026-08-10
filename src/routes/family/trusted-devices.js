'use strict';

const express = require('express');
const trusted = require('../../lib/trusted-device');
const deviceSettings = require('../../lib/trusted-device-settings');
const { isTrustedDeviceEnabled } = require('../../lib/trusted-device-flags');

const router = express.Router();

router.get('/trusted-devices', async (req, res, next) => {
  try {
    const familyId = req.user.familyId;
    const enabled = await isTrustedDeviceEnabled(familyId);
    const devices = enabled ? await trusted.listDevicesForFamily(familyId) : [];
    res.json({ enabled, devices });
  } catch (err) {
    next(err);
  }
});

router.post('/trusted-devices/child', async (req, res, next) => {
  try {
    const familyId = req.user.familyId;
    const parentId = req.user.id;
    const childId = req.body?.child_id;
    const platform = typeof req.body?.platform === 'string' ? req.body.platform.slice(0, 32) : null;
    const label = typeof req.body?.label === 'string' ? req.body.label.slice(0, 120) : null;
    if (!childId) {
      return res.status(400).json({ error: 'child_id required' });
    }
    const { device, rawToken } = await trusted.enrollChildDevice({
      parentId,
      familyId,
      childId,
      platform,
      label,
    });
    trusted.setTrustedDeviceCookie(res, rawToken);
    res.status(201).json({
      device: {
        id: device.id,
        device_mode: device.device_mode,
        default_child_id: device.default_child_id,
        platform: device.platform,
        label: device.label,
        trusted_at: device.trusted_at,
      },
      enroll_token: rawToken,
    });
  } catch (err) {
    if (err.code === 'TRUSTED_DEVICE_DISABLED') {
      return res.status(403).json({ code: err.code });
    }
    if (err.code === 'CHILD_ACCESS_DENIED') {
      return res.status(403).json({ code: err.code });
    }
    if (err.code === 'CHILD_NOT_FOUND') {
      return res.status(404).json({ code: err.code });
    }
    next(err);
  }
});

router.get('/trusted-devices/this-device', async (req, res, next) => {
  try {
    const state = await deviceSettings.getThisDeviceState(req);
    res.json(state);
  } catch (err) {
    next(err);
  }
});

router.patch('/trusted-devices/this-device', async (req, res, next) => {
  try {
    const familyId = req.user.familyId;
    const raw = req.cookies?.[trusted.COOKIE_NAME];
    const row = await deviceSettings.resolveThisDeviceRow(raw, familyId);
    if (!row) {
      return res.status(404).json({ code: 'THIS_DEVICE_NOT_ENROLLED' });
    }
    const payload = await deviceSettings.applyThisDeviceUpdate({
      row,
      familyId,
      parentId: req.user.id,
      body: req.body || {},
    });
    res.json(payload);
  } catch (err) {
    if (err.code === 'CHILD_ACCESS_DENIED') {
      return res.status(403).json({ code: err.code });
    }
    if (err.code === 'INVALID_USAGE' || err.code === 'INVALID_START_MODE') {
      return res.status(400).json({ code: err.code });
    }
    next(err);
  }
});

router.post('/trusted-devices/this-device/setup', async (req, res, next) => {
  try {
    const payload = await deviceSettings.completeDeviceSetup({
      req,
      res,
      body: req.body || {},
    });
    res.status(201).json(payload);
  } catch (err) {
    if (err.code === 'TRUSTED_DEVICE_DISABLED') {
      return res.status(403).json({ code: err.code });
    }
    if (err.code === 'CHILD_ACCESS_DENIED') {
      return res.status(403).json({ code: err.code });
    }
    if (err.code === 'INVALID_USAGE') {
      return res.status(400).json({ code: err.code });
    }
    next(err);
  }
});

router.post('/trusted-devices/parent', async (req, res, next) => {
  try {
    const familyId = req.user.familyId;
    const parentId = req.user.id;
    const platform = typeof req.body?.platform === 'string' ? req.body.platform.slice(0, 32) : null;
    const label = typeof req.body?.label === 'string' ? req.body.label.slice(0, 120) : null;
    const { device, rawToken } = await trusted.enrollParentDevice({
      parentId,
      familyId,
      platform,
      label,
    });
    trusted.setTrustedDeviceCookie(res, rawToken);
    res.status(201).json({
      device: {
        id: device.id,
        device_mode: device.device_mode,
        default_child_id: device.default_child_id,
        platform: device.platform,
        label: device.label,
        trusted_at: device.trusted_at,
      },
      enroll_token: rawToken,
    });
  } catch (err) {
    if (err.code === 'TRUSTED_DEVICE_DISABLED') {
      return res.status(403).json({ code: err.code });
    }
    next(err);
  }
});

router.post('/trusted-devices/shared', async (req, res, next) => {
  try {
    const familyId = req.user.familyId;
    const parentId = req.user.id;
    const platform = typeof req.body?.platform === 'string' ? req.body.platform.slice(0, 32) : null;
    const label = typeof req.body?.label === 'string' ? req.body.label.slice(0, 120) : null;
    const { device, rawToken } = await trusted.enrollSharedDevice({
      parentId,
      familyId,
      platform,
      label,
    });
    trusted.setTrustedDeviceCookie(res, rawToken);
    res.status(201).json({
      device: {
        id: device.id,
        device_mode: device.device_mode,
        default_child_id: device.default_child_id,
        platform: device.platform,
        label: device.label,
        trusted_at: device.trusted_at,
      },
      enroll_token: rawToken,
    });
  } catch (err) {
    if (err.code === 'TRUSTED_DEVICE_DISABLED') {
      return res.status(403).json({ code: err.code });
    }
    next(err);
  }
});

router.delete('/trusted-devices/:deviceId', async (req, res, next) => {
  try {
    const familyId = req.user.familyId;
    const revoked = await trusted.revokeDeviceForFamily(req.params.deviceId, familyId);
    if (!revoked) {
      return res.status(404).json({ code: 'DEVICE_NOT_FOUND' });
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post('/trusted-devices/revoke-all', async (req, res, next) => {
  try {
    await trusted.revokeAllForFamily(req.user.familyId);
    trusted.clearTrustedDeviceCookie(res);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
