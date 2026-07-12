'use strict';

/**
 * Barnets samling — activity card presentation size (standard / large).
 * Storage: child_view_config.activity_card_size
 */

const DEFAULT_SIZE = 'standard';

const SIZES = Object.freeze({
  standard: { id: 'standard', label: 'Vanliga kort' },
  large: { id: 'large', label: 'Stora bilder' },
});

const SIZE_IDS = Object.freeze(Object.keys(SIZES));

function resolveCardSize(value) {
  if (value == null || String(value).trim() === '') return DEFAULT_SIZE;
  const normalized = String(value).trim().toLowerCase();
  return SIZE_IDS.includes(normalized) ? normalized : DEFAULT_SIZE;
}

function listSizes() {
  return SIZE_IDS.map(function (id) {
    return { id: id, label: SIZES[id].label };
  });
}

module.exports = {
  DEFAULT_SIZE,
  SIZES,
  SIZE_IDS,
  resolveCardSize,
  listSizes,
};
