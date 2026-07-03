/**
 * Admin Paket workspace metadata — labels, features, default content config.
 */
const { getFeaturesForComponent } = require('./component-feature-map');

const PACKAGE_COMPONENTS = ['reporting', 'pedagog', 'teacch'];

const PACKAGE_LABELS = {
  reporting: 'Rapportering',
  pedagog: 'Pedagog',
  teacch: 'Extra stöd',
};

const DEFAULT_PACKAGE_CONTENT = {
  reporting: {
    headline: 'Klinisk rapportering',
    description: 'Vecko- och månadssammanfattningar, export till PDF och delning med PIN-skyddad länk.',
    default_share_fields: ['activities', 'stars', 'mood', 'sleep'],
    export_note: 'Professionella länkar gäller 7 dagar som standard.',
  },
  pedagog: {
    headline: 'Pedagog-samarbete',
    description: 'Inbjudan, daganteckningar, skolaktiviteter och samarbetsflöde mellan hem och skola.',
    note_sections: ['Morgon', 'Lunch', 'Eftermiddag'],
    invite_note: 'Primärförälder bjuder in pedagog via e-post och väljer barn.',
  },
  teacch: {
    headline: 'Extra stöd — starter-mallar',
    description: 'Standardaktiviteter med ifyllda de sju frågorna. Kopieras till familjer med Extra stöd.',
    default_transition_lead_minutes: [5, 1],
  },
};

const SEVEN_QUESTION_FIELDS = [
  { key: 'where', label: 'Var?' },
  { key: 'who', label: 'Vem?' },
  { key: 'how_long', label: 'Hur länge?' },
  { key: 'what_next', label: 'Vad händer sen?' },
  { key: 'what_need', label: 'Vad behöver jag?' },
  { key: 'why', label: 'Varför?' },
];

function getPackageMeta(component) {
  if (!PACKAGE_COMPONENTS.includes(component)) return null;
  return {
    component,
    label: PACKAGE_LABELS[component] || component,
    features: getFeaturesForComponent(component),
    default_content: DEFAULT_PACKAGE_CONTENT[component] || {},
  };
}

function listPackageMeta() {
  return PACKAGE_COMPONENTS.map((c) => getPackageMeta(c));
}

module.exports = {
  PACKAGE_COMPONENTS,
  DEFAULT_PACKAGE_CONTENT,
  SEVEN_QUESTION_FIELDS,
  getPackageMeta,
  listPackageMeta,
};
