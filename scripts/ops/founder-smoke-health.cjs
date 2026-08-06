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
  const expectEnabled = process.env.FOUNDER_SMOKE_EXPECT_GLOBAL_ENABLED === '1';
  const expectedFlag = expectEnabled;
  if (health.english_global_flag_enabled !== expectedFlag) {
    errors.push(`${label}: english_global_flag_enabled must be ${expectedFlag}`);
  }
  return { ok: errors.length === 0, errors };
}

module.exports = { assertEnglishGlobalHealthContract };
