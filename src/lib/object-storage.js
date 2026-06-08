/**
 * Image upload storage — Cloudflare R2 (S3) or local disk on VPS.
 * Uses R2 when R2_* env vars are set; otherwise writes to UPLOAD_LOCAL_DIR.
 */
const fs = require('fs/promises');
const path = require('path');
const { randomUUID } = require('crypto');

let s3Module = null;
function getS3Module() {
  if (!s3Module) {
    // Lazy load — VPS without R2 does not need @aws-sdk/client-s3 at runtime for local uploads.
    s3Module = require('@aws-sdk/client-s3');
  }
  return s3Module;
}

function getR2S3Endpoint() {
  if (process.env.R2_S3_ENDPOINT) {
    let endpoint = process.env.R2_S3_ENDPOINT.replace(/\/$/, '');
    // Cloudflare UI shows …cloudflarestorage.com/bucket — strip bucket suffix if pasted
    const bucket = process.env.R2_BUCKET_NAME;
    if (bucket && endpoint.endsWith(`/${bucket}`)) {
      endpoint = endpoint.slice(0, -(bucket.length + 1));
    }
    return endpoint;
  }
  const accountId = process.env.R2_ACCOUNT_ID;
  if (!accountId) return null;
  // EU buckets use *.eu.r2.cloudflarestorage.com (set R2_JURISDICTION=eu)
  const host = process.env.R2_JURISDICTION === 'eu'
    ? `${accountId}.eu.r2.cloudflarestorage.com`
    : `${accountId}.r2.cloudflarestorage.com`;
  return `https://${host}`;
}

/** R2_PUBLIC_BASE_URL must be a browser-visible URL (r2.dev or custom domain), not the S3 API. */
function validateR2PublicBaseUrl() {
  const url = process.env.R2_PUBLIC_BASE_URL || '';
  if (/cloudflarestorage\.com/i.test(url)) {
    throw new Error(
      'R2_PUBLIC_BASE_URL must not be the S3 API URL (cloudflarestorage.com). '
      + 'Use R2_S3_ENDPOINT for upload and enable Public access on the bucket for R2_PUBLIC_BASE_URL '
      + '(e.g. https://pub-xxxxx.r2.dev or https://cdn.mystarday.se).'
    );
  }
}

function isR2Configured() {
  const hasEndpoint = !!(process.env.R2_S3_ENDPOINT || process.env.R2_ACCOUNT_ID);
  return !!(
    hasEndpoint &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME &&
    process.env.R2_PUBLIC_BASE_URL
  );
}

function getLocalUploadDir() {
  const configured = process.env.UPLOAD_LOCAL_DIR;
  if (configured) return path.resolve(configured);
  return path.join(__dirname, '../../data/uploads');
}

/** True when uploads work — R2 configured, or local disk fallback. */
function isObjectStorageConfigured() {
  if (process.env.UPLOAD_STORAGE === 'r2') return isR2Configured();
  if (process.env.UPLOAD_STORAGE === 'local') return true;
  return isR2Configured() || true; // local fallback when R2 absent
}

function usesLocalStorage() {
  if (process.env.UPLOAD_STORAGE === 'r2') return false;
  if (process.env.UPLOAD_STORAGE === 'local') return true;
  return !isR2Configured();
}

function getS3Client() {
  const endpoint = getR2S3Endpoint();
  if (!endpoint) throw new Error('R2 S3 endpoint not configured (R2_S3_ENDPOINT or R2_ACCOUNT_ID)');
  const { S3Client } = getS3Module();
  return new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
}

function buildObjectKey(filename, prefix) {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 128) || 'upload.jpg';
  return `${prefix}/${Date.now()}-${randomUUID()}-${safeName}`;
}

async function uploadToR2({ buffer, filename, contentType, prefix }) {
  validateR2PublicBaseUrl();
  const { PutObjectCommand } = getS3Module();
  const key = buildObjectKey(filename, prefix);
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

async function uploadToLocal({ buffer, filename, prefix }) {
  const key = buildObjectKey(filename, prefix);
  const root = getLocalUploadDir();
  const fullPath = path.join(root, key);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, buffer);

  const base = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  return `${base}/uploads/${key}`;
}

/**
 * Upload image buffer; returns public HTTPS URL.
 * @param {{ buffer: Buffer, filename: string, contentType: string, prefix?: string }} opts
 */
async function uploadImage({ buffer, filename, contentType, prefix = 'uploads' }) {
  if (!isObjectStorageConfigured()) {
    throw new Error('Upload storage not configured');
  }
  if (usesLocalStorage()) {
    return uploadToLocal({ buffer, filename, contentType, prefix });
  }
  return uploadToR2({ buffer, filename, contentType, prefix });
}

module.exports = {
  uploadImage,
  isObjectStorageConfigured,
  isR2Configured,
  usesLocalStorage,
  getLocalUploadDir,
  getR2S3Endpoint,
  validateR2PublicBaseUrl,
};
