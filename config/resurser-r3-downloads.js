'use strict';

/** Maps downloadSlug to existing R1/R2 PDF landing pages — no new PDFs in R3. */
const R3_DOWNLOAD_META = {
  morgonschema: {
    label: 'Morgonschema PDF',
    path: '/resurser/pdf/morgonschema',
    pdfHref: '/resurser/pdf/morgonschema.pdf',
  },
  kvallsschema: {
    label: 'Kvällsschema PDF',
    path: '/resurser/pdf/kvallsschema',
    pdfHref: '/resurser/pdf/kvallsschema.pdf',
  },
  kanslor: {
    label: 'Känslokort PDF',
    path: '/resurser/pdf/kanslor',
    pdfHref: '/resurser/pdf/bildkort-kanslor.pdf',
  },
  overgangar: {
    label: 'Övergångsschema PDF',
    path: '/resurser/pdf/overgangar',
    pdfHref: '/resurser/pdf/overgangsschema.pdf',
  },
  'teacch-inspirerat': {
    label: 'TEACCH-inspirerade kort PDF',
    path: '/resurser/pdf/teacch-inspirerat',
    pdfHref: '/resurser/pdf/bildkort-teacch.pdf',
  },
  skola: {
    label: 'Skolaschema PDF',
    path: '/resurser/pdf/skola',
    pdfHref: '/resurser/pdf/skolaschema.pdf',
  },
  hygien: {
    label: 'Hygienschema PDF',
    path: '/resurser/pdf/hygien',
    pdfHref: '/resurser/pdf/hygienschema.pdf',
  },
  beloningsschema: {
    label: 'Belöningsschema PDF',
    path: '/resurser/pdf/beloningsschema',
    pdfHref: '/resurser/pdf/beloningsschema.pdf',
  },
  veckoschema: {
    label: 'Veckoschema PDF',
    path: '/resurser/pdf/veckoschema',
    pdfHref: '/resurser/pdf/veckoschema.pdf',
  },
};

/** Human labels for related internal links. */
const R3_RELATED_LABELS = {
  '/resurser': 'Resursbibliotek',
  '/resurser/morgon': 'Morgon',
  '/resurser/kvall': 'Kväll',
  '/resurser/kanslor': 'Känslor',
  '/resurser/overgangar': 'Övergångar',
  '/resurser/teacch-inspirerat': 'TEACCH-inspirerat',
  '/resurser/skola': 'Skola',
  '/resurser/hygien': 'Hygien',
  '/resurser/pdf/morgonschema': 'Morgonschema PDF',
  '/resurser/pdf/kvallsschema': 'Kvällsschema PDF',
  '/resurser/pdf/kanslor': 'Känslokort PDF',
  '/resurser/pdf/overgangar': 'Övergångsschema PDF',
  '/resurser/pdf/teacch-inspirerat': 'TEACCH-kort PDF',
  '/resurser/pdf/skola': 'Skolaschema PDF',
  '/resurser/pdf/hygien': 'Hygienschema PDF',
  '/resurser/pdf/beloningsschema': 'Belöningsschema PDF',
  '/resurser/pdf/veckoschema': 'Veckoschema PDF',
  '/resurser/bildkort/morgon': 'Morgon-bildkort',
  '/resurser/bildkort/kvall': 'Kväll-bildkort',
  '/resurser/bildkort/kanslor': 'Känslokort att klippa ut',
  '/resurser/bildkort/overgangar': 'Övergångskort',
  '/resurser/bildkort/hygien': 'Hygien-bildkort',
  '/resurser/bildkort/skola': 'Skola-bildkort',
  '/resurser/bildkort/teacch-inspirerat': 'TEACCH-kort att klippa ut',
  '/bildschema-app': 'Bildschema för barn',
  '/morgonrutin-barn': 'Morgonrutin för barn',
  '/beloningssystem-barn': 'Belöningssystem för barn',
  '/rutiner-npf-barn': 'Rutiner för barn med NPF',
  '/veckoschema-bildstod': 'Veckoschema med bildstöd',
  '/skattkammaren': 'Skattkammaren',
};

module.exports = {
  R3_DOWNLOAD_META,
  R3_RELATED_LABELS,
};
