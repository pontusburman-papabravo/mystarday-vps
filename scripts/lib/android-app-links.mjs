/**
 * Shared Android App Links helpers for patch + verify.
 *
 * Official sources this module implements:
 * - App Links / intent-filter data + autoVerify:
 *   https://developer.android.com/training/app-links/verify-android-applinks
 * - Digital Asset Links (host must match live assetlinks.json):
 *   https://developers.google.com/digital-asset-links/v1/getting-started
 * - pathPrefix matching on <data> elements:
 *   https://developer.android.com/guide/topics/manifest/data-element
 *
 * The canonical App Link host is the live HTTPS host. Tests override
 * ANDROID_APP_LINK_HOST so fixtures never depend on a specific domain string.
 */
export const OPEN_CHILD_PATH = '/open/child';

export const APP_LINK_PATHS = Object.freeze([
  '/accept-invite',
  '/pedagog-invite',
  '/verify-email',
  '/verify-email-change',
  '/reset-password',
  '/register',
  '/invite',
  '/child-login',
  '/child-dashboard',
  OPEN_CHILD_PATH,
]);

const DEFAULT_APP_LINK_HOST = "mystarday.se"; // pragma: allowlist secret

export function getAppLinkHost() {
  return process.env.ANDROID_APP_LINK_HOST || DEFAULT_APP_LINK_HOST;
}

function assertOpenChildRequired() {
  if (!APP_LINK_PATHS.includes(OPEN_CHILD_PATH)) {
    throw new Error(`APP_LINK_PATHS must include mandatory path ${OPEN_CHILD_PATH}`);
  }
}

function escapeRe(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findAll(xml, regex) {
  const out = [];
  const re = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : `${regex.flags}g`);
  let m;
  while ((m = re.exec(xml))) {
    out.push(m);
  }
  return out;
}

export function findMainActivityElement(manifestXml) {
  const blocks = findAll(manifestXml, /<activity\b[\s\S]*?<\/activity>/g);
  const mains = blocks.filter((m) =>
    /android:name="(?:\.|[^"]*\.)MainActivity"/.test(m[0])
  );
  if (mains.length === 0) {
    throw new Error('AndroidManifest.xml: MainActivity not found — cannot verify App Links safely');
  }
  if (mains.length > 1) {
    throw new Error(
      `AndroidManifest.xml: expected exactly one MainActivity, found ${mains.length} — cannot verify App Links safely`
    );
  }
  const m = mains[0];
  return { start: m.index, end: m.index + m[0].length, xml: m[0] };
}

function parseIntentFilters(activityXml) {
  return findAll(activityXml, /<intent-filter\b([^>]*)>([\s\S]*?)<\/intent-filter>/g).map((m) => ({
    start: m.index,
    end: m.index + m[0].length,
    xml: m[0],
    attrs: m[1] || '',
    inner: m[2] || '',
  }));
}

function collectAttrValues(xml, attr) {
  return findAll(xml, new RegExp(`android:${escapeRe(attr)}="([^"]+)"`, 'g')).map((m) => m[1]);
}

function isHttpsAutoVerifyFilter(filter) {
  if (!/\bandroid:autoVerify\s*=\s*"true"/.test(filter.attrs)) return false;
  if (!filter.inner.includes('android.intent.action.VIEW')) return false;
  if (!filter.inner.includes('android.intent.category.DEFAULT')) return false;
  if (!filter.inner.includes('android.intent.category.BROWSABLE')) return false;
  const schemes = collectAttrValues(filter.inner, 'scheme');
  return schemes.includes('https');
}

export function findHttpsAppLinkFilter(activityXml, host = getAppLinkHost()) {
  const filters = parseIntentFilters(activityXml);
  const httpsAuto = filters.filter(isHttpsAutoVerifyFilter);
  if (httpsAuto.length > 1) {
    throw new Error(
      `MainActivity has ${httpsAuto.length} HTTPS autoVerify App Link filters — cannot verify safely`
    );
  }
  if (httpsAuto.length === 0) return null;

  const filter = httpsAuto[0];
  const hosts = [...new Set(collectAttrValues(filter.inner, 'host'))];
  if (hosts.length === 0) {
    throw new Error('MainActivity HTTPS autoVerify filter has no android:host — cannot verify safely');
  }
  if (hosts.length > 1 || hosts[0] !== host) {
    throw new Error(
      `MainActivity HTTPS autoVerify host is ${hosts.join(',')} — expected ${host}`
    );
  }
  return filter;
}

export function collectPathPrefixes(filterInnerXml) {
  return collectAttrValues(filterInnerXml, 'pathPrefix');
}

function dataLine(host, prefix) {
  return `                <data android:scheme="https" android:host="${host}" android:pathPrefix="${prefix}" />`;
}

export function buildAppLinkIntentFilter(host = getAppLinkHost()) {
  assertOpenChildRequired();
  const dataLines = APP_LINK_PATHS.map((prefix) => dataLine(host, prefix)).join('\n');
  return `
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
${dataLines}
            </intent-filter>`;
}

function insertFilterAfterLauncher(activityXml, filterXml) {
  const mainIdx = activityXml.indexOf('android.intent.action.MAIN');
  if (mainIdx === -1) {
    if (!/<\/activity>\s*$/.test(activityXml)) {
      throw new Error('MainActivity has no LAUNCHER filter and no closable activity tag');
    }
    return activityXml.replace(/<\/activity>\s*$/, `${filterXml}\n        </activity>`);
  }
  const end = activityXml.indexOf('</intent-filter>', mainIdx);
  if (end === -1) {
    throw new Error('Could not find LAUNCHER intent-filter close in MainActivity');
  }
  const insertAt = end + '</intent-filter>'.length;
  return activityXml.slice(0, insertAt) + filterXml + activityXml.slice(insertAt);
}

function addMissingPathData(filterXml, host, missingPaths) {
  const lines = missingPaths.map((prefix) => `\n${dataLine(host, prefix)}`).join('');
  if (!/<\/intent-filter>\s*$/.test(filterXml)) {
    throw new Error('App Link intent-filter is missing a closing tag');
  }
  return filterXml.replace(/<\/intent-filter>\s*$/, `${lines}\n            </intent-filter>`);
}

export function verifyGeneratedAppLinks(manifestXml, host = getAppLinkHost()) {
  assertOpenChildRequired();
  const errors = [];
  let activity;
  let filter;
  try {
    activity = findMainActivityElement(manifestXml);
    filter = findHttpsAppLinkFilter(activity.xml, host);
  } catch (err) {
    return { ok: false, errors: [err.message], paths: [], host, autoVerify: false };
  }

  if (!filter) {
    errors.push('MainActivity is missing an HTTPS App Links intent-filter with android:autoVerify="true"');
    return { ok: false, errors, paths: [], host, autoVerify: false };
  }

  const paths = collectPathPrefixes(filter.inner);
  if (!/\bandroid:autoVerify\s*=\s*"true"/.test(filter.attrs)) {
    errors.push('MainActivity App Links filter is missing android:autoVerify="true"');
  }
  if (!paths.includes(OPEN_CHILD_PATH)) {
    errors.push(`MainActivity App Links filter is missing mandatory path ${OPEN_CHILD_PATH}`);
  }
  for (const required of APP_LINK_PATHS) {
    const count = paths.filter((p) => p === required).length;
    if (count === 0) {
      errors.push(`MainActivity App Links filter is missing path ${required}`);
    } else if (count > 1) {
      errors.push(`MainActivity App Links filter has duplicate path ${required} (${count})`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    paths,
    host,
    autoVerify: true,
  };
}

export function ensureMainActivityAppLinks(manifestXml, host = getAppLinkHost()) {
  assertOpenChildRequired();
  const activity = findMainActivityElement(manifestXml);
  const existing = findHttpsAppLinkFilter(activity.xml, host);
  let nextActivity = activity.xml;
  const added = [];

  if (!existing) {
    nextActivity = insertFilterAfterLauncher(nextActivity, buildAppLinkIntentFilter(host));
    added.push(...APP_LINK_PATHS);
  } else {
    const present = new Set(collectPathPrefixes(existing.inner));
    const missing = APP_LINK_PATHS.filter((p) => !present.has(p));
    if (missing.length > 0) {
      const nextFilter = addMissingPathData(existing.xml, host, missing);
      nextActivity =
        nextActivity.slice(0, existing.start) + nextFilter + nextActivity.slice(existing.end);
      added.push(...missing);
    }
  }

  const nextManifest =
    nextActivity === activity.xml
      ? manifestXml
      : manifestXml.slice(0, activity.start) + nextActivity + manifestXml.slice(activity.end);

  const verified = verifyGeneratedAppLinks(nextManifest, host);
  if (!verified.ok) {
    throw new Error(
      `App Links patch produced an unverifiable MainActivity filter:\n- ${verified.errors.join('\n- ')}`
    );
  }

  return {
    content: nextManifest,
    changed: added.length > 0,
    added,
    host,
  };
}
