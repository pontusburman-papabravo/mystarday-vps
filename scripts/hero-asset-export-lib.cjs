'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const HERO_EXPORTS = Object.freeze([
  ['hero-430.webp', 430],
  ['hero-860.webp', 860],
  ['hero.webp', 860],
]);

function slugToFilePrefix(slug) {
  return String(slug).trim().replace(/_/g, '-');
}

function resolveHeroMaster(root, slug, objectName) {
  const prefix = slugToFilePrefix(slug);
  const dir = path.join(root, 'scripts/sources');
  const candidates = [
    path.join(dir, prefix + '-hero-' + objectName + '.png'),
    path.join(dir, prefix + '-hero-' + objectName + '.webp'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error('No hero master: ' + prefix + '-hero-' + objectName + '.png');
}

async function exportHeroAsset(slug, objectName, options) {
  const root = (options && options.root) || path.join(__dirname, '..');
  const log = !options || options.log !== false;
  const masterPath = options && options.masterPath
    ? options.masterPath
    : resolveHeroMaster(root, slug, objectName);

  const outDir = path.join(root, 'public/images/child/world', slugToFilePrefix(slug));
  fs.mkdirSync(outDir, { recursive: true });

  const baseName = objectName.replace(/_/g, '-');
  const written = [];

  for (const [suffix, width] of HERO_EXPORTS) {
    const outName = baseName + '-' + suffix;
    const buffer = await sharp(masterPath)
      .rotate()
      .resize(width, null, { fit: 'inside', withoutEnlargement: false })
      .webp({ quality: 88, effort: 5 })
      .toBuffer();
    fs.writeFileSync(path.join(outDir, outName), buffer);
    written.push(outName);
    if (log) {
      const stat = fs.statSync(path.join(outDir, outName));
      console.log('wrote', path.join('public/images/child/world', slugToFilePrefix(slug), outName),
        width + 'w', Math.round(stat.size / 1024) + 'KB');
    }
  }

  return { files: written, masterPath };
}

module.exports = {
  HERO_EXPORTS,
  slugToFilePrefix,
  resolveHeroMaster,
  exportHeroAsset,
};
