/**
 * Shared Android App Links helpers for patch + verify.
 *
 * Official sources this module implements:
 * - App Link intent-filters MUST declare both http and https schemes:
 *   https://developer.android.com/training/app-links/add-applinks
 * - Auto-verify + VIEW / DEFAULT / BROWSABLE:
 *   https://developer.android.com/training/app-links/verify-android-applinks
 * - Digital Asset Links (host must match live assetlinks.json):
 *   https://developers.google.com/digital-asset-links/v1/getting-started
 * - pathPrefix matching on <data> elements:
 *   https://developer.android.com/guide/topics/manifest/data-element
 *
 * Android merges every <data> element in the same intent-filter into all
 * combinations of scheme × host × path. This module therefore uses one
 * canonical host, scheme-only <data> tags for http and https, and
 * pathPrefix-only <data> tags — never a second host.
 *
 * The canonical App Link host is the live HTTPS host. Tests override
 * ANDROID_APP_LINK_HOST so fixtures never depend on a specific domain string.
 */
export const OPEN_CHILD_PATH = '/open/child';

export const REQUIRED_APP_LINK_SCHEMES = Object.freeze(['http', 'https']);

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

function isAppLinkAutoVerifyFilter(filter) {
  if (!/\bandroid:autoVerify\s*=\s*"true"/.test(filter.attrs)) return false;
  if (!filter.inner.includes('android.intent.action.VIEW')) return false;
  if (!filter.inner.includes('android.intent.category.DEFAULT')) return false;
  if (!filter.inner.includes('android.intent.category.BROWSABLE')) return false;
  const schemes = collectAttrValues(filter.inner, 'scheme');
  return schemes.includes('http') || schemes.includes('https');
}

export function findAppLinkFilter(activityXml, host = getAppLinkHost()) {
  const filters = parseIntentFilters(activityXml);
  const appLinkFilters = filters.filter(isAppLinkAutoVerifyFilter);
  if (appLinkFilters.length > 1) {
    throw new Error(
      `MainActivity has ${appLinkFilters.length} autoVerify App Link filters — cannot verify safely`
    );
  }
  if (appLinkFilters.length === 0) return null;

  const filter = appLinkFilters[0];
  const hosts = [...new Set(collectAttrValues(filter.inner, 'host'))];
  if (hosts.length === 0) {
    throw new Error('MainActivity App Link filter has no android:host — cannot verify safely');
  }
  if (hosts.length > 1 || hosts[0] !== host) {
    throw new Error(
      `MainActivity App Link host is ${hosts.join(',')} — expected ${host}`
    );
  }
  const schemes = [...new Set(collectAttrValues(filter.inner, 'scheme'))];
  const unexpected = schemes.filter((s) => !REQUIRED_APP_LINK_SCHEMES.includes(s));
  if (unexpected.length > 0) {
    throw new Error(
      `MainActivity App Link filter has unexpected scheme(s) ${unexpected.join(',')} — cannot verify safely`
    );
  }
  return filter;
}

/** @deprecated Use findAppLinkFilter — HTTPS-only is no longer sufficient. */
export function findHttpsAppLinkFilter(activityXml, host = getAppLinkHost()) {
  return findAppLinkFilter(activityXml, host);
}

export function collectPathPrefixes(filterInnerXml) {
  return collectAttrValues(filterInnerXml, 'pathPrefix');
}

export function collectSchemes(filterInnerXml) {
  return collectAttrValues(filterInnerXml, 'scheme');
}

function schemeDataLine(scheme) {
  return `                <data android:scheme="${scheme}" />`;
}

function hostDataLine(host) {
  return `                <data android:host="${host}" />`;
}

function pathDataLine(prefix) {
  return `                <data android:pathPrefix="${prefix}" />`;
}

export function buildAppLinkIntentFilter(host = getAppLinkHost()) {
  assertOpenChildRequired();
  const schemeLines = REQUIRED_APP_LINK_SCHEMES.map(schemeDataLine).join('\n');
  const pathLines = APP_LINK_PATHS.map(pathDataLine).join('\n');
  return `
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
${schemeLines}
${hostDataLine(host)}
${pathLines}
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

function addMissingSchemes(filterXml, missingSchemes) {
  const lines = missingSchemes.map(schemeDataLine).join('\n');
  const dataIdx = filterXml.search(/<data\b/);
  if (dataIdx !== -1) {
    return filterXml.slice(0, dataIdx) + `${lines}\n` + filterXml.slice(dataIdx);
  }
  if (!/<\/intent-filter>\s*$/.test(filterXml)) {
    throw new Error('App Link intent-filter is missing a closing tag');
  }
  return filterXml.replace(/<\/intent-filter>\s*$/, `\n${lines}\n            </intent-filter>`);
}

function addMissingPathData(filterXml, missingPaths) {
  const lines = missingPaths.map((prefix) => `\n${pathDataLine(prefix)}`).join('');
  if (!/<\/intent-filter>\s*$/.test(filterXml)) {
    throw new Error('App Link intent-filter is missing a closing tag');
  }
  return filterXml.replace(/<\/intent-filter>\s*$/, `${lines}\n            </intent-filter>`);
}

function unique(values) {
  return [...new Set(values)];
}

export function verifyGeneratedAppLinks(manifestXml, host = getAppLinkHost()) {
  assertOpenChildRequired();
  const errors = [];
  let activity;
  let filter;
  try {
    activity = findMainActivityElement(manifestXml);
    filter = findAppLinkFilter(activity.xml, host);
  } catch (err) {
    return { ok: false, errors: [err.message], paths: [], schemes: [], host, autoVerify: false };
  }

  if (!filter) {
    errors.push('MainActivity is missing an App Links intent-filter with android:autoVerify="true"');
    return { ok: false, errors, paths: [], schemes: [], host, autoVerify: false };
  }

  const paths = collectPathPrefixes(filter.inner);
  const schemes = unique(collectSchemes(filter.inner));

  if (!/\bandroid:autoVerify\s*=\s*"true"/.test(filter.attrs)) {
    errors.push('MainActivity App Links filter is missing android:autoVerify="true"');
  }
  if (!filter.inner.includes('android.intent.action.VIEW')) {
    errors.push('MainActivity App Links filter is missing android.intent.action.VIEW');
  }
  if (!filter.inner.includes('android.intent.category.DEFAULT')) {
    errors.push('MainActivity App Links filter is missing android.intent.category.DEFAULT');
  }
  if (!filter.inner.includes('android.intent.category.BROWSABLE')) {
    errors.push('MainActivity App Links filter is missing android.intent.category.BROWSABLE');
  }
  if (!schemes.includes('http')) {
    errors.push('MainActivity App Links filter is missing scheme http');
  }
  if (!schemes.includes('https')) {
    errors.push('MainActivity App Links filter is missing scheme https');
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
    schemes,
    host,
    autoVerify: true,
  };
}

export function ensureMainActivityAppLinks(manifestXml, host = getAppLinkHost()) {
  assertOpenChildRequired();
  const activity = findMainActivityElement(manifestXml);
  const existing = findAppLinkFilter(activity.xml, host);
  let nextActivity = activity.xml;
  const added = [];

  if (!existing) {
    nextActivity = insertFilterAfterLauncher(nextActivity, buildAppLinkIntentFilter(host));
    added.push(...REQUIRED_APP_LINK_SCHEMES, ...APP_LINK_PATHS);
  } else {
    const presentPaths = new Set(collectPathPrefixes(existing.inner));
    const missingPaths = APP_LINK_PATHS.filter((p) => !presentPaths.has(p));
    const presentSchemes = new Set(collectSchemes(existing.inner));
    const missingSchemes = REQUIRED_APP_LINK_SCHEMES.filter((s) => !presentSchemes.has(s));

    let nextFilter = existing.xml;
    if (missingSchemes.length > 0) {
      nextFilter = addMissingSchemes(nextFilter, missingSchemes);
      added.push(...missingSchemes);
    }
    if (missingPaths.length > 0) {
      nextFilter = addMissingPathData(nextFilter, missingPaths);
      added.push(...missingPaths);
    }
    if (nextFilter !== existing.xml) {
      nextActivity =
        nextActivity.slice(0, existing.start) + nextFilter + nextActivity.slice(existing.end);
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
