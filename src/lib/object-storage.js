/**
 * Object storage — Cloudflare R2 (S3-compatible API).
 * Replaces the former Polsia R2 upload proxy.
 */
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { randomUUID } = require('crypto');

function isObjectStorageConfigured() {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME &&
    process.env.R2_PUBLIC_BASE_URL
  );
}

function getS3Client() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
}

/**
 * Upload image buffer; returns public HTTPS URL.
 * @param {{ buffer: Buffer, filename: string, contentType: string, prefix?: string }} opts
 */
async function uploadImage({ buffer, filename, contentType, prefix = 'uploads' }) {
  if (!isObjectStorageConfigured()) {
    throw new Error('R2 storage not configured (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_BASE_URL)');
  }

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 128) || 'upload.jpg';
  const key = `${prefix}/${Date.now()}-${randomUUID()}-${safeName}`;

  const client = getS3Client();
  await client.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));

  const base = process.env.R2_PUBLIC_BASE_URL.replace(/\/$/, '');
  return `${base}/${key}`;
}

module.exports = { uploadImage, isObjectStorageConfigured };
