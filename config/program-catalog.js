/**
 * Program & package catalog — single source for /pricing-info and future landing matrix.
 * User-facing copy only; no scarcity counters or live family counts.
 */

/** @type {Array<object>} */
const PROGRAMS = [
  {
    id: 'basic_app',
    component: 'basic_app',
    name: 'Basic',
    headline: 'Vardagens grundfunktioner',
    promise: 'Hjälper familjen skapa fungerande vardagsrutiner med motivation och struktur.',
    availability: 'live',
    availability_label: 'Ingår i grundarprogrammet',
    emoji: '⭐',
    includes: [
      'Veckoschema, specialdagar och kalender',
      'Aktivitetsbibliotek med delsteg',
      'Stjärnor, daglogg och belöningar (Skattkammaren)',
      'Barnvy med enkel inloggning',
      'För dig — målytor och rekommenderade rutiner',
      'Familjeinbjudan och push-påminnelser',
    ],
    not_included: [
      'Rapporter och PDF-export',
      'Pedagogsamarbete och skolanteckningar',
      'Visuellt stöd med De sju frågorna',
    ],
    preview_path: null,
  },
  {
    id: 'reporting',
    component: 'reporting',
    name: 'Familj Rapportering',
    headline: 'Följ utveckling över tid',
    promise: 'Förstå utvecklingen över tid och dela sammanfattningar med skola, BUP eller annan kontakt.',
    availability: 'coming',
    availability_label: 'Kommande tillägg',
    emoji: '📊',
    includes: [
      'Rapporter med valbar tidsperiod',
      'Trender — närvaro, aktiviteter och observationer',
      'PDF-export och PIN-skyddade delningslänkar',
      'Historik för möten och uppföljning',
    ],
    not_included: [
      'Pedagogverktyg och skollogg',
      'Extra stöd i barnvy (De sju frågorna)',
      'Ingår inte automatiskt — väljs som tillägg till Basic',
    ],
    preview_path: '/reports',
  },
  {
    id: 'pedagog',
    component: 'pedagog',
    name: 'Familj Pedagog',
    headline: 'Samarbeta med pedagoger',
    promise: 'Gör det enkelt för familj och pedagog att arbeta tillsammans kring barnets vardag.',
    availability: 'coming',
    availability_label: 'Kommande tillägg',
    emoji: '🤝',
    includes: [
      'Bjud in pedagog eller terapeut per barn',
      'Pedagoganteckningar och daglig skollogg',
      'Samarbetsvy för föräldrar — publicerade anteckningar',
      'Begränsad åtkomst för pedagog — inga familjeinställningar',
    ],
    not_included: [
      'Rapporter och PDF-export (paket Rapportering)',
      'Belöningar och Skattkammare för pedagogrollen',
      'Ingår inte automatiskt — väljs som tillägg till Basic',
    ],
    preview_path: '/samarbete',
  },
  {
    id: 'teacch',
    component: 'teacch',
    name: 'Familj Extra stöd',
    headline: 'Mer förutsägbarhet i vardagen',
    promise: 'Visuellt stöd med De sju frågorna — tydlighet kring vad, var, vem och vad som händer sen.',
    availability: 'coming',
    availability_label: 'Kommande tillägg',
    emoji: '🧩',
    includes: [
      'De sju frågorna i barnets NU-vy',
      'Pictogram och symbolstöd per svar',
      'Visuell timer vid tidsfrågan',
      'Valfri uppläsning av aktivitet och svar',
    ],
    not_included: [
      'Pedagogsamarbete',
      'Rapporter och PDF-export',
      'Ingår inte automatiskt — väljs som tillägg till Basic',
    ],
    preview_path: '/barn-stod',
  },
];

/**
 * Comparison matrix — reusable on landing page later.
 * `programs` maps component id → true (included) | false (not included) | 'addon' (separate package)
 */
const COMPARISON_MATRIX = {
  title: 'Vad ingår var?',
  rows: [
    { label: 'Schema & rutiner', programs: { basic_app: true, reporting: false, pedagog: false, teacch: false } },
    { label: 'Stjärnor & belöningar', programs: { basic_app: true, reporting: false, pedagog: false, teacch: false } },
    { label: 'För dig (målytor)', programs: { basic_app: true, reporting: false, pedagog: false, teacch: false } },
    { label: 'Barnvy', programs: { basic_app: true, reporting: false, pedagog: false, teacch: true } },
    { label: 'Rapporter & PDF', programs: { basic_app: false, reporting: true, pedagog: false, teacch: false } },
    { label: 'Pedagogsamarbete', programs: { basic_app: false, reporting: false, pedagog: true, teacch: false } },
    { label: 'De sju frågorna', programs: { basic_app: false, reporting: false, pedagog: false, teacch: true } },
    { label: 'Visuell timer & läs upp', programs: { basic_app: false, reporting: false, pedagog: false, teacch: true } },
  ],
};

const PAGE_COPY = {
  title: 'Program och paket',
  intro:
    'My Starday byggs i moduler. Basic ger familjen vardagsrutiner och motivation. ' +
    'Tilläggspaketen Rapportering, Pedagog och Extra stöd kan kombineras efter behov.',
  founder_note:
    'Under grundarprogrammet får nya familjer Basic kostnadsfritt med livstids tillgång som grundarmedlem. ' +
    'Ingen betalning krävs i den nuvarande versionen.',
  addon_note:
    'Tilläggspaketen är under utveckling. Du kan se förhandsvisningar och anmäla intresse när funktionen rullas ut i appen.',
  includes_heading: 'Det här ingår',
  not_included_heading: 'Ingår inte',
};

function getProgramCatalog() {
  return {
    programs: PROGRAMS,
    comparison: COMPARISON_MATRIX,
    copy: PAGE_COPY,
  };
}

module.exports = {
  PROGRAMS,
  COMPARISON_MATRIX,
  PAGE_COPY,
  getProgramCatalog,
};
