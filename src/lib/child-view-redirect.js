/**
 * child-view-redirect.js — Resolve child view URL from view_mode + family magic access.
 */

/**
 * @param {object} opts
 * @param {'classic'|'new'|undefined} opts.viewMode
 * @param {string} opts.childId
 * @param {string} opts.familyId
 * @param {function(string): Promise<boolean>} opts.hasMagicAccess
 * @returns {Promise<string>}
 */
async function resolveChildViewPath({ viewMode, childId, familyId, hasMagicAccess }) {
  if (viewMode === 'new') {
    const magic = await hasMagicAccess(familyId);
    if (magic) {
      return `/child-dashboard?child=${childId}`;
    }
    return `/child-new/${childId}`;
  }
  return `/child-dashboard?child=${childId}`;
}

module.exports = { resolveChildViewPath };
