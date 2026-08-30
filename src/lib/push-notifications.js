/**
 * Push notification utility — Web Push API via web-push package, plus
 * native push support for iOS (APNs) and Android (FCM).
 *
 * Owns: sending push notifications, subscription cleanup on 410 Gone,
 *       logging sent notifications to notification_log.
 * Does NOT own: subscription storage (routes/push.js + push_subscriptions table).
 */

const webpush = require('web-push');
const db = require('./db');
const notificationLog = require('../../db/notification-log');
const pushSubscriptions = require('../../db/push-subscriptions');
const { shouldArchiveSuccessfulPush } = require('./notification-archive');

// Configure web-push with VAPID keys once on module load.
// Keys are set as env vars — see migrations/046_push_subscriptions.js for table schema.
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:info@mystarday.se';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
} else {
  console.warn('[PUSH] VAPID keys not configured — web push notifications will not work');
}

// APNs/FCM: configured via env vars. Install node-apn for iOS, firebase-admin for Android.
// Placeholder — integrate when Apple Developer Account is available (see task blockers).
const APNs_KEY_ID = process.env.APNS_KEY_ID;
const APNs_TEAM_ID = process.env.APNS_TEAM_ID;
const APNs_KEY_PATH = process.env.APNs_KEY_PATH; // path to .p8 file
const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY;

/**
 * Send a push notification to all active subscriptions for a parent
 * (both web and native).
 *
 * @param {string} parentId - UUID of the parent account
 * @param {{ title: string, body: string, icon?: string, url?: string, type?: string, metadata?: object }} payload
 * @returns {Promise<{ sent: number, cleaned: number }>}
 */
async function sendPushNotification(parentId, { title, body, icon, url, type = 'general', metadata }) {
  const [webSubs, nativeSubs] = await Promise.all([
    pushSubscriptions.getWebSubscriptions(parentId),
    pushSubscriptions.getNativeSubscriptions(parentId),
  ]);

  if (webSubs.length === 0 && nativeSubs.length === 0) {
    return { sent: 0, cleaned: 0 };
  }

  // ── Web push ────────────────────────────────────────────────
  let webSent = 0;
  const expiredWebIds = [];

  if (webSubs.length > 0 && vapidPublicKey && vapidPrivateKey) {
    const notification = JSON.stringify({
      title,
      body,
      icon: icon || '/icon-192.png',
      badge: '/icon-192.png',
      url: url || '/',
      timestamp: Date.now(),
    });

    const options = { TTL: 86400, urgency: 'normal' };

    await Promise.allSettled(
      webSubs.map(async (row) => {
        try {
          await webpush.sendNotification(row.subscriptionJson, notification, options);
          webSent++;
        } catch (err) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            expiredWebIds.push(row.id);
          } else {
            console.error(`[PUSH] Web send failed to subscription ${row.id}:`, err.message);
          }
        }
      })
    );

    if (expiredWebIds.length > 0) {
      await db.query('DELETE FROM push_subscriptions WHERE id = ANY($1)', [expiredWebIds]);
    }
  }

  // ── Native push (APNs / FCM) ────────────────────────────────
  let nativeSent = 0;

  if (nativeSubs.length > 0) {
    for (const sub of nativeSubs) {
      try {
        if (sub.platform === 'ios') {
          await sendAPNs(sub.nativeToken, { title, body, url: url || '/' });
        } else if (sub.platform === 'android') {
          await sendFCM(sub.nativeToken, { title, body, url: url || '/' });
        }
        nativeSent++;
      } catch (err) {
        console.error(`[PUSH] Native send failed (${sub.platform}) to ${sub.id}:`, err.message);
        // Treat invalid registration as expired
        if (err.code === 'InvalidRegistration' || err.statusCode === 400) {
          await pushSubscriptions.deleteExpiredNativeSubscription(parentId, sub.nativeToken, sub.platform);
        }
      }
    }
  }

  const totalSent = webSent + nativeSent;

  // Archive only successful deliveries (best-effort — never block send)
  if (shouldArchiveSuccessfulPush(totalSent)) {
    notificationLog.logNotification(parentId, { title, body, type, url, metadata }).catch((err) => {
      console.error('[PUSH] Failed to log notification to archive:', err.message);
    });
  }

  return { sent: totalSent, cleaned: expiredWebIds.length };
}

/**
 * Send a push notification via APNs (iOS).
 * Uses raw HTTP/2 + ES256 JWT auth — no third-party packages required.
 *
 * Environment variables required:
 *   APNS_KEY_ID     — Key ID from Apple Developer (10-char string)
 *   APNS_TEAM_ID    — Apple Team ID (e.g. PQ7M3B7VW5)
 *   APNS_KEY_PATH   — Absolute path to the .p8 private key file
 *   APNS_BUNDLE_ID  — App bundle ID (e.g. com.mystarday.app)
 *
 * Environment variables that are optional:
 *   APNS_SANDBOX    — Set to "true" to use api.sandbox.push.apple.com
 *
 * Error handling:
 *   BadDeviceToken / Unregistered → token is deleted from push_subscriptions.
 *   All other Apple error codes are logged and not treated as permanent failures.
 *
 * @param {string} deviceToken  — APNs device token (hex string)
 * @param {{ title: string, body: string, url: string }} payload
 * @returns {Promise<void>}
 */
async function sendAPNs(deviceToken, { title, body, url }) {
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID || 'PQ7M3B7VW5';
  const keyPath = process.env.APNS_KEY_PATH;
  const keyContent = process.env.APNS_KEY_CONTENT;
  const bundleId = process.env.APNS_BUNDLE_ID || 'com.mystarday.app';

  if (!keyId || !teamId) {
    console.warn('[PUSH-APNs] Not configured — set APNS_KEY_ID and APNS_TEAM_ID');
    return;
  }

  const crypto = require('crypto');
  const http2 = require('http2');

  // Prefer APNS_KEY_CONTENT (PEM string from env), fall back to APNS_KEY_PATH (file)
  let keyContents;
  if (keyContent) {
    keyContents = keyContent;
  } else if (keyPath) {
    const fs = require('fs');
    try {
      keyContents = fs.readFileSync(keyPath, 'utf8');
    } catch (err) {
      console.error('[PUSH-APNs] Cannot read APNS_KEY_PATH "%s": %s', keyPath, err.message);
      return;
    }
  } else {
    console.warn('[PUSH-APNs] No key configured — set APNS_KEY_CONTENT (PEM string) or APNS_KEY_PATH');
    return;
  }

  // ── Build ES256 JWT ─────────────────────────────────────────────
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'ES256', kid: keyId })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ iss: teamId, iat: now })).toString('base64url');
  const signingInput = `${header}.${payload}`;

  // Sign with ES256 (ECDSA with SHA-256) using the .p8 key
  // .p8 format: "REDACTED"
  let privateKey;
  try {
    privateKey = crypto.createPrivateKey(keyContents);
  } catch (err) {
    console.error('[PUSH-APNs] Invalid APNS private key format: %s', err.message);
    return;
  }

  const signer = crypto.createSign('SHA256');
  signer.update(signingInput);
  const signature = signer.sign(privateKey, 'der'); // DER-encoded ECDSA signature
  // Convert DER to raw r||s format (required by Apple)
  const rawSig = derToRawEcdsa(signature, 32); // 32-byte r + 32-byte s for P-256
  const jwt = `${signingInput}.${Buffer.from(rawSig).toString('base64url')}`;

  // ── Build APNs payload ─────────────────────────────────────────
  const apsPayload = {
    aps: {
      alert: { title, body },
      sound: 'default',
      'mutable-content': 1,
    },
    data: { url: url || '/' },
  };

  // ── Send via HTTP/2 ─────────────────────────────────────────────
  const host = process.env.APNS_SANDBOX === 'true'
    ? 'api.sandbox.push.apple.com'
    : 'api.push.apple.com';

  const client = http2.connect(`https://${host}`, {
    // Apple's root CA (Baltimore CyberTrust Root) — allow self-signed for sandbox
    rejectUnauthorized: host !== 'api.sandbox.push.apple.com',
  });

  return new Promise((resolve, reject) => {
    const req = client.request({
      ':method': 'POST',
      ':path': `/3/device/${deviceToken}`,
      'apns-id': crypto.randomUUID(),
      'apns-topic': bundleId,
      'apns-push-type': 'alert',
      'authorization': `bearer ${jwt}`,
      'content-type': 'application/json',
    });

    let responseData = '';

    req.on('response', (headers) => {
      // APNs sends 200 on success; 4xx on failure
      if (headers[':status'] === 200) {
        console.log(`[PUSH-APNs] Sent to ${deviceToken.slice(0, 12)}...: "${title}"`);
        cleanupAndClose(client);
        resolve();
      } else {
        // Read error response body
        req.on('data', (chunk) => { responseData += chunk; });
        req.on('end', () => {
          let reason = 'Unknown';
          let badToken = false;
          try {
            const parsed = JSON.parse(responseData);
            reason = parsed.reason || reason;
          } catch (_) { /* raw text */ }

          if (reason === 'BadDeviceToken' || reason === 'Unregistered') {
            badToken = true;
          }

          console.error(`[PUSH-APNs] Apple error ${headers[':status']} for ${deviceToken.slice(0, 12)}...: ${reason}`);

          if (badToken) {
            // Immediately delete the expired/invalid token from push_subscriptions.
            // This is safe to do without knowing the parent_id here — the calling
            // code (sendPushNotification) handles the parent_id lookup + deletion
            // via the subscription row id (sub.id) already passed in the catch block.
            console.log(`[PUSH-APNs] Cleaning up invalid token ${deviceToken.slice(0, 12)}...`);
            pushSubscriptions.deleteNativeSubscriptionByToken(deviceToken, 'ios').catch((err) => {
              console.error('[PUSH-APNs] Failed to delete invalid token from DB:', err.message);
            });
          }
          cleanupAndClose(client);
          resolve(); // Don't reject — caller already logged the error
        });
      }
    });

    req.on('error', (err) => {
      console.error(`[PUSH-APNs] HTTP/2 error for ${deviceToken.slice(0, 12)}...: ${err.message}`);
      client.close();
      resolve(); // Non-fatal
    });

    req.end(JSON.stringify(apsPayload));

    // 10s timeout for APNs calls
    req.setTimeout(10000, () => {
      console.error(`[PUSH-APNs] Timeout for ${deviceToken.slice(0, 12)}...`);
      req.destroy();
      client.close();
      resolve();
    });
  });
}

/**
 * Convert a DER-encoded ECDSA signature to raw r||s bytes.
 * P-256 keys use 32-byte components.
 * @param {Buffer} der - DER-encoded signature
 * @param {number} componentSize - Size of r and s components in bytes
 */
function derToRawEcdsa(der, componentSize) {
  // PKCS#1 ECDSA signatures are: SEQUENCE { INTEGER r, INTEGER s }
  // DER encoding: 0x30 <len> 0x02 <r_len> <r> 0x02 <s_len> <s>
  if (der[0] !== 0x30) throw new Error('Invalid DER: not a SEQUENCE');
  let offset = 2; // skip tag + length
  // read r
  if (der[offset] !== 0x02) throw new Error('Invalid DER: r is not INTEGER');
  offset++;
  const rLen = der[offset++];
  let r = der.subarray(offset, offset + rLen);
  offset += rLen;
  // read s
  if (der[offset] !== 0x02) throw new Error('Invalid DER: s is not INTEGER');
  offset++;
  const sLen = der[offset++];
  let s = der.subarray(offset, offset + sLen);

  // Strip leading zeros and pad to componentSize
  r = stripLeadingZeros(r);
  s = stripLeadingZeros(s);
  if (r.length > componentSize || s.length > componentSize) {
    throw new Error('Invalid DER: r or s too large for key size');
  }
  const rPadded = Buffer.alloc(componentSize);
  const sPadded = Buffer.alloc(componentSize);
  r.copy(rPadded, componentSize - r.length);
  s.copy(sPadded, componentSize - s.length);
  return Buffer.concat([rPadded, sPadded]);
}

function stripLeadingZeros(buf) {
  let i = 0;
  while (i < buf.length - 1 && buf[i] === 0) i++;
  return buf.subarray(i);
}

function cleanupAndClose(client) {
  try { client.close(); } catch (_) {}
}

/**
 * Send via FCM (Android). Requires firebase-admin or FCM server key.
 * Stubbed out — enable once FCM credentials are configured.
 */
async function sendFCM(deviceToken, { title, body, url }) {
  if (!FCM_SERVER_KEY) {
    console.warn('[PUSH-FCM] Not configured — set FCM_SERVER_KEY env var');
    return;
  }
  const fetch = require('node-fetch');
  const payload = {
    to: deviceToken,
    notification: { title, body },
    data: { url: url || '/', title: title || '', body: body || '' },
    priority: 'high',
  };
  const res = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      Authorization: `key=${FCM_SERVER_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('[PUSH-FCM] send failed', res.status, text.slice(0, 200));
    throw new Error(`FCM ${res.status}`);
  }
}

const BATCH_SIZE = 25;

/**
 * Broadcast a push notification to all active subscriptions across all parents.
 * Sends in batches of BATCH_SIZE using Promise.allSettled for resilience.
 *
 * @param {{ title: string, body: string, icon?: string, url?: string, type?: string }} payload
 * @returns {Promise<{ sent: number, cleaned: number, failed: number }>}
 */
async function sendPushBroadcast({ title, body, icon, url, type = 'general' }) {
  const parentIds = await pushSubscriptions.getAllSubscribedParentIds();
  let totalSent = 0;
  let totalCleaned = 0;
  let totalFailed = 0;

  for (let i = 0; i < parentIds.length; i += BATCH_SIZE) {
    const slice = parentIds.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      slice.map(parentId => sendPushNotification(parentId, { title, body, icon, url, type }))
    );
    for (const r of results) {
      if (r.status === 'fulfilled') {
        totalSent += r.value.sent || 0;
        totalCleaned += r.value.cleaned || 0;
      } else {
        totalFailed++;
        console.error('[PUSH-BROADCAST] Failed:', r.reason?.message || r.reason);
      }
    }
  }
  return { sent: totalSent, cleaned: totalCleaned, failed: totalFailed };
}

module.exports = {
  sendPushNotification,
  sendPushBroadcast,
  vapidPublicKey,
};
