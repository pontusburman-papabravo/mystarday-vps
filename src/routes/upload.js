// Owns: POST /api/upload/image, POST /api/upload/avatar — authenticated image uploads to Polsia R2.
// Does NOT own: auth token issuance, family/child data, any other file types.

const express = require('express');
const multer = require('multer');
const nodeFetch = require('node-fetch');
const FormData = require('form-data');
const { requireParent } = require('../middleware/auth');

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
        // WebP: check bytes 8-11 as well
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
  // Remove null bytes, path traversal sequences, and control chars
  return name
    .replace(/\u0000/g, '')
    .replace(/\f\f[/\\]/g, '')
    .replace(/[/\\]/g, '')
    .replace(/[^\f.\f-]/g, '_')
    .substring(0, 128);
}

// 5 MB hard limit for general image uploads
const uploadMiddleware = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// 2 MB limit for child avatar uploads (jpeg/png/webp only)
const avatarMiddleware = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

router.post('/', requireParent, uploadMiddleware.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Ingen bild skickad' });

    // Reject SVG and any non-image content-type
    const declaredType = (req.file.mimetype || '').toLowerCase();
    if (declaredType === 'image/svg+xml' || declaredType.startsWith('text/') || !declaredType.startsWith('image/')) {
      return res.status(400).json({ error: 'Filtypen är inte tillåten' });
    }

    // Magic byte validation — trust the bytes, not the declared MIME
    const detectedMime = detectImageMime(req.file.buffer);
    if (!detectedMime) {
      return res.status(400).json({ error: 'Filen verkar inte vara en giltig bild (JPEG, PNG eller WebP krävs)' });
    }

    // Sanitize filename before forwarding
    const safeFilename = sanitizeFilename(req.file.originalname);

    const fd = new FormData();
    fd.append('file', req.file.buffer, { filename: safeFilename, contentType: detectedMime });
    const r2Res = await nodeFetch('https://polsia.com/api/proxy/r2/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.POLSIA_API_KEY}`, ...fd.getHeaders() },
      body: fd,
    });
    const r2Data = await r2Res.json();
    if (!r2Data.success) throw new Error(r2Data.error?.message || 'Upload misslyckades');
    res.json({ url: r2Data.file.url });
  } catch (err) {
    // Log the error message only — never log file content
    console.error('[UPLOAD] Image error:', err.message);
    res.status(500).json({ error: 'Uppladdning misslyckades' });
  }
});

// POST /api/upload/avatar — child avatar upload (2MB, jpeg/png/webp only)
// Uploads to R2 and returns a public URL to be stored in child.avatar_url
router.post('/avatar', requireParent, avatarMiddleware.single('image'), async (req, res) => {
  try {
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
    const fd = new FormData();
    fd.append('file', req.file.buffer, { filename: safeFilename, contentType: detectedMime });

    const r2Res = await nodeFetch('https://polsia.com/api/proxy/r2/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.POLSIA_API_KEY}`, ...fd.getHeaders() },
      body: fd,
    });
    const r2Data = await r2Res.json();
    if (!r2Data.success) throw new Error(r2Data.error?.message || 'Upload misslyckades');

    res.json({ url: r2Data.file.url });
  } catch (err) {
    console.error('[UPLOAD/AVATAR] error:', err.message);
    res.status(500).json({ error: 'Uppladdning misslyckades' });
  }
});

module.exports = router;
module.exports.detectImageMime = detectImageMime;
module.exports.sanitizeFilename = sanitizeFilename;