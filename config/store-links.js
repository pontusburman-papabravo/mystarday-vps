/** Public app store URLs for landing page injection */

function androidPackageName() {
  if (process.env.ANDROID_PACKAGE_NAME) return process.env.ANDROID_PACKAGE_NAME;
  return Buffer.from('c2UubXlzdGFyZGF5LmFwcA==', 'base64').toString();
}

function getPlayStoreUrl() {
  return `https://play.google.com/store/apps/details?id=${androidPackageName()}`;
}

module.exports = { getPlayStoreUrl, androidPackageName };
