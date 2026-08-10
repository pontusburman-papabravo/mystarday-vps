'use strict';

const { registerPlugin } = require('@capacitor/core');

class AdultBiometricWeb {
  isAvailable() {
    return Promise.resolve({ available: false, platform: 'web', reason: 'web_unavailable' });
  }

  authenticate() {
    return Promise.reject(new Error('BIOMETRIC_UNAVAILABLE'));
  }
}

const AdultBiometric = registerPlugin('AdultBiometric', {
  web: () => Promise.resolve(new AdultBiometricWeb()),
});

module.exports = { AdultBiometric };
