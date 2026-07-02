'use strict';

/**
 * Resursbibliotek — URL registry and path builders (bildstod-app-plan §5.3).
 * CTA UTM: /register?utm_content=resurs-{slug} (hub slug = "hub").
 */

const RESURSER_HUB_PATH = '/resurser';

/** First-wave category placeholders — content ships in PR R1/R2. */
const RESURSER_CATEGORIES = [
  { slug: 'morgon', label: 'Morgon' },
  { slug: 'kvall', label: 'Kväll' },
  { slug: 'kanslor', label: 'Känslor' },
  { slug: 'skola', label: 'Skola' },
  { slug: 'hygien', label: 'Hygien' },
  { slug: 'overgangar', label: 'Övergångar' },
  { slug: 'teacch-inspirerat', label: 'TEACCH-inspirerat' },
];

function categoryPath(slug) {
  return `${RESURSER_HUB_PATH}/${slug}`;
}

function bildkortPath(categorySlug) {
  return `${RESURSER_HUB_PATH}/bildkort/${categorySlug}`;
}

function pdfPath(mallSlug) {
  return `${RESURSER_HUB_PATH}/pdf/${mallSlug}`;
}

function longTailPath(intentSlug) {
  return `${RESURSER_HUB_PATH}/${intentSlug}`;
}

function registerUtmPath(slug = 'hub') {
  return `/register?utm_content=resurs-${slug}`;
}

module.exports = {
  RESURSER_HUB_PATH,
  RESURSER_CATEGORIES,
  categoryPath,
  bildkortPath,
  pdfPath,
  longTailPath,
  registerUtmPath,
};
