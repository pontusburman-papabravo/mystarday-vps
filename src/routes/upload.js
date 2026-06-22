// Owns: POST /api/upload/image, POST /api/upload/avatar — authenticated image uploads (R2 or local disk).
// Does NOT own: auth token issuance, family/child data, any other file types.

const express = require('express');
const multer = require('multer');
const { requireParent } = require('../middleware/auth');
const { uploadImage, isObjectStorageConfigured } = require('../lib/object-storage');

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
    return res.status(413).json({
      error: isAvatar ? 'Bilden är för stor (max 2 MB)' : 'Bilden är för stor (max 5 MB)',
    });
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ error: 'Ogiltigt fältnamn för bilduppladdning' });
  }
  console.error('[UPLOAD] Multer error:', err.message);
  return res.status(400).json({ error: 'Kunde inte ta emot bilden' });
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

router.post('/', requireParent, imageUpload, async (req, res) => {
  try {
    if (!isObjectStorageConfigured()) {
      return res.status(503).json({ error: 'Bilduppladdning är inte konfigurerad' });
    }
    if (!req.file) return res.status(400).json({ error: 'Ingen bild skickad' });

    const declaredType = (req.file.mimetype || '').toLowerCase();
    if (declaredType === 'image/svg+xml' || declaredType.startsWith('text/') || !declaredType.startsWith('image/')) {
      return res.status(400).json({ error: 'Filtypen är inte tillåten' });
    }

    const detectedMime = detectImageMime(req.file.buffer);
    if (!detectedMime) {
      return res.status(400).json({ error: 'Filen verkar inte vara en giltig bild (JPEG, PNG eller WebP krävs)' });
    }

    const safeFilename = sanitizeFilename(req.file.originalname);
    const url = await uploadImage({
      buffer: req.file.buffer,
      filename: safeFilename,
      contentType: detectedMime,
      prefix: 'uploads',
    });
    res.json({ url });
  } catch (err) {
    console.error('[UPLOAD] Image error:', err.message);
    res.status(500).json({ error: 'Uppladdning misslyckades' });
  }
});

router.post('/avatar', requireParent, avatarUpload, async (req, res) => {
  try {
    if (!isObjectStorageConfigured()) {
      return res.status(503).json({ error: 'Bilduppladdning är inte konfigurerad' });
    }
    if (!req.file) return res.status(400).json({ error: 'Ingen bild skickad' });

    const declaredType = (req.file.mimetype || '').toLowerCase();
    if (!declaredType.startsWith('image/') || declaredType === 'image/svg+xml' || declaredType.startsWith('text/')) {
      return res.status(400).json({ error: 'Filtypen är inte tillåten' });
    }

    const detectedMime = detectImageMime(req.file.buffer);
    if (!detectedMime) {
      return res.status(400).json({ error: 'Endast JPEG, PNG eller WebP är tillåtna' });
    }

    const safeFilename = sanitizeFilename(req.file.originalname || 'avatar.jpg');
    const url = await uploadImage({
      buffer: req.file.buffer,
      filename: safeFilename,
      contentType: detectedMime,
      prefix: 'avatars',
    });
    res.json({ url });
  } catch (err) {
    console.error('[UPLOAD/AVATAR] error:', err.message);
    res.status(500).json({ error: 'Uppladdning misslyckades' });
  }
});

module.exports = router;
module.exports.detectImageMime = detectImageMime;
module.exports.sanitizeFilename = sanitizeFilename;
