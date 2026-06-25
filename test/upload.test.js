/**
 * upload.test.js — Tests for image upload security.
 *
 * Covers:
 * - Rejects SVG files (by declared MIME type)
 * - Rejects HTML files disguised as JPEG (magic byte mismatch)
 * - Accepts valid JPEG/PNG/WebP magic bytes
 */

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

// Load the detection functions directly (exported by upload.js)
// Inject DATABASE_URL before requiring (upload.js imports auth middleware which imports db)
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'REDACTED/mock_test';
}

const { detectImageMime, sanitizeFilename } = require(path.join(__dirname, '../src/routes/upload'));

// ─── detectImageMime ──────────────────────────────────────

test('detectImageMime returns null for SVG content (no matching magic bytes)', () => {
  // SVG starts with '<svg' or '<?xml' — no matching image magic bytes
  const svgContent = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
  const result = detectImageMime(svgContent);
  assert.equal(result, null, 'SVG should return null — not a recognized image type');
});

test('detectImageMime returns null for HTML content disguised as image', () => {
  const htmlContent = Buffer.from('<!DOCTYPE html><html><body>XSS</body></html>');
  const result = detectImageMime(htmlContent);
  assert.equal(result, null, 'HTML should return null — magic bytes do not match JPEG/PNG/WebP');
});

test('detectImageMime identifies JPEG by magic bytes', () => {
  // JPEG magic bytes: FF D8 FF
  const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
  const result = detectImageMime(jpegBuffer);
  assert.equal(result, 'image/jpeg', 'Valid JPEG magic bytes should return image/jpeg');
});

test('detectImageMime identifies PNG by magic bytes', () => {
  // PNG magic bytes: 89 50 4E 47 (ASCII: .PNG)
  const pngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const result = detectImageMime(pngBuffer);
  assert.equal(result, 'image/png', 'Valid PNG magic bytes should return image/png');
});

test('detectImageMime identifies WebP by magic bytes', () => {
  // WebP: starts with RIFF (52 49 46 46), then 4 bytes of file size, then WEBP (57 45 42 50)
  const webpBuffer = Buffer.alloc(16);
  webpBuffer[0] = 0x52; // R
  webpBuffer[1] = 0x49; // I
  webpBuffer[2] = 0x46; // F
  webpBuffer[3] = 0x46; // F
  // bytes 4-7: file size (any)
  webpBuffer[8] = 0x57;  // W
  webpBuffer[9] = 0x45;  // E
  webpBuffer[10] = 0x42; // B
  webpBuffer[11] = 0x50; // P
  const result = detectImageMime(webpBuffer);
  assert.equal(result, 'image/webp', 'Valid WebP magic bytes should return image/webp');
});

test('detectImageMime returns null for empty buffer', () => {
  const result = detectImageMime(Buffer.alloc(0));
  assert.equal(result, null, 'Empty buffer should return null');
});

// ─── sanitizeFilename ─────────────────────────────────────

test('sanitizeFilename removes path traversal sequences', () => {
  const result = sanitizeFilename('../../../etc/passwd');
  assert.equal(result.includes('..'), false, 'Should strip ../ sequences');
  assert.equal(result.includes('/'), false, 'Should strip forward slashes');
});

test('sanitizeFilename removes null bytes', () => {
  const result = sanitizeFilename('photo\x00.jpg');
  assert.equal(result.includes('\x00'), false, 'Should strip null bytes');
});

test('sanitizeFilename returns fallback for empty input', () => {
  assert.equal(sanitizeFilename(''), 'upload.jpg', 'Empty name should return fallback');
  assert.equal(sanitizeFilename(null), 'upload.jpg', 'Null should return fallback');
});

test('isHeicBuffer detects HEIC ftyp brand', () => {
  const { isHeicBuffer } = require(path.join(__dirname, '../src/routes/upload'));
  const buf = Buffer.alloc(16);
  buf.write('????ftypheic', 0, 'ascii');
  assert.equal(isHeicBuffer(buf), true);
});

test('isHeicBuffer returns false for JPEG', () => {
  const { isHeicBuffer } = require(path.join(__dirname, '../src/routes/upload'));
  const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
  assert.equal(isHeicBuffer(jpegBuffer), false);
});
