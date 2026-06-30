'use strict';

class PlatformEngineError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'PlatformEngineError';
    this.code = code;
  }
}

class ManifestValidationError extends PlatformEngineError {
  constructor(message, details) {
    super(message, 'MANIFEST_VALIDATION');
    this.details = details;
  }
}

class HandlerBudgetExceededError extends PlatformEngineError {
  constructor(handlerId, elapsedMs) {
    super(`Handler ${handlerId} exceeded ${elapsedMs}ms budget`, 'HANDLER_BUDGET');
    this.handlerId = handlerId;
    this.elapsedMs = elapsedMs;
  }
}

module.exports = {
  PlatformEngineError,
  ManifestValidationError,
  HandlerBudgetExceededError,
};
