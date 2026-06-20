/**
 * Public newsletter subscribers — guests without parent accounts.
 */
const db = require('../src/lib/db');

const VALID_COMPONENTS = ['reporting', 'pedagog', 'teacch', 'total'];

function normalizeEmail(email) {
  return String(email || '').toLowerCase().trim();
}

/**
 * @param {{ email: string, name?: string|null, source?: string, component?: string|null, ipAddress?: string|null }} input
 */
async function subscribePublic(input) {
  const email = normalizeEmail(input.email);
  const name = input.name ? String(input.name).trim().slice(0, 255) : null;
  const source = String(input.source || 'landing').trim().slice(0, 64);
  const component = input.component && VALID_COMPONENTS.includes(input.component)
    ? input.component
    : null;
  const ipAddress = input.ipAddress || null;

  const existing = await db.query(
    'SELECT id, package_interests FROM public_newsletter_subscriber WHERE email = $1',
    [email]
  );

  if (existing.rows.length === 0) {
    const interests = component ? [component] : [];
    const { rows } = await db.query(
      `INSERT INTO public_newsletter_subscriber
         (email, name, subscribed, package_interests, source, ip_address, subscribed_at, updated_at)
       VALUES ($1, $2, true, $3::text[], $4, $5, NOW(), NOW())
       RETURNING id, email, package_interests`,
      [email, name, interests, source, ipAddress]
    );
    return { row: rows[0], isNew: true, alreadyHadComponent: false };
  }

  const prev = existing.rows[0];
  const prevInterests = Array.isArray(prev.package_interests) ? prev.package_interests : [];
  const alreadyHadComponent = !!(component && prevInterests.includes(component));
  const nextInterests = component && !alreadyHadComponent
    ? [...prevInterests, component]
    : prevInterests;

  const { rows } = await db.query(
    `UPDATE public_newsletter_subscriber
     SET name = COALESCE($2, name),
         subscribed = true,
         unsubscribed_at = NULL,
         package_interests = $3::text[],
         source = $4,
         ip_address = COALESCE($5, ip_address),
         updated_at = NOW()
     WHERE email = $1
     RETURNING id, email, package_interests`,
    [email, name, nextInterests, source, ipAddress]
  );

  return { row: rows[0], isNew: false, alreadyHadComponent };
}

async function unsubscribeByToken(token) {
  const { rows } = await db.query(
    `UPDATE public_newsletter_subscriber
     SET subscribed = false, unsubscribed_at = NOW(), updated_at = NOW()
     WHERE unsubscribe_token = $1 AND subscribed = true
     RETURNING email`,
    [token]
  );
  return rows[0] || null;
}

module.exports = {
  VALID_COMPONENTS,
  subscribePublic,
  unsubscribeByToken,
};
