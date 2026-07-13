'use strict';

const multer = require('multer');
const {
  normalizeUploadBuffer,
  sanitizeFilename,
  isDangerousDeclaredType,
} = require('../routes/upload');
const { isObjectStorageConfigured } = require('./object-storage');

/** Max edge after server normalize — client crop is 512px; cap decoded pixels. */
const AVATAR_MAX_EDGE_PX = 2048;
const AVATAR_MAX_INPUT_PIXELS = AVATAR_MAX_EDGE_PX * AVATAR_MAX_EDGE_PX;
const AVATAR_MAX_OUTPUT_BYTES = 2 * 1024 * 1024;

/**
 * Re-encode via sharp: MIME sniff (via normalizeUploadBuffer), pixel cap, decompression guard.
 */
async function sanitizeAvatarImageBuffer(buffer, declaredType) {
  const normalized = await normalizeUploadBuffer(buffer, declaredType);
  if (!normalized) {
    const err = new Error('BAD_IMAGE');
    err.status = 400;
    err.userMessage = 'Endast JPEG, PNG eller WebP är tillåtna';
    throw err;
  }

  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    return normalized;
  }

  let pipeline = sharp(normalized.buffer, {
    limitInputPixels: AVATAR_MAX_INPUT_PIXELS,
    failOn: 'error',
  });

  let meta;
  try {
    meta = await pipeline.metadata();
  } catch (metaErr) {
    const err = new Error('BAD_IMAGE');
    err.status = 400;
    err.userMessage = 'Bilden kunde inte läsas eller är för stor';
    throw err;
  }

  if (!meta.width || !meta.height) {
    const err = new Error('BAD_IMAGE');
    err.status = 400;
    err.userMessage = 'Bilden kunde inte läsas';
    throw err;
  }

  if (meta.width > AVATAR_MAX_EDGE_PX || meta.height > AVATAR_MAX_EDGE_PX) {
    pipeline = pipeline.resize(AVATAR_MAX_EDGE_PX, AVATAR_MAX_EDGE_PX, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  let out;
  try {
    out = await pipeline.rotate().jpeg({ quality: 88, mozjpeg: true }).toBuffer();
  } catch (encodeErr) {
    const err = new Error('BAD_IMAGE');
    err.status = 400;
    err.userMessage = 'Bilden kunde inte bearbetas';
    throw err;
  }

  if (out.length > AVATAR_MAX_OUTPUT_BYTES) {
    const err = new Error('TOO_LARGE');
    err.status = 413;
    err.userMessage = 'Bilden är för stor (max 2 MB)';
    throw err;
  }

  return { buffer: out, contentType: 'image/jpeg' };
}

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
    normalized = await sanitizeAvatarImageBuffer(file.buffer, declaredType);
  } catch (normErr) {
    if (normErr.userMessage) {
      const err = new Error('NORMALIZE');
      err.status = normErr.status || 400;
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
  sanitizeAvatarImageBuffer,
  AVATAR_MAX_EDGE_PX,
  AVATAR_MAX_INPUT_PIXELS,
};
