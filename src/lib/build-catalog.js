'use strict';

/** Static catalog + garage customization options (no AI). */

const WHEEL_OPTIONS = [
  { id: 'standard', label: 'Standard', icon: '⚙️' },
  { id: 'sport', label: 'Sport', icon: '🏎️' },
  { id: 'offroad', label: 'Breda', icon: '🛞' },
];

const COLOR_OPTIONS = [
  { id: 'racer_red', hex: '#E53935', label: 'Racer-röd', filter: 'none' },
  { id: 'ocean_blue', hex: '#3B82F6', label: 'Oceanblå', filter: 'hue-rotate(195deg) saturate(1.15)' },
  { id: 'forest_green', hex: '#22C55E', label: 'Skogsgrön', filter: 'hue-rotate(95deg) saturate(1.1)' },
  { id: 'sun_gold', hex: '#F5A623', label: 'Solguld', filter: 'hue-rotate(35deg) saturate(1.25) brightness(1.05)' },
  { id: 'lavender', hex: '#8B5CF6', label: 'Lila', filter: 'hue-rotate(260deg) saturate(1.2)' },
  { id: 'navy', hex: '#1B2340', label: 'Midnattsblå', filter: 'hue-rotate(220deg) saturate(0.7) brightness(0.75)' },
];

const DECAL_OPTIONS = [
  { id: 'none', label: 'Ingen', icon: '' },
  { id: 'stars', label: 'Stjärnor', icon: '⭐' },
  { id: 'flame', label: 'Eld', icon: '🔥' },
  { id: 'stripe', label: 'Ränder', icon: '〰️' },
];

const DEFAULT_CUSTOMIZATION = {
  color_id: 'racer_red',
  wheels: 'standard',
  decal: 'none',
  cleanliness: 100,
  tune_level: 0,
};

function normalizeCustomization(raw) {
  const c = { ...DEFAULT_CUSTOMIZATION, ...(raw && typeof raw === 'object' ? raw : {}) };
  if (!COLOR_OPTIONS.some((o) => o.id === c.color_id)) c.color_id = 'racer_red';
  if (!WHEEL_OPTIONS.some((o) => o.id === c.wheels)) c.wheels = 'standard';
  if (!DECAL_OPTIONS.some((o) => o.id === c.decal)) c.decal = 'none';
  c.cleanliness = Math.max(0, Math.min(100, Number(c.cleanliness) || 100));
  c.tune_level = Math.max(0, Math.min(5, Number(c.tune_level) || 0));
  return c;
}

function colorById(id) {
  return COLOR_OPTIONS.find((c) => c.id === id) || COLOR_OPTIONS[0];
}

module.exports = {
  WHEEL_OPTIONS,
  COLOR_OPTIONS,
  DECAL_OPTIONS,
  DEFAULT_CUSTOMIZATION,
  normalizeCustomization,
  colorById,
};
