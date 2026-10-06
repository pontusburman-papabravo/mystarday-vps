'use strict';

/**
 * Shared HTML for a published path locale.
 * Every visible sentence comes from that locale's copy.
 * Market names are escaped here. The page builder escapes titles again.
 */

const { defineLocalePages } = require('./locale-pack');
const { marketsForLocale, campaignPath, marketDisplayName } = require('../config/web-markets');

const LEAKS = [
  /How it works/,
  /Create an account/,
  /Get My Starday/,
  /coming soon/i,
  /This page is not available/,
  /Privacy Policy/,
  /Terms of Service/,
  /visual schedule/i,
  /stjärn|morgonrutin|veckoschema|förälder/,
];

function faq(q, a) {
  return { q, a };
}

function page(copy, body) {
  return {
    title: copy.title,
    description: copy.description,
    h1: copy.h1,
    ogTitle: copy.ogTitle,
    faqs: copy.faqs,
    body,
  };
}

function marketLinks(localeCode) {
  return marketsForLocale(localeCode).map((market) => {
    const path = campaignPath(market, localeCode);
    const label = String(marketDisplayName(market, localeCode))
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `<a href="${path}">${label}</a>`;
  }).join(', ');
}

function assertCopy(localeCode, html) {
  if (!html || !String(html).trim()) throw new Error(`${localeCode} rendered empty`);
  for (const leak of LEAKS) {
    if (leak.test(html)) throw new Error(`${localeCode} leaked ${leak}`);
  }
}

function composeLocale(localeCode, copy) {
  if (!copy.marker) throw new Error(`${localeCode} missing marker`);
  const links = marketLinks(localeCode);
  const pages = {
    home: page(copy.home, (href) => `
      <p class="lead">${copy.home.lead}</p>
      <h2>${copy.home.hSee}</h2>
      <p>${copy.home.see}</p>
      <h2>${copy.home.hStars}</h2>
      <p>${copy.home.stars} <a href="${href('rewardSystem')}">${copy.home.starsLink}</a>.</p>
      <h2>${copy.home.hTreat}</h2>
      <p>${copy.home.treat}</p>
      <p>${copy.home.marketsIntro} ${links}.</p>
      <p><a href="${href('howItWorks')}">${copy.home.linkHow}</a> · <a href="${href('visualSchedule')}">${copy.home.linkVisual}</a> · <a href="${href('morningRoutine')}">${copy.home.linkMorning}</a></p>
    `),
    howItWorks: page(copy.howItWorks, (href) => `
      <p class="lead">${copy.howItWorks.lead}</p>
      <h2>${copy.howItWorks.hPlan}</h2>
      <p>${copy.howItWorks.plan} <a href="${href('visualSchedule')}">${copy.howItWorks.planLink}</a>.</p>
      <h2>${copy.howItWorks.hChild}</h2>
      <p>${copy.howItWorks.child}</p>
      <h2>${copy.howItWorks.hStar}</h2>
      <p>${copy.howItWorks.star}</p>
      <p>${copy.howItWorks.closing}</p>
    `),
    visualSchedule: page(copy.visualSchedule, (href) => `
      <p class="lead">${copy.visualSchedule.lead}</p>
      <h2>${copy.visualSchedule.hNow}</h2>
      <p>${copy.visualSchedule.now}</p>
      <h2>${copy.visualSchedule.hStuck}</h2>
      <ul>
        <li><strong>${copy.visualSchedule.stuck1}</strong></li>
        <li><strong>${copy.visualSchedule.stuck2}</strong></li>
        <li><strong>${copy.visualSchedule.stuck3}</strong></li>
      </ul>
      <p>${copy.visualSchedule.bridge} <a href="${href('morningRoutine')}">${copy.visualSchedule.morningLink}</a>. <a href="${href('weeklySchedule')}">${copy.visualSchedule.weekLink}</a>.</p>
      <p>${copy.visualSchedule.closing}</p>
    `),
    morningRoutine: page(copy.morningRoutine, (href) => `
      <p class="lead">${copy.morningRoutine.lead}</p>
      <h2>${copy.morningRoutine.hExample}</h2>
      <ol>
        ${copy.morningRoutine.steps.map((step) => `<li>${step}</li>`).join('\n')}
      </ol>
      <p>${copy.morningRoutine.age}</p>
      <p>${copy.morningRoutine.bridge} <a href="${href('neurodiverseRoutines')}">${copy.morningRoutine.bridgeLink}</a>. ${copy.morningRoutine.closing}</p>
    `),
    weeklySchedule: page(copy.weeklySchedule, (href) => `
      <p class="lead">${copy.weeklySchedule.lead}</p>
      <p>${copy.weeklySchedule.mid}</p>
      <p><a href="${href('visualSchedule')}">${copy.weeklySchedule.dayLink}</a> ${copy.weeklySchedule.dayRest}</p>
      <p>${copy.weeklySchedule.closing}</p>
    `),
    neurodiverseRoutines: page(copy.neurodiverseRoutines, (href) => `
      <p class="lead">${copy.neurodiverseRoutines.lead}</p>
      <h2>${copy.neurodiverseRoutines.hAdhd}</h2>
      <p>${copy.neurodiverseRoutines.adhd}</p>
      <h2>${copy.neurodiverseRoutines.hAutism}</h2>
      <p>${copy.neurodiverseRoutines.autism} <a href="${href('weeklySchedule')}">${copy.neurodiverseRoutines.weekLink}</a>. ${copy.neurodiverseRoutines.autismRest}</p>
      <p>${copy.neurodiverseRoutines.closing}</p>
    `),
    rewardSystem: page(copy.rewardSystem, (href) => `
      <p class="lead">${copy.rewardSystem.lead}</p>
      <p><a href="${href('visualSchedule')}">${copy.rewardSystem.planLink}</a> ${copy.rewardSystem.chain}</p>
      <ol>
        ${copy.rewardSystem.steps.map((step) => `<li>${step}</li>`).join('\n')}
      </ol>
      <p>${copy.rewardSystem.closing}</p>
    `),
    resources: page(copy.resources, (href) => `
      <p class="lead">${copy.resources.lead}</p>
      <p>${copy.resources.app} <a href="${href('visualSchedule')}">${copy.resources.dayLink}</a>, <a href="${href('morningRoutine')}">${copy.resources.morningLink}</a>, <a href="${href('weeklySchedule')}">${copy.resources.weekLink}</a>. ${copy.resources.appRest}</p>
      <p>${copy.resources.nolink}</p>
    `),
    faq: page(copy.faq, (href) => `
      <p class="lead">${copy.faq.lead}</p>
      <h2>${copy.faq.hLang}</h2>
      <p>${copy.faq.lang}</p>
      <h2>${copy.faq.hChild}</h2>
      <p>${copy.faq.child} <a href="${href('howItWorks')}">${copy.faq.howLink}</a>.</p>
      <h2>${copy.faq.hStars}</h2>
      <p>${copy.faq.stars} <a href="${href('rewardSystem')}">${copy.faq.starsLink}</a>.</p>
    `),
    privacy: {
      title: copy.privacy.title,
      description: copy.privacy.description,
      h1: copy.privacy.h1,
      ogTitle: copy.privacy.ogTitle,
      body: copy.privacy.body,
    },
    terms: {
      title: copy.terms.title,
      description: copy.terms.description,
      h1: copy.terms.h1,
      ogTitle: copy.terms.ogTitle,
      body: copy.terms.body,
    },
  };

  const built = defineLocalePages(localeCode, { market: copy.market, pages });
  for (const key of Object.keys(pages)) {
    const rendered = built(key);
    const html = `${rendered.h1}\n${typeof rendered.body === 'string' ? rendered.body : ''}`;
    assertCopy(localeCode, html);
    if (!copy.marker.test(html)) {
      throw new Error(`${localeCode} ${key} missing language marker`);
    }
  }
  return built;
}

module.exports = {
  composeLocale,
  faq,
};
