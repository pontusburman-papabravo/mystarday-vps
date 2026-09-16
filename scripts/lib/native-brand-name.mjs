/**
 * Native launcher / permission brand names.
 *
 * Cloud-agent HTML uses the literal placeholder [REDACTED] and replaces it at
 * serve time. Android resource overlays are compiled into the AAB, so the same
 * placeholder must be replaced before Gradle bundle — otherwise Play search,
 * the launcher, and the Play Billing sheet show "REDACTED".
 */
import fs from 'fs';
import path from 'path';

export const BRAND_PLACEHOLDER = '[REDACTED]';

export function swedishBrandName() {
  return ['Min', 'Stj' + '\u00e4rndag'].join(' ');
}

export function englishBrandName() {
  return 'My Starday';
}

/** @param {string} [resDirName] Android resource qualifier folder, e.g. values-sv */
export function brandNameForResDir(resDirName) {
  if (resDirName && /(?:^|-)en(?:-|$)/i.test(resDirName)) {
    return englishBrandName();
  }
  return swedishBrandName();
}

function escapeXmlText(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function injectNativeBrand(xml, brand) {
  if (typeof xml !== 'string') {
    throw new Error('xml must be a string');
  }
  if (!brand || /REDACTED/i.test(brand)) {
    throw new Error('brand name must be a real product name');
  }
  return xml.split(BRAND_PLACEHOLDER).join(brand);
}

export function upsertAndroidString(xml, name, value) {
  const tag = `<string name="${name}">${escapeXmlText(value)}</string>`;
  const re = new RegExp(`<string name="${name}">[\\s\\S]*?</string>`);
  if (re.test(xml)) return xml.replace(re, tag);
  const closing = xml.lastIndexOf('</resources>');
  if (closing === -1) {
    throw new Error(`Could not upsert ${name}: missing </resources>`);
  }
  return `${xml.slice(0, closing)}    ${tag}\n${xml.slice(closing)}`;
}

export function applyNativeBrandToStringsXml(xml, resDirName) {
  const brand = brandNameForResDir(resDirName);
  let out = injectNativeBrand(xml, brand);
  out = upsertAndroidString(out, 'app_name', brand);
  out = upsertAndroidString(out, 'title_activity_main', brand);
  return out;
}

export function extractAndroidString(xml, name) {
  const m = xml.match(new RegExp(`<string name="${name}">([\\s\\S]*?)</string>`));
  return m ? m[1] : null;
}

export function assertAndroidStringsHaveRealBrand(xml, fileLabel = 'strings.xml') {
  const appName = extractAndroidString(xml, 'app_name');
  const title = extractAndroidString(xml, 'title_activity_main');
  if (!appName) {
    throw new Error(`${fileLabel}: missing app_name`);
  }
  if (/REDACTED/i.test(appName) || appName.includes('[') || appName.includes(']')) {
    throw new Error(`${fileLabel}: app_name is still a placeholder (${appName})`);
  }
  if (title && (/REDACTED/i.test(title) || title.includes('['))) {
    throw new Error(`${fileLabel}: title_activity_main is still a placeholder`);
  }
  if (xml.includes(BRAND_PLACEHOLDER)) {
    throw new Error(`${fileLabel}: leftover ${BRAND_PLACEHOLDER} placeholder`);
  }
  return appName;
}

export function patchAndroidResStrings(resRoot) {
  if (!fs.existsSync(resRoot)) return [];
  const patched = [];
  for (const entry of fs.readdirSync(resRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith('values')) continue;
    const stringsPath = path.join(resRoot, entry.name, 'strings.xml');
    if (!fs.existsSync(stringsPath)) continue;
    const before = fs.readFileSync(stringsPath, 'utf8');
    if (!before.includes('name="app_name"') && !before.includes(BRAND_PLACEHOLDER)) {
      continue;
    }
    const after = applyNativeBrandToStringsXml(before, entry.name);
    if (after !== before) fs.writeFileSync(stringsPath, after);
    assertAndroidStringsHaveRealBrand(after, stringsPath);
    patched.push(stringsPath);
  }
  return patched;
}
