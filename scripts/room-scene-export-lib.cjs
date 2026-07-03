'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

/** Catalog room.id values from docs/world/data/*.yaml (garden excluded). */
const ROOM_SLUGS = Object.freeze([
  'home',
  'hall',
  'bedroom',
  'kitchen',
  'bathroom',
  'attic',
  'workshop',
  'museum',
  'pet_house',
  'trophy_room',
  'reading_corner',
  'forest',
  'lake',
]);

/** Rooms with scene-master-high.png in scripts/sources/ (museum pending art). */
const EXPORTABLE_SLUGS = Object.freeze(
  ROOM_SLUGS.filter(function (slug) {
    return slug !== 'museum';
  })
);

/** Mobile scene aspect ratio (860×1859) — matches garden shipped set. */
const TARGET_RATIO = 860 / 1859;
const MOBILE_BUDGET_BYTES = 2 * 1024 * 1024;

function heightForWidth(width) {
  return Math.round((width * 1859) / 860);
}

const SCENE_EXPORTS = Object.freeze([
  ['scene-bg-430.webp', 430, heightForWidth(430)],
  ['scene-bg-860.webp', 860, heightForWidth(860)],
  ['scene-bg.webp', 860, heightForWidth(860)],
  ['scene-bg-1280.webp', 1280, heightForWidth(1280)],
]);

const SCENE_FILE_NAMES = Object.freeze(SCENE_EXPORTS.map(function (entry) {
  return entry[0];
}));

/** File prefix: pet_house → pet-house */
function slugToFilePrefix(slug) {
  return String(slug).trim().replace(/_/g, '-');
}

function outDirForSlug(root, slug) {
  return path.join(root, 'public/images/child/world', slugToFilePrefix(slug));
}

function sourceCandidatesForSlug(root, slug) {
  const prefix = slugToFilePrefix(slug);
  const dir = path.join(root, 'scripts/sources');
  return [
    path.join(dir, prefix + '-scene-master-high.png'),
    path.join(dir, prefix + '-scene-master-portrait.png'),
    path.join(dir, prefix + '-scene-master.png'),
    path.join(dir, prefix + '-scene-master.jpg'),
    path.join(dir, prefix + '-scene-master.webp'),
    path.join(dir, prefix + '-scene-master-broad.png'),
    path.join(dir, prefix + '-scene-master-landscape.png'),
  ];
}

function resolveMaster(root, slug, argvPath) {
  if (argvPath) {
    const abs = path.isAbsolute(argvPath) ? argvPath : path.join(process.cwd(), argvPath);
    if (!fs.existsSync(abs)) {
      throw new Error('Master file not found: ' + abs);
    }
    return abs;
  }
  for (const candidate of sourceCandidatesForSlug(root, slug)) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(
    'No master found for "' + slug + '". Upload scripts/sources/' +
      slugToFilePrefix(slug) + '-scene-master-high.png (portrait ~9:16).'
  );
}

/** Portrait-first: center-crop landscape masters to mobile aspect. */
async function portraitBase(masterPath) {
  const rotated = sharp(masterPath).rotate();
  const meta = await rotated.metadata();
  const ratio = meta.width / meta.height;

  if (ratio <= TARGET_RATIO * 1.02) {
    return { pipeline: rotated, cropped: false };
  }

  const cropH = meta.height;
  const cropW = Math.min(meta.width, Math.round(cropH * TARGET_RATIO));
  const left = Math.round((meta.width - cropW) / 2);
  return {
    pipeline: rotated.extract({ left, top: 0, width: cropW, height: cropH }),
    cropped: true,
    cropW,
    cropH,
  };
}

function logFile(root, outPath, width, height) {
  const stat = fs.statSync(outPath);
  console.log(
    'wrote',
    path.relative(root, outPath),
    width + '×' + height,
    Math.round(stat.size / 1024) + 'KB'
  );
}

/**
 * @param {string} slug
 * @param {string} masterPath
 * @param {{ root?: string, log?: boolean }} [options]
 * @returns {Promise<{ totalBytes: number, files: string[] }>}
 */
async function exportRoomScene(slug, masterPath, options) {
  const root = (options && options.root) || path.join(__dirname, '..');
  const log = !options || options.log !== false;
  const outDir = outDirForSlug(root, slug);

  const meta = await sharp(masterPath).metadata();
  if (log) {
    console.log(
      'Using master:',
      path.relative(root, masterPath),
      meta.width + '×' + meta.height,
      meta.format
    );
  }

  const portrait = await portraitBase(masterPath);
  if (log && portrait.cropped) {
    console.log('Landscape master — center crop to portrait', portrait.cropW + '×' + portrait.cropH);
  }

  fs.mkdirSync(outDir, { recursive: true });

  const written = [];
  for (const [name, w, h] of SCENE_EXPORTS) {
    const buffer = await portrait.pipeline
      .clone()
      .resize(w, h, { fit: 'cover', position: 'centre' })
      .webp({ quality: 90, effort: 5 })
      .toBuffer();

    const outPath = path.join(outDir, name);
    fs.writeFileSync(outPath, buffer);
    written.push(name);
    if (log) logFile(root, outPath, w, h);
  }

  let total = 0;
  for (const name of written) {
    total += fs.statSync(path.join(outDir, name)).size;
  }
  if (log) {
    const mb = (total / (1024 * 1024)).toFixed(2);
    console.log('Scene set total: ' + mb + ' MB (mobile budget < 2 MB)');
    if (total >= MOBILE_BUDGET_BYTES) {
      console.warn('WARN: scene assets exceed 2 MB mobile budget');
    }
  }

  return { totalBytes: total, files: written };
}

function parseArgv(argv) {
  const args = argv.slice(2);
  const all = args.includes('--all');
  const masterIdx = args.indexOf('--master');
  let masterPath;
  if (masterIdx !== -1) {
    masterPath = args[masterIdx + 1];
    if (!masterPath) throw new Error('--master requires a file path');
  }
  const slugs = args.filter(function (a) {
    return a !== '--all' && a !== '--master' && a !== masterPath;
  });
  return { all, slugs, masterPath };
}

async function exportAllRooms(root, options) {
  const results = [];
  for (const slug of EXPORTABLE_SLUGS) {
    try {
      const master = resolveMaster(root, slug);
      if (options && options.log !== false) console.log('\n=== ' + slug + ' ===');
      const result = await exportRoomScene(slug, master, { root, log: options && options.log });
      results.push({ slug, ok: true, ...result });
    } catch (err) {
      if (options && options.log !== false) console.warn('SKIP', slug + ':', err.message);
      results.push({ slug, ok: false, error: err.message });
    }
  }
  return results;
}

function sceneSetTotalBytes(root, slug) {
  const dir = outDirForSlug(root, slug);
  let total = 0;
  for (const name of SCENE_FILE_NAMES) {
    const full = path.join(dir, name);
    if (!fs.existsSync(full)) return null;
    total += fs.statSync(full).size;
  }
  return total;
}

module.exports = {
  ROOM_SLUGS,
  EXPORTABLE_SLUGS,
  SCENE_EXPORTS,
  SCENE_FILE_NAMES,
  MOBILE_BUDGET_BYTES,
  TARGET_RATIO,
  heightForWidth,
  slugToFilePrefix,
  outDirForSlug,
  sourceCandidatesForSlug,
  resolveMaster,
  portraitBase,
  exportRoomScene,
  exportAllRooms,
  parseArgv,
  sceneSetTotalBytes,
};
