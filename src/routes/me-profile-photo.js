'use strict';

const express = require('express');
const { requireChild } = require('../middleware/auth');
const { avatarApiFields } = require('../lib/avatar-api');
const { avatarUpload, parseAvatarUploadFile } = require('../lib/avatar-upload');
const { setChildAvatar, clearChildAvatar } = require('../lib/avatar-service');

const router = express.Router();

/** PUT /api/me/profile-photo — child selfie (C-01 exception) */
router.put('/profile-photo', requireChild, avatarUpload, async (req, res) => {
  try {
    const parsed = await parseAvatarUploadFile(req.file);
    const updated = await setChildAvatar(req.user.id, parsed);
    if (!updated) return res.status(404).json({ error: 'Barn hittades inte' });
    res.json({
      id: updated.id,
      name: updated.name,
      emoji: updated.emoji,
      ...avatarApiFields(updated, 'child'),
    });
  } catch (err) {
    if (err.userMessage) {
      return res.status(err.status || 400).json({ error: err.userMessage });
    }
    console.error('[ME-PROFILE-PHOTO] PUT error:', err.message);
    res.status(500).json({ error: 'Kunde inte spara profilbilden' });
  }
});

/** DELETE /api/me/profile-photo */
router.delete('/profile-photo', requireChild, async (req, res) => {
  try {
    const updated = await clearChildAvatar(req.user.id);
    if (!updated) return res.status(404).json({ error: 'Barn hittades inte' });
    res.json({
      id: updated.id,
      name: updated.name,
      emoji: updated.emoji,
      ...avatarApiFields(updated, 'child'),
    });
  } catch (err) {
    console.error('[ME-PROFILE-PHOTO] DELETE error:', err.message);
    res.status(500).json({ error: 'Kunde inte ta bort profilbilden' });
  }
});

module.exports = router;
