'use strict';

/** Child-facing role labels for Mina personer (P-02). */
const FAMILY_ROLE_LABELS = {
  mamma: 'Mamma',
  pappa: 'Pappa',
  'bonusförälder': 'Bonusförälder',
  annan: 'Familj',
};

const KINSHIP_FROM_NAME = [
  { pattern: /^mormor$/i, label: 'Mormor' },
  { pattern: /^morfar$/i, label: 'Morfar' },
  { pattern: /^farmor$/i, label: 'Farmor' },
  { pattern: /^farfar$/i, label: 'Farfar' },
  { pattern: /^mamma$/i, label: 'Mamma' },
  { pattern: /^pappa$/i, label: 'Pappa' },
  { pattern: /^faster$/i, label: 'Faster' },
  { pattern: /^farbror$/i, label: 'Farbror' },
  { pattern: /^moster$/i, label: 'Moster' },
  { pattern: /^morbror$/i, label: 'Morbror' },
];

function kinshipLabelFromName(name) {
  const trimmed = (name || '').trim();
  if (!trimmed) return null;
  for (let i = 0; i < KINSHIP_FROM_NAME.length; i++) {
    if (KINSHIP_FROM_NAME[i].pattern.test(trimmed)) {
      return KINSHIP_FROM_NAME[i].label;
    }
  }
  return null;
}

/**
 * @param {{ name?: string, family_role?: string|null }} parent
 */
function childRoleLabelForParent(parent) {
  const role = parent && parent.family_role;
  if (role && FAMILY_ROLE_LABELS[role]) {
    return FAMILY_ROLE_LABELS[role];
  }
  const fromName = kinshipLabelFromName(parent && parent.name);
  if (fromName) return fromName;
  return 'Hjälper mig hemma';
}

function childRoleLabelForSibling() {
  return 'Syskon';
}

function childRoleLabelForPedagog() {
  return 'Hjälper mig i skolan';
}

module.exports = {
  FAMILY_ROLE_LABELS,
  childRoleLabelForParent,
  childRoleLabelForSibling,
  childRoleLabelForPedagog,
  kinshipLabelFromName,
};
