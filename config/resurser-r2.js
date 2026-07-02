'use strict';

/**
 * Resursbibliotek R2 — känslor, övergångar, TEACCH, skola, hygien + belöning/vecko PDF.
 */

const { getPictogram } = require('./pictogram-library');

const { EMOTION_KEYS } = require('./emotion-keys');

/** Först–sedan och övergångsstöd (vänta, nu, snart). */
const TRANSITION_KEYS = [
  'first',
  'then',
  'now',
  'soon',
  'five_minutes',
  'wait',
  'done',
  'finished',
];

/** TEACCH-inspirerat — 7 kort (plan EPIC R2.3). */
const TEACCH_KEYS = [
  'first',
  'then',
  'finished',
  'pause',
  'work',
  'rest',
  'help',
];

const SCHOOL_KEYS = [
  'school',
  'homework',
  'recess',
  'cafeteria',
  'listen',
  'pencil',
  'teacher',
  'pe',
];

const HYGIENE_KEYS = [
  'wash_hands',
  'brush_teeth',
  'toilet',
  'bath',
  'hair_brush',
  'bathroom',
];

const R2_CATEGORY_PAGES = [
  {
    path: '/resurser/kanslor',
    file: 'resurser/kanslor.html',
    slug: 'kanslor',
    title: 'Känslor — gratis känslokort att skriva ut',
    description: 'Utskrivbara känslokort med åtta vanliga känslor för barn. Gratis PDF att ladda ner och laminera.',
  },
  {
    path: '/resurser/overgangar',
    file: 'resurser/overgangar.html',
    slug: 'overgangar',
    title: 'Övergångar — först–sedan och vänta-kort',
    description: 'Gratis övergångskort med först, sedan, nu och vänta — för lugna byten mellan aktiviteter.',
  },
  {
    path: '/resurser/teacch-inspirerat',
    file: 'resurser/teacch-inspirerat.html',
    slug: 'teacch-inspirerat',
    title: 'TEACCH-inspirerat — utskrivbara arbetssystem',
    description: 'TEACCH-inspirerade utskrivbara kort: Först, Sedan, Klar med mera. Inspirerat av visuellt stöd — inte officiell TEACCH-metod.',
  },
  {
    path: '/resurser/skola',
    file: 'resurser/skola.html',
    slug: 'skola',
    title: 'Skola — gratis bildstöd för skoldagen',
    description: 'Utskrivbara skolscheman och bildkort för skoldagsrutiner. Gratis PDF från Min Stjärndag.',
  },
  {
    path: '/resurser/hygien',
    file: 'resurser/hygien.html',
    slug: 'hygien',
    title: 'Hygien — bildkort för tvätta händer och tänder',
    description: 'Gratis hygien-bildkort och schema att skriva ut — tvätta händer, borsta tänder och mer.',
  },
];

const R2_BILDKORT_PAGES = [
  {
    path: '/resurser/bildkort/kanslor',
    file: 'resurser/bildkort-kanslor.html',
    slug: 'kanslor',
    title: 'Känslokort att skriva ut — gratis',
    pictogramKeys: EMOTION_KEYS,
  },
  {
    path: '/resurser/bildkort/overgangar',
    file: 'resurser/bildkort-overgangar.html',
    slug: 'overgangar',
    title: 'Övergångskort att skriva ut — först och sedan',
    pictogramKeys: TRANSITION_KEYS,
  },
  {
    path: '/resurser/bildkort/teacch-inspirerat',
    file: 'resurser/bildkort-teacch-inspirerat.html',
    slug: 'teacch-inspirerat',
    title: 'TEACCH-inspirerade kort att skriva ut',
    pictogramKeys: TEACCH_KEYS,
  },
  {
    path: '/resurser/bildkort/skola',
    file: 'resurser/bildkort-skola.html',
    slug: 'skola',
    title: 'Skola-bildkort att skriva ut',
    pictogramKeys: SCHOOL_KEYS,
  },
  {
    path: '/resurser/bildkort/hygien',
    file: 'resurser/bildkort-hygien.html',
    slug: 'hygien',
    title: 'Hygien-bildkort att skriva ut',
    pictogramKeys: HYGIENE_KEYS,
  },
];

const R2_PDF_PAGES = [
  {
    path: '/resurser/pdf/kanslor',
    file: 'resurser/pdf-kanslor.html',
    slug: 'kanslor',
    title: 'Känslokort PDF — gratis att skriva ut',
    description: 'Ladda ner gratis känslokort PDF med åtta vanliga känslor för barn.',
    downloads: [
      { href: '/resurser/pdf/bildkort-kanslor.pdf', label: 'Känslokort — rutnät (PDF)' },
    ],
    pictogramKeys: EMOTION_KEYS,
  },
  {
    path: '/resurser/pdf/overgangar',
    file: 'resurser/pdf-overgangar.html',
    slug: 'overgangar',
    title: 'Övergångsschema PDF — först och sedan',
    description: 'Gratis övergångsschema och bildkort för lugna byten mellan aktiviteter.',
    downloads: [
      { href: '/resurser/pdf/overgangsschema.pdf', label: 'Övergångsschema — tom mall (PDF)' },
      { href: '/resurser/pdf/overgangsschema-exempel.pdf', label: 'Övergångsschema — exempel (PDF)' },
      { href: '/resurser/pdf/bildkort-overgangar.pdf', label: 'Övergångskort — rutnät (PDF)' },
    ],
    pictogramKeys: TRANSITION_KEYS,
  },
  {
    path: '/resurser/pdf/teacch-inspirerat',
    file: 'resurser/pdf-teacch-inspirerat.html',
    slug: 'teacch-inspirerat',
    title: 'TEACCH-inspirerat PDF — utskrivbara kort',
    description: 'TEACCH-inspirerade utskrivbara kort: Först, Sedan, Klar med mera. Inspirerat av visuellt stöd.',
    downloads: [
      { href: '/resurser/pdf/bildkort-teacch.pdf', label: 'TEACCH-inspirerade kort — rutnät (PDF)' },
    ],
    pictogramKeys: TEACCH_KEYS,
  },
  {
    path: '/resurser/pdf/skola',
    file: 'resurser/pdf-skola.html',
    slug: 'skola',
    title: 'Skolaschema PDF — mall med bildstöd',
    description: 'Gratis skolaschema att skriva ut — tom mall och färdigt exempel.',
    downloads: [
      { href: '/resurser/pdf/skolaschema.pdf', label: 'Skolaschema — tom mall (PDF)' },
      { href: '/resurser/pdf/skolaschema-exempel.pdf', label: 'Skolaschema — exempel (PDF)' },
      { href: '/resurser/pdf/bildkort-skola.pdf', label: 'Skola-bildkort — rutnät (PDF)' },
    ],
    pictogramKeys: SCHOOL_KEYS,
  },
  {
    path: '/resurser/pdf/hygien',
    file: 'resurser/pdf-hygien.html',
    slug: 'hygien',
    title: 'Hygienschema PDF — mall med bildstöd',
    description: 'Gratis hygienschema att skriva ut — tom mall och färdigt exempel.',
    downloads: [
      { href: '/resurser/pdf/hygienschema.pdf', label: 'Hygienschema — tom mall (PDF)' },
      { href: '/resurser/pdf/hygienschema-exempel.pdf', label: 'Hygienschema — exempel (PDF)' },
      { href: '/resurser/pdf/bildkort-hygien.pdf', label: 'Hygien-bildkort — rutnät (PDF)' },
    ],
    pictogramKeys: HYGIENE_KEYS,
  },
  {
    path: '/resurser/pdf/beloningsschema',
    file: 'resurser/pdf-beloningsschema.html',
    slug: 'beloningsschema',
    title: 'Belöningsschema PDF — stjärnschema att skriva ut',
    description: 'Gratis utskrivbart belöningsschema med stjärnor — mall för papper-belöningssystem hemma.',
    downloads: [
      { href: '/resurser/pdf/beloningsschema.pdf', label: 'Belöningsschema — stjärnschema (PDF)' },
    ],
    pictogramKeys: [],
  },
  {
    path: '/resurser/pdf/veckoschema',
    file: 'resurser/pdf-veckoschema.html',
    slug: 'veckoschema',
    title: 'Veckoschema PDF — statisk mall med bildstöd',
    description: 'Gratis veckoschema att skriva ut — tom mall och exempel för mån–sön.',
    downloads: [
      { href: '/resurser/pdf/veckoschema.pdf', label: 'Veckoschema — tom mall (PDF)' },
      { href: '/resurser/pdf/veckoschema-exempel.pdf', label: 'Veckoschema — exempel (PDF)' },
    ],
    pictogramKeys: [],
  },
];

const R2_INDEXABLE_PATHS = [
  ...R2_CATEGORY_PAGES.map((p) => p.path),
  ...R2_BILDKORT_PAGES.map((p) => p.path),
  ...R2_PDF_PAGES.map((p) => p.path),
];

/** All R2 PDF filenames shipped in public/resurser/pdf/. */
const R2_PDF_FILES = [
  'bildkort-kanslor.pdf',
  'bildkort-overgangar.pdf',
  'overgangsschema.pdf',
  'overgangsschema-exempel.pdf',
  'bildkort-teacch.pdf',
  'skolaschema.pdf',
  'skolaschema-exempel.pdf',
  'bildkort-skola.pdf',
  'hygienschema.pdf',
  'hygienschema-exempel.pdf',
  'bildkort-hygien.pdf',
  'beloningsschema.pdf',
  'veckoschema.pdf',
  'veckoschema-exempel.pdf',
];

function pictogramLabels(keys) {
  return keys.map((key) => {
    const pic = getPictogram(key);
    return pic ? { key, label: pic.label, emoji: pic.emoji || '' } : { key, label: key, emoji: '' };
  });
}

module.exports = {
  EMOTION_KEYS,
  TRANSITION_KEYS,
  TEACCH_KEYS,
  SCHOOL_KEYS,
  HYGIENE_KEYS,
  R2_CATEGORY_PAGES,
  R2_BILDKORT_PAGES,
  R2_PDF_PAGES,
  R2_INDEXABLE_PATHS,
  R2_PDF_FILES,
  pictogramLabels,
};
