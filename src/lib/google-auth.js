'use strict';

const { OAuth2Client } = require('google-auth-library');

/**
 * Verify a Google Sign-In ID token against configured client IDs.
 * @returns {Promise<object>} Verified token payload
 */
async function verifyGoogleIdToken(idToken) {
  const audience = [
    process.env.GOOGLE_WEB_CLIENT_ID,
    process.env.GOOGLE_ANDROID_CLIENT_ID,
    process.env.GOOGLE_IOS_CLIENT_ID,
  ].filter(Boolean);

  if (audience.length === 0) {
    throw new Error('No Google client IDs configured');
  }

  const client = new OAuth2Client();
  const ticket = await client.verifyIdToken({ idToken, audience });
  const payload = ticket.getPayload();
  if (!payload) {
    throw new Error('Empty Google token payload');
  }
  return payload;
}

module.exports = { verifyGoogleIdToken };
