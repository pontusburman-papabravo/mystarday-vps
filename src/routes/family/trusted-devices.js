'use strict';

const express = require('express');
const trusted = require('../../lib/trusted-device');
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
    });
  } catch (err) {
    if (err.code === 'TRUSTED_DEVICE_DISABLED') {
      return res.status(403).json({ code: err.code });
    }
    if (err.code === 'PARENT_FAMILY_MISMATCH') {
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
