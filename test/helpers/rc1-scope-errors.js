'use strict';

/**
 * Runs test body then cleanup; preserves primary failure if cleanup also fails.
 */
async function executeWithPrimaryAndCleanup({ fn, cleanup, onPrimaryFailure }) {
  let result;
  let primaryError = null;
  try {
    result = await fn();
  } catch (error) {
    primaryError = error;
    if (onPrimaryFailure) onPrimaryFailure(error);
  }

  let cleanupError = null;
  try {
    await cleanup();
  } catch (error) {
    cleanupError = error;
  }

  if (primaryError && cleanupError) {
    throw new AggregateError(
      [primaryError, cleanupError],
      `Test failed and locale cleanup also failed:\nprimary=${primaryError.message}\ncleanup=${cleanupError.message}`
    );
  }
  if (primaryError) throw primaryError;
  if (cleanupError) throw cleanupError;
  return result;
}

module.exports = { executeWithPrimaryAndCleanup };
