// Owns: POST /api/upload/image, POST /api/upload/avatar — authenticated image uploads (R2 or local disk).
// Does NOT own: auth token issuance, family/child data, any other file types.

const express = require('express');
const multer = require('multer');
const { requireParent } = require('../middleware/auth');
const { uploadImage, isObjectStorageConfigured } = require('../lib/object-storage');
const { sendApiError } = require('../lib/api-user-error');

const router = express.Router();

// Magic byte signatures for allowed image types
const IMAGE_SIGNATURES = [
  { mime: 'image/jpeg', magic: [0xFF, 0xD8, 0xFF] },
  { mime: 'image/png',  magic: [0x89, 0x50, 0x4E, 0x47] },
  { mime: 'image/webp', magic: [0x52, 0x49, 0x46, 0x46], offset4: [0x57, 0x45, 0x42, 0x50] },
];

function detectImageMime(buf) {
  for (const sig of IMAGE_SIGNATURES) {
    const bytes = sig.magic;
    const matches = bytes.every((b, i) => buf[i] === b);
    if (matches) {
      if (sig.offset4) {
        const webpMatch = sig.offset4.every((b, i) => buf[8 + i] === b);
        if (webpMatch) return sig.mime;
      } else {
        return sig.mime;
      }
    }
  }
  return null;
}

/** ISO BMFF container used by iPhone HEIC/HEIF. */
function isHeicBuffer(buf) {
  if (!buf || buf.length < 12) return false;
  if (buf.slice(4, 8).toString('ascii') !== 'ftyp') return false;
  const brand = buf.slice(8, 12).toString('ascii').toLowerCase();
  return (
    brand.startsWith('heic') || brand.startsWith('heix') || brand.startsWith('heim')
    || brand.startsWith('heis') || brand.startsWith('hevc') || brand.startsWith('hevx')
    || brand === 'mif1' || brand === 'msf1'
  );
}

function isDangerousDeclaredType(mime) {
  const t = (mime || '').toLowerCase();
  return t === 'image/svg+xml' || t.startsWith('text/');
}

/**
 * Resolve buffer + content-type from upload bytes.
 * Mobile cameras often send application/octet-stream — trust magic bytes, not declared MIME.
 */
async function normalizeUploadBuffer(buffer, declaredType) {
  const detected = detectImageMime(buffer);
  if (detected) return { buffer, contentType: detected };

  const declared = (declaredType || '').toLowerCase();
  const heicLike = isHeicBuffer(buffer)
    || declared === 'image/heic' || declared === 'image/heif';

  if (!heicLike) return null;

  try {
    const sharp = require('sharp');
    const out = await sharp(buffer).rotate().jpeg({ quality: 88 }).toBuffer();
    return { buffer: out, contentType: 'image/jpeg' };
  } catch (err) {
    console.error('[UPLOAD] HEIC conversion error:', err.message);
    const convErr = new Error('UPLOAD_HEIC_CONVERT_FAILED');
    convErr.code = 'UPLOAD_HEIC_CONVERT_FAILED';
    convErr.userMessage = 'UPLOAD_HEIC_CONVERT_FAILED';
    throw convErr;
  }
}

function sanitizeFilename(name) {
  if (!name) return 'upload.jpg';
  const cleaned = String(name)
    .replace(/\u0000/g, '')
    .replace(/\.\./g, '')
    .replace(/[/\\]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .substring(0, 128);
  return cleaned || 'upload.jpg';
}

const uploadMiddleware = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const avatarMiddleware = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

function handleMulterError(err, req, res, next) {
  if (!err) return next();
  if (err.code === 'LIMIT_FILE_SIZE') {
    const isAvatar = (req.path || '').includes('avatar');
    return sendApiError(res, 413, 'UPLOAD_FILE_TOO_LARGE', {
      details: { maxMb: isAvatar ? 2 : 5 },
    });
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return sendApiError(res, 400, 'UPLOAD_INVALID_FIELD');
  }
  console.error('[UPLOAD] Multer error:', err.message);
  return sendApiError(res, 400, 'UPLOAD_RECEIVE_FAILED');
}

function avatarUpload(req, res, next) {
  avatarMiddleware.single('image')(req, res, function (err) {
    if (err) return handleMulterError(err, req, res, next);
    next();
  });
}

function imageUpload(req, res, next) {
  uploadMiddleware.single('image')(req, res, function (err) {
    if (err) return handleMulterError(err, req, res, next);
    next();
  });
}

async function handleImageUpload(req, res) {
  try {
    if (!isObjectStorageConfigured()) {
      return sendApiError(res, 503, 'UPLOAD_NOT_CONFIGURED');
    }
    if (!req.file) return sendApiError(res, 400, 'UPLOAD_NO_FILE');

    const declaredType = (req.file.mimetype || '').toLowerCase();
    if (isDangerousDeclaredType(declaredType)) {
      return sendApiError(res, 400, 'UPLOAD_TYPE_NOT_ALLOWED');
    }

    let normalized;
    try {
      normalized = await normalizeUploadBuffer(req.file.buffer, declaredType);
    } catch (normErr) {
      if (normErr.code || normErr.userMessage) {
        return sendApiError(res, 400, normErr.code || 'UPLOAD_HEIC_CONVERT_FAILED');
      }
      throw normErr;
    }
    if (!normalized) {
      return sendApiError(res, 400, 'UPLOAD_INVALID_IMAGE');
    }

    let safeFilename = sanitizeFilename(req.file.originalname);
    if (normalized.contentType === 'image/jpeg' && !/\.jpe?g$/i.test(safeFilename)) {
      safeFilename = safeFilename.replace(/\.[^.]+$/, '') + '.jpg';
      if (safeFilename === '.jpg') safeFilename = 'upload.jpg';
    }

    const url = await uploadImage({
      buffer: normalized.buffer,
      filename: safeFilename,
      contentType: normalized.contentType,
      prefix: 'uploads',
    });
    res.json({ url });
  } catch (err) {
    console.error('[UPLOAD] Image error:', err.message);
    sendApiError(res, 500, 'UPLOAD_FAILED');
  }
}

router.post('/', requireParent, imageUpload, handleImageUpload);
router.post('/image', requireParent, imageUpload, handleImageUpload);

router.post('/avatar', requireParent, (_req, res) => {
  sendApiError(res, 410, 'UPLOAD_AVATAR_GONE');
});

module.exports = router;
module.exports.detectImageMime = detectImageMime;
module.exports.isHeicBuffer = isHeicBuffer;
module.exports.isDangerousDeclaredType = isDangerousDeclaredType;
module.exports.normalizeUploadBuffer = normalizeUploadBuffer;
module.exports.sanitizeFilename = sanitizeFilename;
