'use strict';

/**
 * Printable resource icons.
 * Prefer the same illustrated pictograms the child app uses (simple pack),
 * then fall back to design-kit SVGs for keys the app pack does not cover
 * (emotions, TEACCH tokens).
 */

const fs = require('fs');
const path = require('path');
const { designKitIconName } = require('../../config/pictogram-library');
const { resolveActivityAsset } = require('../../config/child-pictogram-packs');

const PUBLIC_ROOT = path.join(__dirname, '../../public');
const SVG_DIR = path.join(PUBLIC_ROOT, 'assets/min-stjarndag-design-kit/icons/svg/light');

const pngCache = new Map();
let sharpImpl = null;

function sharp() {
  if (!sharpImpl) sharpImpl = require('sharp');
  return sharpImpl;
}

function diskFromPublicUrl(url) {
  if (!url) return null;
  const full = path.join(PUBLIC_ROOT, String(url).replace(/^\//, ''));
  return fs.existsSync(full) ? full : null;
}

function childPictogramUrl(key) {
  return resolveActivityAsset(key, 'simple') || null;
}

function svgPathForKey(key) {
  const name = designKitIconName(key);
  if (!name) return null;
  const full = path.join(SVG_DIR, `${name}.svg`);
  return fs.existsSync(full) ? full : null;
}

function publicSvgPathForKey(key) {
  const name = designKitIconName(key);
  if (!name) return null;
  const relative = `/assets/min-stjarndag-design-kit/icons/svg/light/${name}.svg`;
  return fs.existsSync(path.join(SVG_DIR, `${name}.svg`)) ? relative : null;
}

function iconSourceForKey(key) {
  const childUrl = childPictogramUrl(key);
  const childDisk = diskFromPublicUrl(childUrl);
  if (childDisk) {
    return { kind: 'app', url: childUrl, disk: childDisk };
  }
  const kitUrl = publicSvgPathForKey(key);
  const kitDisk = svgPathForKey(key);
  if (kitDisk) {
    return { kind: 'kit', url: kitUrl, disk: kitDisk };
  }
  return null;
}

function publicIconPathForKey(key) {
  const source = iconSourceForKey(key);
  return source ? source.url : null;
}

function getIconPng(key) {
  return pngCache.get(key) || null;
}

async function rasterizeIcon(diskPath) {
  return sharp()(diskPath)
    .resize(192, 192, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: '#ffffff' })
    .png()
    .toBuffer();
}

async function preloadResurserIcons(keys) {
  const unique = [...new Set(keys.filter(Boolean))];
  await Promise.all(unique.map(async (key) => {
    if (pngCache.has(key)) return;
    const source = iconSourceForKey(key);
    if (!source) return;
    pngCache.set(key, await rasterizeIcon(source.disk));
  }));
  return pngCache;
}

module.exports = {
  svgPathForKey,
  publicSvgPathForKey,
  publicIconPathForKey,
  iconSourceForKey,
  getIconPng,
  preloadResurserIcons,
};
