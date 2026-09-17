'use strict';

const { sendApiError } = require('../../lib/api-user-error');

const express = require('express');
const { requireParent } = require('../../middleware/auth');
const { avatarApiFields } = require('../../lib/avatar-api');
const { avatarUpload, parseAvatarUploadFile } = require('../../lib/avatar-upload');
const { setParentAvatar, clearParentAvatar } = require('../../lib/avatar-service');

const router = express.Router();

function serializeParent(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    ...avatarApiFields(row, 'parent'),
  };
}

/** PUT /api/account/avatar */
router.put('/avatar', requireParent, avatarUpload, async (req, res) => {
  try {
    const parsed = await parseAvatarUploadFile(req.file);
    const updated = await setParentAvatar(req.user.id, parsed);
    if (!updated) return res.status(404).json({ error: 'USER_NOT_FOUND' });
    res.json(serializeParent(updated));
  } catch (err) {
    if (err.userMessage) {
      return res.status(err.status || 400).json({ error: err.userMessage });
    }
    console.error('[ACCOUNT-AVATAR] PUT error:', err.message);
    sendApiError(res, 500, 'AVATAR_SAVE_FAILED');
  }
});

/** DELETE /api/account/avatar */
router.delete('/avatar', requireParent, async (req, res) => {
  try {
    const updated = await clearParentAvatar(req.user.id);
    if (!updated) return res.status(404).json({ error: 'USER_NOT_FOUND' });
    res.json(serializeParent(updated));
  } catch (err) {
    console.error('[ACCOUNT-AVATAR] DELETE error:', err.message);
    sendApiError(res, 500, 'AVATAR_DELETE_FAILED');
  }
});

module.exports = router;
