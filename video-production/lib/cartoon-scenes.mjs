import fs from 'node:fs';
import path from 'node:path';
import { runFfmpeg } from './ffmpeg.mjs';

/** Nordic summer palette — flat children's-book illustration. */
const PAL = {
  cream: '0xFFF6E8',
  sky: '0xB8D4E8',
  floor: '0xD4A574',
  wall: '0xF5E6D3',
  momShirt: '0x3D8B8B',
  momHair: '0x5C4033',
  momSkin: '0xFFDBB5',
  ellaPj: '0xFFD966',
  ellaHair: '0x8B5A2B',
  ellaSkin: '0xFFE0BD',
  toddlerBlue: '0x6FA8DC',
  phone: '0x2C2C2C',
  door: '0xFFFFFF',
  garden: '0x7CB342',
  sink: '0xE8E8E8',
};

function esc(text) {
  return text.replace(/:/g, '\\:').replace(/'/g, "\\'");
}

function circle(cx, cy, r, color) {
  const [r8, g8, b8] = [
    parseInt(color.slice(2, 4), 16),
    parseInt(color.slice(4, 6), 16),
    parseInt(color.slice(6, 8), 16),
  ];
  const dist = `sqrt(pow(X-${cx},2)+pow(Y-${cy},2))`;
  return `geq=r='if(lt(${dist},${r}),${r8},p(X,Y))':g='if(lt(${dist},${r}),${g8},p(X,Y))':b='if(lt(${dist},${r}),${b8},p(X,Y))'`;
}

function rect(x, y, w, h, color) {
  return `drawbox=x=${x}:y=${y}:w=${w}:h=${h}:color=${color}:t=fill`;
}

function head(cx, cy, r, skin) {
  return circle(cx, cy, r, skin);
}

function eye(cx, cy) {
  return [
    rect(cx - 8, cy - 4, 6, 8, '0x2C2C2C'),
    rect(cx + 2, cy - 4, 6, 8, '0x2C2C2C'),
  ].join(',');
}

function smile(cx, cy) {
  return `drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text=')':fontsize=28:fontcolor=0x2C2C2C:x=${cx - 14}:y=${cy + 8}`;
}

function frown(cx, cy) {
  return `drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='(':fontsize=28:fontcolor=0x2C2C2C:x=${cx - 14}:y=${cy + 18}`;
}

function window(x, y, w, h) {
  return [
    rect(x, y, w, h, PAL.sky),
    rect(x + 8, y + 8, w - 16, h - 16, '0xFFFDE7'),
    `drawbox=x=${x}:y=${y}:w=${w}:h=${h}:color=0x8D6E63:t=4`,
  ].join(',');
}

function momFigure(x, y, scale = 1, expression = 'neutral') {
  const s = scale;
  const headY = y + Math.round(30 * s);
  const filters = [
    rect(x, y + Math.round(90 * s), Math.round(70 * s), Math.round(110 * s), PAL.momShirt),
    rect(x + Math.round(10 * s), y + Math.round(20 * s), Math.round(50 * s), Math.round(40 * s), PAL.momHair),
    head(x + Math.round(35 * s), headY, Math.round(38 * s), PAL.momSkin),
    eye(x + Math.round(35 * s), headY),
  ];
  if (expression === 'stressed') filters.push(frown(x + Math.round(35 * s), headY));
  if (expression === 'smile' || expression === 'relief') filters.push(smile(x + Math.round(35 * s), headY));
  return filters.join(',');
}

function ellaFigure(x, y, scale = 1, pose = 'sit', expression = 'neutral') {
  const s = scale;
  const headY = y + Math.round(22 * s);
  const filters = [
    rect(x, y + Math.round(55 * s), Math.round(55 * s), Math.round(70 * s), PAL.ellaPj),
    rect(x + Math.round(5 * s), y + Math.round(8 * s), Math.round(22 * s), Math.round(28 * s), PAL.ellaHair),
    rect(x + Math.round(28 * s), y + Math.round(8 * s), Math.round(22 * s), Math.round(28 * s), PAL.ellaHair),
    head(x + Math.round(28 * s), headY, Math.round(32 * s), PAL.ellaSkin),
    eye(x + Math.round(28 * s), headY),
  ];
  if (pose === 'sit') {
    filters.push(rect(x - Math.round(10 * s), y + Math.round(100 * s), Math.round(75 * s), Math.round(18 * s), '0xE57373'));
  }
  if (expression === 'happy') filters.push(smile(x + Math.round(28 * s), headY));
  if (expression === 'upset') filters.push(frown(x + Math.round(28 * s), headY));
  return filters.join(',');
}

function toddlerFigure(x, y) {
  return [
    rect(x, y + 40, 40, 50, PAL.toddlerBlue),
    head(x + 20, y + 22, 24, PAL.ellaSkin),
    eye(x + 20, y + 22),
    frown(x + 20, y + 22),
  ].join(',');
}

function phone(x, y) {
  return [
    rect(x, y, 90, 160, PAL.phone),
    rect(x + 8, y + 12, 74, 120, '0xE8F5E9'),
    `drawbox=x=${x}:y=${y}:w=90:h=160:color=0x555555:t=3`,
  ].join(',');
}

function hallwayBase() {
  return [
    rect(0, 0, 1920, 680, PAL.wall),
    rect(0, 680, 1920, 400, PAL.floor),
    window(1400, 120, 320, 280),
    `drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='07\\:52':fontsize=36:fontcolor=0x333333:x=200:y=140`,
    `drawbox=x=180:y=120:w=120:h=60:color=0x8D6E63:t=4`,
  ].join(',');
}

const SCENE_FILTERS = {
  'chaos-summer': () => [
    hallwayBase(),
    rect(300, 720, 80, 40, '0x795548'),
    rect(420, 750, 60, 25, '0x795548'),
    ellaFigure(520, 740, 1.3, 'sit', 'upset'),
    momFigure(900, 620, 1.2, 'stressed'),
    toddlerFigure(1150, 760),
    rect(150, 400, 200, 80, '0xFFCC80'),
  ].join(','),

  'together-phone': () => [
    hallwayBase(),
    ellaFigure(680, 780, 1.1, 'sit', 'neutral'),
    momFigure(980, 780, 1.1, 'smile'),
    phone(860, 820),
  ].join(','),

  'brush-teeth': () => [
    rect(0, 0, 1920, 1080, '0xE3F2FD'),
    rect(400, 200, 800, 600, PAL.wall),
    rect(500, 450, 300, 120, PAL.sink),
    rect(520, 380, 80, 80, '0xB0BEC5'),
    ellaFigure(620, 420, 1.2, 'stand', 'neutral'),
    momFigure(1300, 380, 0.9, 'smile'),
  ].join(','),

  'whats-next': () => [
    rect(0, 0, 1920, 1080, PAL.cream),
    ellaFigure(520, 380, 1.8, 'sit', 'neutral'),
    momFigure(1050, 380, 1.8, 'smile'),
    phone(820, 700),
  ].join(','),

  'pack-bag': () => [
    hallwayBase(),
    rect(700, 700, 120, 140, '0x5D4037'),
    `drawbox=x=700:y=700:w=120:h=140:color=0x3E2723:t=4`,
    ellaFigure(820, 680, 1.2, 'stand', 'neutral'),
  ].join(','),

  'friday-movie-pride': () => [
    rect(0, 0, 1920, 1080, '0xFFF9C4'),
    ellaFigure(760, 320, 2.2, 'stand', 'happy'),
  ].join(','),

  'ella-exit': () => [
    rect(0, 0, 1200, 1080, PAL.wall),
    rect(1200, 0, 720, 1080, PAL.garden),
    rect(900, 200, 280, 700, PAL.door),
    rect(1050, 350, 100, 500, PAL.sky),
    ellaFigure(950, 700, 1.1, 'stand', 'happy'),
    momFigure(600, 650, 0.8, 'smile'),
  ].join(','),

  'sara-doorway-relief': () => [
    rect(0, 0, 1920, 1080, PAL.sky),
    rect(0, 400, 1920, 680, PAL.garden),
    rect(700, 150, 350, 750, PAL.wall),
    rect(900, 300, 120, 500, PAL.sky),
    momFigure(820, 280, 1.4, 'relief'),
  ].join(','),
};

function buildZoompan(duration, motion = 'slow-in') {
  const frames = Math.max(1, Math.round(duration * 30));
  if (motion === 'pan-right') {
    return `zoompan=z='1.05':x='min(iw/2-(iw/zoom/2)+on*0.4,iw-iw/zoom)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1920x1080:fps=30`;
  }
  return `zoompan=z='min(1.02+0.0005*on,1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1920x1080:fps=30`;
}

/**
 * Render a flat 2D cartoon illustration clip for a story scene.
 */
export function generateCartoonScene(scene, outputPath, duration, {
  width = 1920,
  height = 1080,
  motion = 'slow-in',
} = {}) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const builder = SCENE_FILTERS[scene.id];
  if (!builder) {
    throw new Error(`No cartoon preset for scene "${scene.id}"`);
  }

  const illustration = builder();
  const zoom = buildZoompan(duration, scene.id === 'chaos-summer' ? 'pan-right' : motion);

  const vf = [
    illustration,
    'eq=saturation=1.15:contrast=1.05',
    zoom,
  ].join(',');

  runFfmpeg([
    '-y',
    '-f', 'lavfi',
    '-i', `color=c=${PAL.cream}:s=${width}x${height}:r=30:d=${duration}`,
    '-vf', vf,
    '-t', String(duration),
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-preset', 'medium',
    '-crf', '18',
    outputPath,
  ], { label: `cartoon ${scene.id}` });
}

export function isCartoonScene(scene, manifest) {
  if (!scene.cartoonScene) return false;
  // cartoonScene=true means local ffmpeg illustration (legacy/fallback only)
  return scene.cartoonScene === true;
}
