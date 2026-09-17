'use strict';

const fs = require('fs');
const path = require('path');
const { designKitIconName } = require('../../config/pictogram-library');

const SVG_DIR = path.join(
  __dirname,
  '../../public/assets/min-stjarndag-design-kit/icons/svg/light',
);

const pngCache = new Map();
let sharpImpl = null;

function sharp() {
  if (!sharpImpl) sharpImpl = require('sharp');
  return sharpImpl;
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
  const full = path.join(
    __dirname,
    '../../public/assets/min-stjarndag-design-kit/icons/svg/light',
    `${name}.svg`,
  );
  return fs.existsSync(full) ? relative : null;
}

function getIconPng(key) {
  return pngCache.get(key) || null;
}

async function preloadResurserIcons(keys) {
  const unique = [...new Set(keys.filter(Boolean))];
  await Promise.all(unique.map(async (key) => {
    if (pngCache.has(key)) return;
    const svgPath = svgPathForKey(key);
    if (!svgPath) return;
    const png = await sharp()(svgPath)
      .resize(192, 192, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .flatten({ background: '#ffffff' })
      .png()
      .toBuffer();
    pngCache.set(key, png);
  }));
  return pngCache;
}

module.exports = {
  svgPathForKey,
  publicSvgPathForKey,
  getIconPng,
  preloadResurserIcons,
};
