'use strict';

/**
 * Platform auth method matrix (login + register).
 * @param {'web'|'ios-native'|'android'} platform
 */
function getAuthMethodsForPlatform(platform) {
  switch (platform) {
    case 'ios-native':
      return { apple: true, google: false, email: true, childLink: true };
    case 'android':
      return { apple: false, google: true, email: true, childLink: true };
    case 'web':
    default:
      return { apple: true, google: true, email: true, childLink: true };
  }
}

module.exports = { getAuthMethodsForPlatform };
