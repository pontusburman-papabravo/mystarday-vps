'use strict';

const { isFeatureEnabledForFamily } = require('./feature-flag-with-family-override');

const FLAG_KEY = 'adult_privilege_v1';

async function isAdultPrivilegeEnabled(familyId) {
  if (!familyId) return false;
  return isFeatureEnabledForFamily(FLAG_KEY, familyId);
}

module.exports = {
  FLAG_KEY,
  isAdultPrivilegeEnabled,
};
