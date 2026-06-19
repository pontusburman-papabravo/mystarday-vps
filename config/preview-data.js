/**
 * Central mock preview content (§9.6).
 * Fictional names and numbers only — never real family data.
 */

/** @type {Record<string, object>} */
const PREVIEW_PACKAGES = {
  reporting: {
    slug: 'reporting',
    name: 'Rapportering',
    tagline: 'Följ utveckling med tydliga rapporter till dig och professionella.',
    badge: 'Kommande paket',
    watermark: 'Förhandsvisning — exempeldata',
    body: {
      headline: 'Senaste 30 dagarna',
      childName: 'Ella (exempel)',
      stats: [
        { label: 'Närvaro', value: '92%', trend: 'up' },
        { label: 'Aktiviteter', value: '+12%', trend: 'up' },
        { label: 'Stjärnor', value: '48', trend: 'neutral' },
      ],
      highlights: [
        'Tydlig veckosammanfattning för möten med skola eller BUP.',
        'Exportera som PDF att dela med trygg PIN-skyddad länk.',
      ],
    },
  },
  pedagog: {
    slug: 'pedagog',
    name: 'Pedagog',
    tagline: 'Samarbeta med skola, förskola och terapeut — dag för dag.',
    badge: 'Kommande paket',
    watermark: 'Förhandsvisning',
    body: {
      educatorName: 'Emma Larsson',
      educatorRole: 'Specialpedagog (exempel)',
      childName: 'Ella',
      notePreview: 'Övergång till lunch gick bättre idag. Vi använde pictogram innan rasten.',
      sections: ['Morgon', 'Lunch', 'Eftermiddag'],
      statusLabel: 'Publicerad till föräldrar',
    },
  },
  teacch: {
    slug: 'teacch',
    name: 'Extra stöd',
    tagline: 'Visuellt stöd med de sju frågorna — direkt i barnets NU-vy.',
    badge: 'Kommande paket',
    watermark: 'Förhandsvisning — De sju frågorna',
    body: {
      activityTitle: 'Borsta tänderna',
      questions: [
        { key: 'what', label: 'Vad?', value: 'Borsta tänderna', emoji: '🪥' },
        { key: 'where', label: 'Var?', value: 'Badrummet', emoji: '🚿' },
        { key: 'who', label: 'Vem?', value: 'Själv', emoji: '🧒' },
        { key: 'how_long', label: 'Hur länge?', value: '2 minuter', emoji: '⏱️' },
        { key: 'what_next', label: 'Vad händer sen?', value: 'Frukost', emoji: '🥣' },
      ],
      features: ['Pictogram', 'Visuell timer', 'Läs upp'],
    },
  },
};

function getPreviewPackage(component) {
  return PREVIEW_PACKAGES[component] ?? null;
}

function getAllPreviewPackages() {
  return { ...PREVIEW_PACKAGES };
}

module.exports = {
  PREVIEW_PACKAGES,
  getPreviewPackage,
  getAllPreviewPackages,
};
