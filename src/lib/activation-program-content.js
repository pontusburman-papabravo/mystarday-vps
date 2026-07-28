/**
 * Per-day copy for activation programs (Fas 3).
 * MVP: onboarding_7d only (invariant #15).
 */

const config = require('./config');
const { t } = require('./i18n');
const { validateLocale } = require('./locale');

const DAY_META = {
  1: { cta_type: 'open_child_view', show_preview: true },
  2: { cta_type: 'open_schedule', cta_url: '/dashboard' },
  3: { cta_type: 'open_schedule', cta_url: '/dashboard' },
  4: { cta_type: 'open_schedule', cta_url: '/schedule' },
  5: { cta_type: 'open_rewards', cta_url: '/library-treasury' },
  6: { cta_type: 'invite_coparent', cta_url: '/family' },
  7: { cta_type: 'submit_reflection' },
};

function brandName() {
  return config.email.fromName || 'Stjärndag';
}

function resolveChildName(locale, ctx) {
  return ctx.childName || t(locale, 'email.common.genericChild');
}

function getDayContent(effectiveDay, ctx = {}) {
  const locale = validateLocale(ctx.locale || 'sv-SE');
  const childName = resolveChildName(locale, ctx);
  const day = effectiveDay >= 1 && effectiveDay <= 7 ? effectiveDay : 7;
  const prefix = `activationProgram.days.${day}`;
  const meta = DAY_META[day] || DAY_META[7];

  const content = {
    title: t(locale, `${prefix}.title`),
    body: t(locale, `${prefix}.body`, { childName }),
    cta_label: t(locale, `${prefix}.ctaLabel`),
    cta_type: meta.cta_type,
  };

  if (meta.cta_url) content.cta_url = meta.cta_url;
  if (meta.show_preview) content.show_preview = true;
  if (day === 3) {
    content.supportive_fallback = t(locale, `${prefix}.supportiveFallback`);
  }
  if (day === 6) {
    content.solo_label = t(locale, `${prefix}.soloLabel`);
  }

  return content;
}

/**
 * Push copy for days 2–7 (spec §4). Day 1 has no push.
 * @returns {{ title: string, body: string, url: string } | null}
 */
function getPushContent(effectiveDay, ctx = {}) {
  if (effectiveDay < 2 || effectiveDay > 7) return null;

  const locale = validateLocale(ctx.locale || 'sv-SE');
  const childName = resolveChildName(locale, ctx);
  const dayContent = getDayContent(effectiveDay, { ...ctx, locale });
  const brand = brandName();
  const body = t(locale, `push.activationProgram.day${effectiveDay}Body`, { childName });

  const baseUrl = dayContent.cta_url || '/dashboard';
  const separator = baseUrl.includes('?') ? '&' : '?';

  return {
    title: t(locale, 'push.activationProgram.title', { brand }),
    body,
    url: `${baseUrl}${separator}ap_push=${effectiveDay}`,
  };
}

module.exports = { getDayContent, getPushContent };
