'use strict';

const multer = require('multer');
const {
  normalizeUploadBuffer,
  sanitizeFilename,
  isDangerousDeclaredType,
} = require('../routes/upload');
const { isObjectStorageConfigured } = require('./object-storage');
const { sendApiError } = require('./api-user-error');

function uploadFail(code, status, extra) {
  const err = new Error(code);
  err.status = status;
  err.code = code;
  err.userMessage = code;
  if (extra && extra.details) err.details = extra.details;
  throw err;
}

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
    uploadFail('UPLOAD_INVALID_IMAGE', 400);
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
    uploadFail('UPLOAD_INVALID_IMAGE', 400);
  }

  if (!meta.width || !meta.height) {
    uploadFail('UPLOAD_INVALID_IMAGE', 400);
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
    uploadFail('UPLOAD_INVALID_IMAGE', 400);
  }

  if (out.length > AVATAR_MAX_OUTPUT_BYTES) {
    uploadFail('UPLOAD_FILE_TOO_LARGE', 413, { details: { maxMb: 2 } });
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
      return sendApiError(res, 413, 'UPLOAD_FILE_TOO_LARGE', { details: { maxMb: 2 } });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return sendApiError(res, 400, 'UPLOAD_INVALID_FIELD');
    }
    console.error('[AVATAR-UPLOAD] Multer error:', err.message);
    return sendApiError(res, 400, 'UPLOAD_RECEIVE_FAILED');
  });
}

async function parseAvatarUploadFile(file) {
  if (!isObjectStorageConfigured()) {
    uploadFail('UPLOAD_NOT_CONFIGURED', 503);
  }
  if (!file) {
    uploadFail('UPLOAD_NO_FILE', 400);
  }

  const declaredType = (file.mimetype || '').toLowerCase();
  if (isDangerousDeclaredType(declaredType)) {
    uploadFail('UPLOAD_TYPE_NOT_ALLOWED', 400);
  }

  let normalized;
  try {
    normalized = await sanitizeAvatarImageBuffer(file.buffer, declaredType);
  } catch (normErr) {
    if (normErr.userMessage) {
      uploadFail(normErr.code || normErr.userMessage || 'UPLOAD_INVALID_IMAGE', normErr.status || 400);
    }
    throw normErr;
  }

  if (!normalized) {
    uploadFail('UPLOAD_INVALID_IMAGE', 400);
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
