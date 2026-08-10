import { registerPlugin } from '@capacitor/core';

class AdultBiometricWeb {
  isAvailable() {
    return Promise.resolve({ available: false, platform: 'web', reason: 'web_unavailable' });
  }

  authenticate() {
    return Promise.reject(new Error('BIOMETRIC_UNAVAILABLE'));
  }
}

export const AdultBiometric = registerPlugin('AdultBiometric', {
  web: () => Promise.resolve(new AdultBiometricWeb()),
});
