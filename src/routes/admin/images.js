/**
 * Admin image bank API.
 * Owns: upload/list/delete for admin-uploaded images via R2.
 * Does NOT own: the R2 upload proxy itself (see routes/upload.js for the implementation).
 */

const express = require('express');
const multer = require('multer');
const { requireAdmin } = require('../../middleware/auth');
const { uploadImage, isObjectStorageConfigured } = require('../../lib/object-storage');
const { listAll, create, deleteById } = require('../../../db/admin-images');

const router = express.Router();

// ─── Upload middleware (reuse same constraints as routes/upload.js) ──────────
const IMAGE_SIGNATURES = [
  { mime: 'image/jpeg', magic: [0xFF, 0xD8, 0xFF] },
  { mime: 'image/png',  magic: [0x89, 0x50, 0x4E, 0x47] },
  { mime: 'image/webp', magic: [0x52, 0x49, 0x46, 0x46], offset4: [0x57, 0x45, 0x42, 0x50] },
];

function detectImageMime(buf) {
  for (const sig of IMAGE_SIGNATURES) {
    const matches = sig.magic.every((b, i) => buf[i] === b);
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

const uploadMiddleware = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ─── GET /api/admin/images ───────────────────────────────────────
router.get('/', requireAdmin, async (req, res) => {
  try {
    const images = await listAll();
    res.json(images);
  } catch (err) {
    console.error('[ADMIN/images] GET error:', err);
    res.status(500).json({ error: 'Kunde inte hämta bilder' });
  }
});

// ─── POST /api/admin/images/upload ───────────────────────────────
router.post('/upload', requireAdmin, uploadMiddleware.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Ingen bild skickad' });

    const declaredType = (req.file.mimetype || '').toLowerCase();
    if (declaredType === 'image/svg+xml' || !declaredType.startsWith('image/')) {
      return res.status(400).json({ error: 'Filtypen är inte tillåten (SVG ej tillåtet)' });
    }

    const detectedMime = detectImageMime(req.file.buffer);
    if (!detectedMime) {
      return res.status(400).json({ error: 'Filen verkar inte vara en giltig bild (JPEG, PNG eller WebP krävs)' });
    }

    const safeFilename = req.file.originalname
      .replace(/\\x00/g, '')
      .replace(/\n/g, '_')
      .replace(/[^a-zA-Z0-9.\\-]/g, '_')
      .substring(0, 128) || 'upload.jpg';

    if (!isObjectStorageConfigured()) {
      return res.status(503).json({ error: 'Bilduppladdning är inte konfigurerad' });
    }

    const publicUrl = await uploadImage({
      buffer: req.file.buffer,
      filename: safeFilename,
      contentType: detectedMime,
      prefix: 'admin',
    });

    const record = await create({
      uploaderId: req.user.id,
      url: publicUrl,
      filename: safeFilename,
      mimeType: detectedMime,
      fileSize: req.file.size,
    });

    res.status(201).json(record);
  } catch (err) {
    console.error('[ADMIN/images] Upload error:', err.message);
    res.status(500).json({ error: 'Uppladdning misslyckades' });
  }
});

// ─── DELETE /api/admin/images/:id ────────────────────────────────
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Ogiltigt id' });
    const deleted = await deleteById(id);
    if (!deleted) return res.status(404).json({ error: 'Hittades inte' });
    res.json({ success: true });
  } catch (err) {
    console.error('[ADMIN/images] DELETE error:', err);
    res.status(500).json({ error: 'Kunde inte ta bort bild' });
  }
});

module.exports = router;
