'use strict';

const express = require('express');
const { optionalAuth } = require('../middleware/auth');
const {
  canViewMemberAvatar,
  canViewMemberAvatarViaTrustedDevice,
  VALID_MEMBER_TYPES,
} = require('../lib/avatar-authz');
const { avatarVersion } = require('../lib/avatar-api');
const { getChildAvatarRow, getParentAvatarRow } = require('../lib/avatar-service');
const { getPrivateObjectMeta } = require('../lib/avatar-storage');

const router = express.Router();

/** Revalidate on every use — authz runs before 304; avoids stale body after revoked access. */
const AVATAR_CACHE_CONTROL = 'private, no-cache, must-revalidate';

async function loadAvatarRecord(memberType, memberId) {
  if (memberType === 'child') return getChildAvatarRow(memberId);
  if (memberType === 'parent') return getParentAvatarRow(memberId);
  return null;
}

/** GET /api/avatars/:memberType/:memberId — authenticated image delivery */
router.get('/:memberType/:memberId', optionalAuth, async (req, res) => {
  try {
    const memberType = req.params.memberType;
    const memberId = req.params.memberId;

    if (!VALID_MEMBER_TYPES.has(memberType)) {
      return res.status(404).end();
    }
    const allowed = req.user
      ? await canViewMemberAvatar(req.user, memberType, memberId)
      : await canViewMemberAvatarViaTrustedDevice(req, memberType, memberId);
    if (!allowed) {
      return res.status(404).end();
    }

    const record = await loadAvatarRecord(memberType, memberId);
    if (!record || !record.avatar_storage_key) {
      return res.status(404).end();
    }

    const meta = await getPrivateObjectMeta(record.avatar_storage_key);
    if (!meta || !meta.stream) {
      return res.status(404).end();
    }

    const etag = `"av-${memberType}-${memberId}-${avatarVersion(record.avatar_updated_at)}"`;
    if (req.headers['if-none-match'] === etag) {
      res.setHeader('Cache-Control', AVATAR_CACHE_CONTROL);
      res.setHeader('Vary', 'Cookie');
      res.setHeader('ETag', etag);
      return res.status(304).end();
    }

    res.setHeader('Content-Type', meta.contentType);
    res.setHeader('Cache-Control', AVATAR_CACHE_CONTROL);
    res.setHeader('Vary', 'Cookie');
    res.setHeader('ETag', etag);
    if (meta.size) res.setHeader('Content-Length', String(meta.size));

    const stream = meta.stream();
    stream.on('error', (err) => {
      console.error('[AVATARS] stream error:', err.message);
      if (!res.headersSent) res.status(404).end();
    });
    stream.pipe(res);
  } catch (err) {
    console.error('[AVATARS] GET error:', err.message);
    if (!res.headersSent) res.status(500).end();
  }
});

module.exports = router;
module.exports.AVATAR_CACHE_CONTROL = AVATAR_CACHE_CONTROL;
