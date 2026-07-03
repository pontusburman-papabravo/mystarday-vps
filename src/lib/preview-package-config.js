/**
 * Preview package content — defaults from config/preview-data.js merged with app_config overrides.
 */
const appConfig = require('../../db/app-config');
const { getAllPreviewPackages, getPreviewPackage } = require('../../config/preview-data');
const { INTEREST_COMPONENTS } = require('./package-interest-constants');

function previewConfigKey(component) {
  return `PACKAGE_PREVIEW_${component}`;
}

function contentConfigKey(component) {
  return `PACKAGE_CONTENT_${component}`;
}

function deepMerge(base, override) {
  if (!override || typeof override !== 'object') return base;
  const out = { ...base };
  for (const [key, val] of Object.entries(override)) {
    if (val && typeof val === 'object' && !Array.isArray(val) && base[key] && typeof base[key] === 'object') {
      out[key] = deepMerge(base[key], val);
    } else {
      out[key] = val;
    }
  }
  return out;
}

async function getPreviewOverride(component) {
  const raw = await appConfig.get(previewConfigKey(component));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function getMergedPreviewPackage(component) {
  const base = getPreviewPackage(component);
  if (!base) return null;
  const override = await getPreviewOverride(component);
  return override ? deepMerge(base, override) : base;
}

async function getAllMergedPreviewPackages() {
  const base = getAllPreviewPackages();
  const merged = { ...base };
  await Promise.all(
    INTEREST_COMPONENTS.map(async (component) => {
      const pkg = await getMergedPreviewPackage(component);
      if (pkg) merged[component] = pkg;
    })
  );
  return merged;
}

async function getPackageContentConfig(component, defaults) {
  const raw = await appConfig.get(contentConfigKey(component));
  if (!raw) return defaults || {};
  try {
    const parsed = JSON.parse(raw);
    return defaults ? deepMerge(defaults, parsed) : parsed;
  } catch {
    return defaults || {};
  }
}

async function setPackageContentConfig(component, data, adminId) {
  return appConfig.set(contentConfigKey(component), JSON.stringify(data), {
    description: `Paket innehåll — ${component}`,
    updated_by: adminId,
  });
}

async function setPreviewOverride(component, data, adminId) {
  return appConfig.set(previewConfigKey(component), JSON.stringify(data), {
    description: `Paket preview — ${component}`,
    updated_by: adminId,
  });
}

module.exports = {
  previewConfigKey,
  contentConfigKey,
  getMergedPreviewPackage,
  getAllMergedPreviewPackages,
  getPackageContentConfig,
  setPackageContentConfig,
  setPreviewOverride,
  getPreviewOverride,
};
