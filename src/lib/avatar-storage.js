'use strict';

/**
 * Private avatar object storage (R2 or local disk).
 * Keys are never exposed to clients — served via /api/avatars proxy only.
 */

const fs = require('fs/promises');
const path = require('path');
const { createReadStream } = require('fs');
const { randomUUID } = require('crypto');
const {
  isObjectStorageConfigured,
  usesLocalStorage,
  getLocalUploadDir,
  getR2S3Endpoint,
} = require('./object-storage');

const PRIVATE_PREFIX = 'avatars-private';

let s3Module = null;
function getS3Module() {
  if (!s3Module) {
    s3Module = require('@aws-sdk/client-s3');
  }
  return s3Module;
}

function getS3Client() {
  const endpoint = getR2S3Endpoint();
  if (!endpoint) throw new Error('R2 S3 endpoint not configured');
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

function sanitizeFilename(name) {
  const cleaned = String(name || 'avatar.jpg')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 128);
  return cleaned || 'avatar.jpg';
}

function buildAvatarStorageKey(familyId, memberType, memberId, filename) {
  const safe = sanitizeFilename(filename);
  return `${PRIVATE_PREFIX}/${familyId}/${memberType}/${memberId}/${Date.now()}-${randomUUID()}-${safe}`;
}

/**
 * Extract internal storage key from a legacy public avatar URL.
 * @param {string|null|undefined} url
 * @returns {string|null}
 */
function parseLegacyAvatarUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  let pathname = trimmed;
  try {
    const parsed = new URL(trimmed);
    pathname = parsed.pathname;
  } catch {
    if (!trimmed.startsWith('/')) return null;
    pathname = trimmed;
  }

  if (pathname.startsWith('/uploads/')) {
    return pathname.slice('/uploads/'.length);
  }
  const stripped = pathname.startsWith('/') ? pathname.slice(1) : pathname;
  if (stripped.startsWith(`${PRIVATE_PREFIX}/`) || stripped.startsWith('avatars/')) {
    return stripped;
  }
  return null;
}

function resolveLocalPath(storageKey) {
  const root = path.resolve(getLocalUploadDir());
  const fullPath = path.resolve(path.join(root, storageKey));
  if (fullPath !== root && !fullPath.startsWith(root + path.sep)) return null;
  return fullPath;
}

async function putPrivateObject({ storageKey, buffer, contentType }) {
  if (!isObjectStorageConfigured()) {
    throw new Error('Upload storage not configured');
  }

  if (usesLocalStorage()) {
    const fullPath = resolveLocalPath(storageKey);
    if (!fullPath) throw new Error('Invalid storage key');
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, buffer);
    return storageKey;
  }

  const { PutObjectCommand } = getS3Module();
  const client = getS3Client();
  await client.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: storageKey,
    Body: buffer,
    ContentType: contentType,
  }));
  return storageKey;
}

async function uploadPrivateAvatar({ buffer, contentType, filename, familyId, memberType, memberId }) {
  const storageKey = buildAvatarStorageKey(familyId, memberType, memberId, filename);
  await putPrivateObject({ storageKey, buffer, contentType });
  return storageKey;
}

async function deletePrivateObject(storageKey) {
  if (!storageKey) return;

  if (usesLocalStorage()) {
    const fullPath = resolveLocalPath(storageKey);
    if (!fullPath) return;
    try {
      await fs.unlink(fullPath);
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
    return;
  }

  const { DeleteObjectCommand } = getS3Module();
  const client = getS3Client();
  try {
    await client.send(new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: storageKey,
    }));
  } catch (err) {
    console.error('[AVATAR-STORAGE] delete error:', err.message);
  }
}

async function getPrivateObjectMeta(storageKey) {
  if (!storageKey) return null;

  if (usesLocalStorage()) {
    const fullPath = resolveLocalPath(storageKey);
    if (!fullPath) return null;
    try {
      const stat = await fs.stat(fullPath);
      const ext = path.extname(fullPath).toLowerCase();
      const contentType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
      return { contentType, size: stat.size, stream: () => createReadStream(fullPath) };
    } catch (err) {
      if (err.code === 'ENOENT') return null;
      throw err;
    }
  }

  const { GetObjectCommand } = getS3Module();
  const client = getS3Client();
  try {
    const out = await client.send(new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: storageKey,
    }));
    return {
      contentType: out.ContentType || 'image/jpeg',
      size: out.ContentLength,
      stream: () => out.Body,
    };
  } catch (err) {
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) return null;
    throw err;
  }
}

module.exports = {
  PRIVATE_PREFIX,
  buildAvatarStorageKey,
  parseLegacyAvatarUrl,
  uploadPrivateAvatar,
  deletePrivateObject,
  getPrivateObjectMeta,
  putPrivateObject,
  resolveLocalPath,
};
