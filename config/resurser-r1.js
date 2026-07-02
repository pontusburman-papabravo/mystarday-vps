'use strict';

/**
 * Resursbibliotek R1 — morgon/kväll pages, PDF assets, pictogram sets.
 */

const { getPictogram } = require('./pictogram-library');

const MORNING_KEYS = [
  'wake_up',
  'toilet',
  'wash_hands',
  'dress',
  'breakfast',
  'brush_teeth',
  'pack_bag',
  'school',
];

const EVENING_KEYS = [
  'dinner',
  'shower',
  'brush_teeth',
  'pajamas',
  'read_book',
  'sleep',
];

const R1_CATEGORY_PAGES = [
  {
    path: '/resurser/morgon',
    file: 'resurser/morgon.html',
    slug: 'morgon',
    title: 'Morgon — gratis bildstöd att skriva ut',
    description: 'Utskrivbara morgonscheman och bildkort med bildstöd för barns morgonrutin. Gratis PDF att ladda ner.',
  },
  {
    path: '/resurser/kvall',
    file: 'resurser/kvall.html',
    slug: 'kvall',
    title: 'Kväll — gratis bildstöd att skriva ut',
    description: 'Utskrivbara kvällsscheman och bildkort för lugna kvällsrutiner. Gratis PDF från Min Stjärndag.',
  },
];

const R1_BILDKORT_PAGES = [
  {
    path: '/resurser/bildkort/morgon',
    file: 'resurser/bildkort-morgon.html',
    slug: 'morgon',
    title: 'Morgon-bildkort att skriva ut',
    pictogramKeys: MORNING_KEYS,
  },
  {
    path: '/resurser/bildkort/kvall',
    file: 'resurser/bildkort-kvall.html',
    slug: 'kvall',
    title: 'Kväll-bildkort att skriva ut',
    pictogramKeys: EVENING_KEYS,
  },
];

const R1_PDF_PAGES = [
  {
    path: '/resurser/pdf/morgonschema',
    file: 'resurser/pdf-morgonschema.html',
    slug: 'morgonschema',
    title: 'Morgonschema PDF — mall med bildstöd',
    description: 'Gratis morgonschema att skriva ut — tom mall och färdigt exempel med vanliga morgonsteg.',
    downloads: [
      { href: '/resurser/pdf/morgonschema.pdf', label: 'Tom morgonschema-mall (PDF)' },
      { href: '/resurser/pdf/morgonschema-exempel.pdf', label: 'Morgonschema med exempelsteg (PDF)' },
      { href: '/resurser/pdf/bildkort-morgon.pdf', label: 'Morgon-bildkort — rutnät (PDF)' },
    ],
    pictogramKeys: MORNING_KEYS,
  },
  {
    path: '/resurser/pdf/kvallsschema',
    file: 'resurser/pdf-kvallsschema.html',
    slug: 'kvallsschema',
    title: 'Kvällsschema PDF — mall med bildstöd',
    description: 'Gratis kvällsschema att skriva ut — tom mall och färdigt exempel med lugna kvällssteg.',
    downloads: [
      { href: '/resurser/pdf/kvallsschema.pdf', label: 'Tom kvällsschema-mall (PDF)' },
      { href: '/resurser/pdf/kvallsschema-exempel.pdf', label: 'Kvällsschema med exempelsteg (PDF)' },
      { href: '/resurser/pdf/bildkort-kvall.pdf', label: 'Kväll-bildkort — rutnät (PDF)' },
    ],
    pictogramKeys: EVENING_KEYS,
  },
];

const R1_INDEXABLE_PATHS = [
  ...R1_CATEGORY_PAGES.map((p) => p.path),
  ...R1_BILDKORT_PAGES.map((p) => p.path),
  ...R1_PDF_PAGES.map((p) => p.path),
];

function pictogramLabels(keys) {
  return keys.map((key) => {
    const pic = getPictogram(key);
    return pic ? { key, label: pic.label, emoji: pic.emoji || '' } : { key, label: key, emoji: '' };
  });
}

module.exports = {
  MORNING_KEYS,
  EVENING_KEYS,
  R1_CATEGORY_PAGES,
  R1_BILDKORT_PAGES,
  R1_PDF_PAGES,
  R1_INDEXABLE_PATHS,
  pictogramLabels,
};
