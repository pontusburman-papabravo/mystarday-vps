'use strict';

/**
 * Husdjurshemmet — server-side state normalisering (sparad i customization JSONB).
 */

const PET_IDS = ['hund', 'katt', 'hamster', 'hast'];

const DEFAULT_PET_HOME = {
  game_version: 2,
  pet_id: 'hund',
  hunger: 38,
  happiness: 70,
  cleanliness: 82,
  energy: 88,
  bowl_fill: 0,
  asleep: false,
  dirty_spots: 2,
};

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Number(n) || 0));
}

function normalizePetHomeState(raw) {
  const c = { ...DEFAULT_PET_HOME, ...(raw && typeof raw === 'object' ? raw : {}) };
  c.game_version = 2;
  c.pet_id = PET_IDS.includes(c.pet_id) ? c.pet_id : 'hund';
  c.hunger = clamp(c.hunger, 0, 100);
  c.happiness = clamp(c.happiness, 0, 100);
  c.cleanliness = clamp(c.cleanliness, 0, 100);
  c.energy = clamp(c.energy, 0, 100);
  c.bowl_fill = clamp(c.bowl_fill, 0, 100);
  c.dirty_spots = clamp(c.dirty_spots, 0, 5);
  c.asleep = !!c.asleep;
  if (Array.isArray(raw && raw.milestone_perks)) {
    c.milestone_perks = raw.milestone_perks.filter(Boolean);
  }
  return c;
}

module.exports = {
  PET_IDS,
  DEFAULT_PET_HOME,
  normalizePetHomeState,
};
