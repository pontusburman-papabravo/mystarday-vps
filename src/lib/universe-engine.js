'use strict';

const universeDb = require('../../db/child-universe');

const ROOM_UNLOCKS = [
  { room: 'chest', minStars: 0 },
  { room: 'dreams', minStars: 0 },
  { room: 'shop', minStars: 0 },
  { room: 'trophy', minStars: 10 },
  { room: 'shelf', minStars: 10 },
  { room: 'story', minStars: 30 },
  { room: 'collections', minStars: 30 },
  { room: 'avatar', minStars: 15 },
  { room: 'pet', minStars: 50 },
  { room: 'museum', minStars: 100 },
];

const THEME_UNLOCKS = [
  { theme: 'castle', minStars: 0 },
  { theme: 'treehouse', minStars: 75 },
  { theme: 'space', minStars: 150 },
];

function evaluateRule(rule, stats) {
  if (!rule || !rule.type) return false;
  switch (rule.type) {
    case 'first_completion':
      return stats.has_completion;
    case 'completions':
      return stats.completions >= (rule.min || 1);
    case 'redemptions':
      return stats.redemptions >= (rule.min || 1);
    case 'lifetime_stars':
      return stats.lifetime_stars >= (rule.min || 1);
    case 'streak':
      return stats.streak >= (rule.min || 1);
    default:
      return false;
  }
}

function computeUnlockedRooms(lifetimeStars) {
  return ROOM_UNLOCKS.filter((r) => lifetimeStars >= r.minStars).map((r) => r.room);
}

function computeUnlockedThemes(lifetimeStars) {
  return THEME_UNLOCKS.filter((t) => lifetimeStars >= t.minStars).map((t) => t.theme);
}

async function syncUnlocks(childId, stats) {
  const [achDefs, colDefs, existingAch, existingCol] = await Promise.all([
    universeDb.getAllAchievements(),
    universeDb.getAllCollectibles(),
    universeDb.getChildAchievements(childId),
    universeDb.getChildCollectibles(childId),
  ]);

  const achSlugs = new Set(existingAch.map((a) => a.slug));
  const colSlugs = new Set(existingCol.map((c) => c.slug));
  const newlyUnlocked = { achievements: [], collectibles: [] };

  for (const def of achDefs) {
    if (achSlugs.has(def.slug)) continue;
    if (evaluateRule(def.unlock_rule, stats)) {
      await universeDb.unlockAchievement(childId, def.slug);
      newlyUnlocked.achievements.push(def.slug);
    }
  }

  for (const def of colDefs) {
    if (colSlugs.has(def.slug)) continue;
    const rule = def.unlock_rule || {};
    if (rule.type && evaluateRule(rule, stats)) {
      await universeDb.unlockCollectible(childId, def.slug);
      newlyUnlocked.collectibles.push(def.slug);
    }
  }

  const unlockedRooms = computeUnlockedRooms(stats.lifetime_stars);
  const unlockedThemes = computeUnlockedThemes(stats.lifetime_stars);
  const child = await universeDb.getChildRow(childId);
  const house = child?.house_config || {};
  const mergedRooms = [...new Set([...(house.unlocked_rooms || []), ...unlockedRooms])];
  const mergedThemes = [...new Set([...(house.unlocked_themes || []), ...unlockedThemes])];

  if (JSON.stringify(mergedRooms) !== JSON.stringify(house.unlocked_rooms) ||
      JSON.stringify(mergedThemes) !== JSON.stringify(house.unlocked_themes)) {
    await universeDb.updateHouseConfig(childId, {
      unlocked_rooms: mergedRooms,
      unlocked_themes: mergedThemes,
    });
  }

  return newlyUnlocked;
}

async function getUniverseState(childId) {
  const child = await universeDb.getChildRow(childId);
  if (!child) return null;

  const stats = await universeDb.getChildStats(childId);
  await syncUnlocks(childId, stats);

  const [achievements, collectibles, pet, catalog, yearStory] = await Promise.all([
    universeDb.getChildAchievements(childId),
    universeDb.getChildCollectibles(childId),
    universeDb.getPet(childId),
    universeDb.getAllCollectibles(),
    universeDb.getYearStory(childId),
  ]);

  const refreshed = await universeDb.getChildRow(childId);
  const house = refreshed.house_config || { theme: 'castle', unlocked_rooms: ['chest', 'dreams', 'shop'] };

  return {
    avatar: {
      config: refreshed.avatar_config || {},
      emoji: child.emoji,
      avatar_url: child.avatar_url,
      name: child.name,
    },
    house: {
      theme: house.theme || 'castle',
      unlocked_rooms: house.unlocked_rooms || computeUnlockedRooms(stats.lifetime_stars),
      unlocked_themes: house.unlocked_themes || computeUnlockedThemes(stats.lifetime_stars),
    },
    stats,
    achievements,
    collectibles,
    catalog,
    pet,
    year_story: yearStory,
  };
}

module.exports = {
  evaluateRule,
  computeUnlockedRooms,
  computeUnlockedThemes,
  syncUnlocks,
  getUniverseState,
};
