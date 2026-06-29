'use strict';

/**
 * Bygg-loop progression — milstolpar, scener, guider, belöningar.
 * Delas av API + tester; public/js/build-progress.js speglar för UI.
 */

const { BUILD_PARTS_REQUIRED } = require('./build-adventures');

const BUILD_MILESTONES = [15, 30, 45, 60, 75];

const WORLD_MAP = [
  { slug: 'racerbil', world_slug: 'garage', icon: '🏎️', label: 'Garaget', href: '/child/garage' },
  { slug: 'husdjur', world_slug: 'pet_home', icon: '🐾', label: 'Husdjurshemmet', href: '/child/pet-home' },
  { slug: 'dinosaurie', world_slug: 'dino_lab', icon: '🦕', label: 'Dino-dalen', href: '/child/play/dinosaurie' },
  { slug: 'dockhus', world_slug: 'dollhouse', icon: '🏠', label: 'Dockhuset', href: '/child/play/dockhus' },
  { slug: 'fiske', world_slug: 'fishing_dock', icon: '🎣', label: 'Båtkajen', href: '/child/play/fiske' },
  { slug: 'laxor', world_slug: 'study_room', icon: '📚', label: 'Läxbordet', href: '/child/play/laxor' },
  { slug: 'vardag', world_slug: 'routine_home', icon: '⭐', label: 'Mitt rum', href: '/child/play/vardag' },
];

const DEFAULT_STAGES = [
  { min: 0, key: 'empty', label: 'Början' },
  { min: 10, key: 'start', label: 'Första biten' },
  { min: 25, key: 'growing', label: 'Växer' },
  { min: 40, key: 'half', label: 'Halvvägs' },
  { min: 55, key: 'almost', label: 'Nästan klart' },
  { min: 70, key: 'finishing', label: 'Sista biten' },
  { min: 75, key: 'done', label: 'Klart!' },
];

const ADVENTURE_PROGRESS = {
  racerbil: {
    guideName: 'Meckis',
    guideEmoji: '🔧',
    buildNoun: 'garaget',
    sceneClass: 'cbh-scene--garage',
    stages: [
      { min: 0, key: 'empty', label: 'Tom tomt' },
      { min: 10, key: 'foundation', label: 'Grund' },
      { min: 20, key: 'walls', label: 'Väggar' },
      { min: 35, key: 'roof', label: 'Tak' },
      { min: 50, key: 'door', label: 'Port' },
      { min: 65, key: 'tools', label: 'Verktyg' },
      { min: 75, key: 'done', label: 'Garaget!' },
    ],
    milestones: {
      15: { label: 'Ny färg', icon: '🎨', perk: 'color_ocean_blue' },
      30: { label: 'Stjärndekal', icon: '⭐', perk: 'decal_stars' },
      45: { label: 'Sportdäck', icon: '🛞', perk: 'wheels_sport' },
      60: { label: 'Turbo-ljud', icon: '🔊', perk: 'honk_boost' },
      75: { label: 'Hela garaget', icon: '🏎️', perk: 'world_unlock' },
    },
  },
  husdjur: {
    guideName: 'Bella',
    guideEmoji: '🐶',
    buildNoun: 'husdjurshemmet',
    sceneClass: 'cbh-scene--pets',
    stages: [
      { min: 0, key: 'empty', label: 'Tom hage' },
      { min: 12, key: 'fence', label: 'Staket' },
      { min: 25, key: 'house', label: 'Hundkoja' },
      { min: 40, key: 'bowl', label: 'Matplats' },
      { min: 55, key: 'toys', label: 'Leksaker' },
      { min: 70, key: 'garden', label: 'Lekplats' },
      { min: 75, key: 'done', label: 'Hemmet!' },
    ],
    milestones: {
      15: { label: 'Valpstickers', icon: '🐶', perk: 'pet_puppy' },
      30: { label: 'Borste', icon: '🪮', perk: 'pet_brush' },
      45: { label: 'Matkopp', icon: '🥣', perk: 'pet_bowl' },
      60: { label: 'Koppel', icon: '🦮', perk: 'pet_leash' },
      75: { label: 'Husdjurshemmet', icon: '🐾', perk: 'world_unlock' },
    },
  },
  dinosaurie: {
    guideName: 'Professorn',
    guideEmoji: '🦴',
    buildNoun: 'dino-dalen',
    sceneClass: 'cbh-scene--dino',
    stages: [
      { min: 0, key: 'empty', label: 'Tom dal' },
      { min: 12, key: 'dig', label: 'Grävplats' },
      { min: 25, key: 'bones', label: 'Ben' },
      { min: 40, key: 'skeleton', label: 'Skelett' },
      { min: 55, key: 'sign', label: 'Skylt' },
      { min: 70, key: 'museum', label: 'Museum' },
      { min: 75, key: 'done', label: 'Dino-dalen!' },
    ],
    milestones: {
      15: { label: 'Fossil', icon: '🪨', perk: 'dino_fossil' },
      30: { label: 'Borste', icon: '🖌️', perk: 'dino_brush' },
      45: { label: 'T-rex ben', icon: '🦴', perk: 'dino_bone' },
      60: { label: 'Faktaskylt', icon: '📋', perk: 'dino_sign' },
      75: { label: 'Dino-dalen', icon: '🦕', perk: 'world_unlock' },
    },
  },
  dockhus: {
    guideName: 'Lilla Lisa',
    guideEmoji: '🪆',
    buildNoun: 'dockhuset',
    sceneClass: 'cbh-scene--doll',
    stages: [
      { min: 0, key: 'empty', label: 'Tom plätt' },
      { min: 12, key: 'floor', label: 'Golv' },
      { min: 25, key: 'walls', label: 'Väggar' },
      { min: 40, key: 'rooms', label: 'Rum' },
      { min: 55, key: 'furniture', label: 'Möbler' },
      { min: 70, key: 'decor', label: 'Inredning' },
      { min: 75, key: 'done', label: 'Dockhuset!' },
    ],
    milestones: {
      15: { label: 'Soffa', icon: '🛋️', perk: 'doll_sofa' },
      30: { label: 'Säng', icon: '🛏️', perk: 'doll_bed' },
      45: { label: 'Kök', icon: '🍳', perk: 'doll_kitchen' },
      60: { label: 'Docka', icon: '🪆', perk: 'doll_friend' },
      75: { label: 'Dockhuset', icon: '🏠', perk: 'world_unlock' },
    },
  },
  fiske: {
    guideName: 'Kaptenen',
    guideEmoji: '⚓',
    buildNoun: 'båtkajen',
    sceneClass: 'cbh-scene--fish',
    stages: [
      { min: 0, key: 'empty', label: 'Tom strand' },
      { min: 12, key: 'dock', label: 'Brygga' },
      { min: 25, key: 'boat', label: 'Båt' },
      { min: 40, key: 'rod', label: 'Fiskespö' },
      { min: 55, key: 'net', label: 'Hammock' },
      { min: 70, key: 'fish', label: 'Fiskar' },
      { min: 75, key: 'done', label: 'Båtkajen!' },
    ],
    milestones: {
      15: { label: 'Bete', icon: '🪱', perk: 'fish_bait' },
      30: { label: 'Hatt', icon: '🧢', perk: 'fish_hat' },
      45: { label: 'Större båt', icon: '⛵', perk: 'fish_boat' },
      60: { label: 'Guldfisk', icon: '🐠', perk: 'fish_gold' },
      75: { label: 'Båtkajen', icon: '🎣', perk: 'world_unlock' },
    },
  },
  laxor: {
    guideName: 'Lärar-Owl',
    guideEmoji: '🦉',
    buildNoun: 'läxbordet',
    sceneClass: 'cbh-scene--study',
    stages: [
      { min: 0, key: 'empty', label: 'Tomt bord' },
      { min: 12, key: 'desk', label: 'Bord' },
      { min: 25, key: 'books', label: 'Böcker' },
      { min: 40, key: 'pencils', label: 'Pennor' },
      { min: 55, key: 'board', label: 'Tavla' },
      { min: 70, key: 'stars', label: 'Guldstjärnor' },
      { min: 75, key: 'done', label: 'Läxbordet!' },
    ],
    milestones: {
      15: { label: 'Alfabetet', icon: '🔤', perk: 'study_abc' },
      30: { label: 'Räknesticka', icon: '🔢', perk: 'study_math' },
      45: { label: 'Bok', icon: '📖', perk: 'study_book' },
      60: { label: 'Guldpenna', icon: '✏️', perk: 'study_pen' },
      75: { label: 'Läxbordet', icon: '📚', perk: 'world_unlock' },
    },
  },
  vardag: {
    guideName: 'Stjärnan',
    guideEmoji: '⭐',
    buildNoun: 'mitt rum',
    sceneClass: 'cbh-scene--room',
    stages: [
      { min: 0, key: 'empty', label: 'Tomt rum' },
      { min: 12, key: 'bed', label: 'Säng' },
      { min: 25, key: 'clothes', label: 'Garderob' },
      { min: 40, key: 'tooth', label: 'Tandborste' },
      { min: 55, key: 'table', label: 'Frukostbord' },
      { min: 70, key: 'stars', label: 'Stjärnvägg' },
      { min: 75, key: 'done', label: 'Mitt rum!' },
    ],
    milestones: {
      15: { label: 'Kudde', icon: '🛏️', perk: 'room_pillow' },
      30: { label: 'Tandmugg', icon: '🪥', perk: 'room_tooth' },
      45: { label: 'Frukost', icon: '🥣', perk: 'room_breakfast' },
      60: { label: 'Nattlampa', icon: '💡', perk: 'room_lamp' },
      75: { label: 'Mitt rum', icon: '⭐', perk: 'world_unlock' },
    },
  },
};

function adventureMeta(slug) {
  return ADVENTURE_PROGRESS[slug] || {
    guideName: 'Kompisen',
    guideEmoji: '🧩',
    buildNoun: 'din värld',
    sceneClass: 'cbh-scene--generic',
    stages: DEFAULT_STAGES,
    milestones: {
      15: { label: 'Delmål', icon: '🎁', perk: 'milestone_15' },
      30: { label: 'Delmål', icon: '🎁', perk: 'milestone_30' },
      45: { label: 'Delmål', icon: '🎁', perk: 'milestone_45' },
      60: { label: 'Delmål', icon: '🎁', perk: 'milestone_60' },
      75: { label: 'Världen', icon: '🌟', perk: 'world_unlock' },
    },
  };
}

function getStageForParts(slug, partsCollected) {
  const meta = adventureMeta(slug);
  const stages = meta.stages || DEFAULT_STAGES;
  let current = stages[0];
  for (let i = 0; i < stages.length; i++) {
    if (partsCollected >= stages[i].min) current = stages[i];
  }
  return current;
}

function nextMilestone(partsCollected) {
  for (let i = 0; i < BUILD_MILESTONES.length; i++) {
    if (partsCollected < BUILD_MILESTONES[i]) return BUILD_MILESTONES[i];
  }
  return null;
}

function milestoneCrossed(prevCount, newCount) {
  for (let i = 0; i < BUILD_MILESTONES.length; i++) {
    const m = BUILD_MILESTONES[i];
    if (prevCount < m && newCount >= m) return m;
  }
  return null;
}

function milestoneReward(slug, milestoneAt) {
  const meta = adventureMeta(slug);
  return meta.milestones[milestoneAt] || { label: 'Delmål', icon: '🎁', perk: 'milestone_' + milestoneAt };
}

function listMilestones(slug, partsCollected) {
  const meta = adventureMeta(slug);
  return BUILD_MILESTONES.map(function (at) {
    return {
      at: at,
      reached: partsCollected >= at,
      reward: meta.milestones[at] || { label: 'Delmål', icon: '🎁' },
    };
  });
}

function routineLine(slug, unlockLabel) {
  const meta = adventureMeta(slug);
  const target = unlockLabel || meta.buildNoun;
  return 'Varje uppdrag du gör hjälper dig bygga ' + target + '!';
}

function guideMessage(slug, ctx) {
  const meta = adventureMeta(slug);
  const name = meta.guideName;
  const parts = ctx.partsCollected || 0;
  const left = Math.max(0, (ctx.partsRequired || BUILD_PARTS_REQUIRED) - parts);
  const stage = getStageForParts(slug, parts);

  if (ctx.completed) {
    return name + ' säger: «Wow! Du byggde klart ' + (ctx.unlockLabel || meta.buildNoun) + '!»';
  }
  if (ctx.milestoneHit) {
    const reward = milestoneReward(slug, ctx.milestoneHit);
    return name + ' säger: «Delmål! Du låste upp ' + reward.label + ' ' + reward.icon + '»';
  }
  if (left === 1) {
    return name + ' säger: «Bara EN del kvar — du klarar det!»';
  }
  if (left <= 5) {
    return name + ' säger: «Snart kan vi sätta dit ' + stage.label.toLowerCase() + '!»';
  }
  if (ctx.justEarned) {
    return name + ' säger: «Wow! En ny byggdel! Nu bygger vi ' + stage.label.toLowerCase() + '.»';
  }
  return name + ' säger: «Fortsätt — ' + parts + ' delar är på plats!»';
}

function applyMilestonePerk(customization, slug, milestoneAt) {
  const reward = milestoneReward(slug, milestoneAt);
  const c = { ...(customization || {}) };
  const perks = Array.isArray(c.milestone_perks) ? [...c.milestone_perks] : [];
  if (reward.perk && perks.indexOf(reward.perk) < 0) perks.push(reward.perk);
  c.milestone_perks = perks;

  if (slug === 'racerbil') {
    if (milestoneAt === 15) c.color_id = c.color_id || 'ocean_blue';
    if (milestoneAt === 30 && (!c.decal || c.decal === 'none')) c.decal = 'stars';
    if (milestoneAt === 45) c.wheels = c.wheels || 'sport';
  }
  return c;
}

function enrichProject(project) {
  if (!project) return null;
  const slug = project.catalog_slug;
  const meta = adventureMeta(slug);
  const parts = project.parts_collected || 0;
  const required = project.parts_required || BUILD_PARTS_REQUIRED;
  return {
    ...project,
    build_stage: getStageForParts(slug, parts),
    next_milestone: nextMilestone(parts),
    guide: { name: meta.guideName, emoji: meta.guideEmoji },
    routine_line: routineLine(slug, project.unlock_label),
    milestones: listMilestones(slug, parts),
    scene_class: meta.sceneClass,
    build_noun: meta.buildNoun,
    parts_left: Math.max(0, required - parts),
  };
}

function unlockedWorldsFromProjects(projects) {
  const unlocked = {};
  (projects || []).forEach(function (p) {
    if (p.status === 'completed' || p.garage_unlocked) {
      unlocked[p.catalog_slug] = true;
    }
  });
  return WORLD_MAP.map(function (w) {
    return {
      ...w,
      unlocked: !!unlocked[w.slug],
      active: false,
    };
  });
}

module.exports = {
  BUILD_MILESTONES,
  BUILD_PARTS_REQUIRED,
  WORLD_MAP,
  ADVENTURE_PROGRESS,
  adventureMeta,
  getStageForParts,
  nextMilestone,
  milestoneCrossed,
  milestoneReward,
  listMilestones,
  routineLine,
  guideMessage,
  applyMilestonePerk,
  enrichProject,
  unlockedWorldsFromProjects,
};
