'use strict';

const express = require('express');
const { requireParent } = require('../middleware/auth');
const { canManageChildAvatar } = require('../lib/avatar-authz');
const { avatarApiFields } = require('../lib/avatar-api');
const { avatarUpload, parseAvatarUploadFile } = require('../lib/avatar-upload');
const { setChildAvatar, clearChildAvatar } = require('../lib/avatar-service');

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
      return res.status(403).json({ error: 'Du har inte behörighet att ändra denna profilbild' });
    }

    const parsed = await parseAvatarUploadFile(req.file);
    const updated = await setChildAvatar(childId, parsed);
    if (!updated) return res.status(404).json({ error: 'Barn hittades inte' });

    res.json(serializeChild(updated));
  } catch (err) {
    if (err.userMessage) {
      return res.status(err.status || 400).json({ error: err.userMessage });
    }
    console.error('[CHILD-AVATAR] PUT error:', err.message);
    res.status(500).json({ error: 'Kunde inte spara profilbilden' });
  }
});

/** DELETE /api/children/:childId/avatar */
router.delete('/:childId/avatar', requireParent, async (req, res) => {
  try {
    const childId = req.params.childId;
    const canManage = await canManageChildAvatar(req.user.id, childId);
    if (!canManage) {
      return res.status(403).json({ error: 'Du har inte behörighet att ta bort denna profilbild' });
    }

    const updated = await clearChildAvatar(childId);
    if (!updated) return res.status(404).json({ error: 'Barn hittades inte' });

    res.json(serializeChild(updated));
  } catch (err) {
    console.error('[CHILD-AVATAR] DELETE error:', err.message);
    res.status(500).json({ error: 'Kunde inte ta bort profilbilden' });
  }
});

module.exports = router;
