'use strict';

const express = require('express');
const { requireParent } = require('../middleware/auth');
const { canManageChildAvatar } = require('../lib/avatar-authz');
const { avatarApiFields } = require('../lib/avatar-api');
const { avatarUpload, parseAvatarUploadFile } = require('../lib/avatar-upload');
const { setChildAvatar, clearChildAvatar } = require('../lib/avatar-service');
const { sendApiError } = require('../lib/api-user-error');

const router = express.Router({ mergeParams: true });

function serializeChild(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    ...avatarApiFields(row, 'child'),
  };
}

/** PUT /api/children/:childId/avatar */
router.put('/:childId/avatar', requireParent, avatarUpload, async (req, res) => {
  try {
    const childId = req.params.childId;
    const canManage = await canManageChildAvatar(req.user.id, childId);
    if (!canManage) {
      return sendApiError(res, 403, 'AVATAR_FORBIDDEN');
    }

    const parsed = await parseAvatarUploadFile(req.file);
    const updated = await setChildAvatar(childId, parsed);
    if (!updated) return sendApiError(res, 404, 'AVATAR_CHILD_NOT_FOUND');

    res.json(serializeChild(updated));
  } catch (err) {
    if (err.code || err.userMessage) {
      return sendApiError(res, err.status || 400, err.code || err.userMessage, {
        details: err.details,
      });
    }
    console.error('[CHILD-AVATAR] PUT error:', err.message);
    sendApiError(res, 500, 'AVATAR_SAVE_FAILED');
  }
});

/** DELETE /api/children/:childId/avatar */
router.delete('/:childId/avatar', requireParent, async (req, res) => {
  try {
    const childId = req.params.childId;
    const canManage = await canManageChildAvatar(req.user.id, childId);
    if (!canManage) {
      return sendApiError(res, 403, 'AVATAR_FORBIDDEN');
    }

    const updated = await clearChildAvatar(childId);
    if (!updated) return sendApiError(res, 404, 'AVATAR_CHILD_NOT_FOUND');

    res.json(serializeChild(updated));
  } catch (err) {
    console.error('[CHILD-AVATAR] DELETE error:', err.message);
    sendApiError(res, 500, 'AVATAR_DELETE_FAILED');
  }
});

module.exports = router;
