'use strict';

const multer = require('multer');
const {
  normalizeUploadBuffer,
  sanitizeFilename,
  isDangerousDeclaredType,
} = require('../routes/upload');
const { isObjectStorageConfigured } = require('./object-storage');

const avatarMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

function avatarUpload(req, res, next) {
  avatarMiddleware.single('image')(req, res, function (err) {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Bilden är för stor (max 2 MB)' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Ogiltigt fältnamn för bilduppladdning' });
    }
    console.error('[AVATAR-UPLOAD] Multer error:', err.message);
    return res.status(400).json({ error: 'Kunde inte ta emot bilden' });
  });
}

async function parseAvatarUploadFile(file) {
  if (!isObjectStorageConfigured()) {
    const err = new Error('NOT_CONFIGURED');
    err.status = 503;
    err.userMessage = 'Bilduppladdning är inte konfigurerad';
    throw err;
  }
  if (!file) {
    const err = new Error('NO_FILE');
    err.status = 400;
    err.userMessage = 'Ingen bild skickad';
    throw err;
  }

  const declaredType = (file.mimetype || '').toLowerCase();
  if (isDangerousDeclaredType(declaredType)) {
    const err = new Error('BAD_TYPE');
    err.status = 400;
    err.userMessage = 'Filtypen är inte tillåten';
    throw err;
  }

  let normalized;
  try {
    normalized = await normalizeUploadBuffer(file.buffer, declaredType);
  } catch (normErr) {
    if (normErr.userMessage) {
      const err = new Error('NORMALIZE');
      err.status = 400;
      err.userMessage = normErr.userMessage;
      throw err;
    }
    throw normErr;
  }

  if (!normalized) {
    const err = new Error('BAD_IMAGE');
    err.status = 400;
    err.userMessage = 'Endast JPEG, PNG eller WebP är tillåtna';
    throw err;
  }

  let safeFilename = sanitizeFilename(file.originalname || 'avatar.jpg');
  if (normalized.contentType === 'image/jpeg' && !/\.jpe?g$/i.test(safeFilename)) {
    safeFilename = safeFilename.replace(/\.[^.]+$/, '') + '.jpg';
    if (safeFilename === '.jpg') safeFilename = 'avatar.jpg';
  }

  return {
    buffer: normalized.buffer,
    contentType: normalized.contentType,
    filename: safeFilename,
  };
}

module.exports = {
  avatarUpload,
  parseAvatarUploadFile,
};
