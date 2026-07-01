'use strict';

/**
 * Canonical För dig goal definitions (server + tests).
 * Browser copy: public/js/for-dig-config.js — keep in sync.
 */

const FOR_DIG_GOALS = [
  {
    slug: 'trygga-kvallar',
    icon: '🌙',
    title: 'Trygga kvällar',
    headline: 'Få lugnare läggningar',
    accentColor: '#5B4FCF',
    accentBg: '#EDE7F6',
    tagline: 'Mindre stress vid läggdags.',
    ageMin: 3,
    ageMax: 5,
    outcomes: [
      'Varva ner',
      'Komma ihåg tandborstningen',
      'Följa läggdagsrutinen',
      'Känna stolthet över sina stjärnor',
    ],
    starsHint: '15–25 stjärnor per vecka',
    rewardExamples: [
      { icon: '🏆', label: 'Extra saga' },
      { icon: '🍦', label: 'Glassutflykt' },
      { icon: '🎬', label: 'Filmkväll' },
    ],
    primaryAction: 'activate',
    activateLabel: 'Aktivera kvällsrutinen',
    scheduleName: 'Kvällsrutin',
    scheduleDays: [0, 1, 2, 3, 4, 5, 6],
    highlightActivities: ['Kvällsrutin', 'Borsta tänder', 'Godnattsaga'],
  },
  {
    slug: 'bra-morgnar',
    icon: '☀️',
    title: 'Bra morgnar',
    headline: 'Kom iväg utan morgontjat',
    accentColor: '#D97706',
    accentBg: '#FEF3C7',
    tagline: 'Kom iväg utan tjat.',
    ageMin: 3,
    ageMax: 6,
    outcomes: [
      'Vakna i tid',
      'Klara morgonrutinen',
      'Komma iväg utan bråk',
      'Börja dagen med stolthet',
    ],
    starsHint: '10–20 stjärnor per vecka',
    rewardExamples: [
      { icon: '🥞', label: 'Pannkakor' },
      { icon: '🎮', label: 'Extra skärmtid' },
      { icon: '🚗', label: 'Välja musik i bilen' },
    ],
    primaryAction: 'activate',
    activateLabel: 'Aktivera morgonrutinen',
    scheduleName: 'Kort morgon',
    scheduleDays: [1, 2, 3, 4, 5],
    highlightActivities: ['Kort morgon', 'Borsta tänder', 'Klä på sig'],
  },
  {
    slug: 'sjalvstandighet',
    icon: '🌟',
    title: 'Självständighet',
    headline: 'Få barnet att klä sig själv',
    accentColor: '#0284C7',
    accentBg: '#E0F2FE',
    tagline: 'Hjälp barnet göra mer själv.',
    ageMin: 3,
    ageMax: 7,
    outcomes: [
      'Klara fler moment själv',
      'Känna sig stolt',
      'Behöva mindre påminnelser',
      'Bygga vanor som håller',
    ],
    starsHint: '10–20 stjärnor per vecka',
    rewardExamples: [
      { icon: '🏆', label: 'Välja kvällsaktivitet' },
      { icon: '🍦', label: 'Glass' },
      { icon: '⭐', label: 'Extra stjärna' },
    ],
    primaryAction: 'explore',
    activateLabel: 'Aktivera självständighetsaktiviteter',
    activityNames: ['Klä på sig', 'Borsta tänder', 'Äta själv', 'Packa väska'],
    scheduleDays: [1, 2, 3, 4, 5],
    scheduleSection: 'dag',
    highlightActivities: ['Klä på sig', 'Borsta tänder', 'Packa väska'],
  },
  {
    slug: 'skolansvar',
    icon: '🎒',
    title: 'Skolansvar',
    headline: 'Få läxor och väska att funka',
    accentColor: '#16A34A',
    accentBg: '#DCFCE7',
    tagline: 'Läxor, väskor och ansvar.',
    ageMin: 6,
    ageMax: 9,
    outcomes: [
      'Komma ihåg läxor',
      'Packa väskan själv',
      'Ta ansvar för skolgrejer',
      'Känna sig förberedd',
    ],
    starsHint: '15–25 stjärnor per vecka',
    rewardExamples: [
      { icon: '🎮', label: 'Spelkväll' },
      { icon: '🍕', label: 'Fredagsmys' },
      { icon: '📚', label: 'Välja bok' },
    ],
    primaryAction: 'explore',
    activateLabel: 'Aktivera skolrutinen',
    scheduleName: 'Skola vardag',
    scheduleDays: [1, 2, 3, 4, 5],
    highlightActivities: ['Skola vardag', 'Packa väska', 'Läxor'],
  },
  {
    slug: 'samarbete-hemma',
    icon: '🏠',
    title: 'Samarbete hemma',
    headline: 'Få hjälp med dukning och städning',
    accentColor: '#E07C5C',
    accentBg: '#FDE8E0',
    tagline: 'Hjälpa till och ta ansvar.',
    ageMin: 4,
    ageMax: 9,
    outcomes: [
      'Hjälpa till hemma',
      'Ta ansvar för små uppgifter',
      'Känna sig delaktig',
      'Få beröm för insatsen',
    ],
    starsHint: '10–15 stjärnor per vecka',
    rewardExamples: [
      { icon: '🎬', label: 'Filmkväll' },
      { icon: '🍦', label: 'Glass' },
      { icon: '🏆', label: 'Välja helgaktivitet' },
    ],
    primaryAction: 'explore',
    activateLabel: 'Aktivera hemma-aktiviteter',
    activityNames: ['Städa rum', 'Duka av', 'Hämta post', 'Hjälpa till'],
    scheduleDays: [0, 1, 2, 3, 4, 5, 6],
    scheduleSection: 'dag',
    highlightActivities: ['Städa rum', 'Duka av', 'Hjälpa till'],
  },
  {
    slug: 'motivation',
    icon: '✨',
    title: 'Motivation',
    headline: 'Hålla motivationen uppe med belöningar',
    accentColor: '#7C3AED',
    accentBg: '#EDE9FE',
    tagline: 'Belöningar som håller motivationen uppe.',
    ageMin: 3,
    ageMax: 12,
    outcomes: [
      'Se fram emot belöningar',
      'Förstå kopplingen stjärnor → mål',
      'Hålla motivationen över tid',
      'Fira små framsteg',
    ],
    starsHint: 'Anpassa efter barnets tempo',
    rewardExamples: [
      { icon: '🏆', label: 'Extra saga' },
      { icon: '🍦', label: 'Glass' },
      { icon: '🎬', label: 'Filmkväll' },
    ],
    primaryAction: 'explore',
    activateLabel: 'Aktivera belöningarna',
    rewardNames: ['Extra saga', 'Glass', 'Filmkväll', 'Skärmtid'],
    highlightActivities: ['Extra saga', 'Glass', 'Filmkväll'],
  },
];

const INTENT_LABELS = {
  mindre_tjat: 'Mindre tjat',
  tydligare_rutiner: 'Tydligare rutiner',
  sjalvstandighet: 'Självständighet',
  mindre_stress: 'Mindre stress',
  annat: 'Annat',
};

const VALID_INTENT_REASONS = new Set(Object.keys(INTENT_LABELS));

function getGoalBySlug(slug) {
  return FOR_DIG_GOALS.find((g) => g.slug === slug) || null;
}

module.exports = {
  FOR_DIG_GOALS,
  INTENT_LABELS,
  VALID_INTENT_REASONS,
  getGoalBySlug,
};
