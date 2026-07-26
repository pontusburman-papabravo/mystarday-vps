'use strict';

/**
 * Legacy generic parent role stored in parent.family_role at registration
 * before the user picks mamma/pappa/annan in settings.
 * Historical rows use the Swedish sentinel; new registrations use NULL.
 */
const LEGACY_GENERIC_PARENT_ROLE = 'f\u00f6r\u00e4lder';

/** SQL fragment for schedulers targeting the registering/primary parent row. */
const LEGACY_GENERIC_PARENT_ROLE_SQL = `(p.family_role IS NULL OR p.family_role = '${LEGACY_GENERIC_PARENT_ROLE}')`;

module.exports = {
  LEGACY_GENERIC_PARENT_ROLE,
  LEGACY_GENERIC_PARENT_ROLE_SQL,
};
