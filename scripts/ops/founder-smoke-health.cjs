'use strict';

function assertEnglishGlobalHealthContract(health, label = 'health') {
  const errors = [];
  if (!health || typeof health !== 'object') {
    return { ok: false, errors: [`${label}: missing`] };
  }
  if (health.english_global_flag_read_ok !== true) {
    errors.push(`${label}: english_global_flag_read_ok must be true`);
  }
  if (health.english_global_flag_row_present !== true) {
    errors.push(`${label}: english_global_flag_row_present must be true`);
  }
  if (health.english_global_flag_enabled !== false) {
    errors.push(`${label}: english_global_flag_enabled must be false`);
  }
  return { ok: errors.length === 0, errors };
}

module.exports = { assertEnglishGlobalHealthContract };
