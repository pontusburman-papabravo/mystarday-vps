#!/usr/bin/env node
/**
 * Test R2 upload. Loads .env from cwd if present (same vars as mystarday.service).
 * Usage on VPS:
 *   cd /var/www/mystarday && node scripts/test-r2-upload.js
 */
const fs = require('fs');
const path = require('path');

const envPath = process.env.ENV_FILE || path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

const { uploadImage, isR2Configured, usesLocalStorage, getR2S3Endpoint } = require('../src/lib/object-storage');

async function main() {
  console.log('R2 configured:', isR2Configured());
  console.log('Uses local storage:', usesLocalStorage());
  if (isR2Configured()) {
    console.log('S3 endpoint:', getR2S3Endpoint());
    console.log('Public base URL:', process.env.R2_PUBLIC_BASE_URL);
  }

  if (!isR2Configured() && !usesLocalStorage()) {
    console.error('Upload not configured — check .env (R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_BASE_URL)');
    process.exit(1);
  }

  const jpeg = Buffer.from(
    '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGfAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAT8Af//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Af//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Af//Z',
    'base64'
  );

  try {
    const url = await uploadImage({
      buffer: jpeg,
      filename: 'test-r2.jpg',
      contentType: 'image/jpeg',
      prefix: 'uploads',
    });
    console.log('Upload OK:', url);

    const res = await fetch(url, { method: 'HEAD' });
    console.log('Public URL reachable:', res.status, res.statusText);
    if (!res.ok) {
      console.warn('Upload OK but public URL not reachable — enable Public access (r2.dev) and fix R2_PUBLIC_BASE_URL');
      process.exit(2);
    }
    process.exit(0);
  } catch (err) {
    console.error('Upload failed:', err.message);
    process.exit(1);
  }
}

main();
