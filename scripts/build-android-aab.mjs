#!/usr/bin/env node
/**
 * Build signed Android App Bundle for Google Play.
 *
 * Usage:
 *   npm run android:aab
 *   GOOGLE_WEB_CLIENT_ID=xxx.apps.googleusercontent.com npm run android:aab
 *
 * Output: assets/play-store/out/min-stjarnadag-release.aab
 *
 * Signing (first run creates upload keystore):
 *   assets/play-store/signing/mystarday-upload.keystore
 *   Passwords from env or defaults for internal test (change before production).
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SIGNING_DIR = path.join(ROOT, 'assets', 'play-store', 'signing');
const OUT_AAB = path.join(ROOT, 'assets', 'play-store', 'out', 'min-stjarnadag-release.aab');
const KEYSTORE = path.join(SIGNING_DIR, 'mystarday-upload.keystore');
const KEYSTORE_PROPS = path.join(ROOT, 'android', 'keystore.properties');

const STORE_PASS = process.env.ANDROID_KEYSTORE_PASSWORD || 'MinStjarnadagUpload2026!';
const KEY_PASS = process.env.ANDROID_KEY_PASSWORD || STORE_PASS;
const KEY_ALIAS = process.env.ANDROID_KEY_ALIAS || 'mystarday-upload';

function run(cmd, opts = {}) {
  console.log('>', cmd);
  execSync(cmd, { stdio: 'inherit', cwd: opts.cwd || ROOT, env: { ...process.env, ...opts.env } });
}

function ensureKeystore() {
  fs.mkdirSync(SIGNING_DIR, { recursive: true });
  if (fs.existsSync(KEYSTORE)) {
    console.log('Using existing keystore:', KEYSTORE);
    return;
  }
  console.log('Creating upload keystore (save this file + password for all future Play updates)…');
  run(
    `keytool -genkey -v -keystore "${KEYSTORE}" -alias ${KEY_ALIAS} ` +
      `-keyalg RSA -keysize 2048 -validity 10000 ` +
      `-storepass "${STORE_PASS}" -keypass "${KEY_PASS}" ` +
      `-dname "CN=Min Stjarnadag, OU=Mobile, O=PapaBravo, L=Stockholm, C=SE"`
  );
}

function writeKeystoreProperties() {
  const relStore = path.relative(path.join(ROOT, 'android', 'app'), KEYSTORE).replace(/\\/g, '/');
  const content = `storeFile=${relStore}
storePassword=${STORE_PASS}
keyAlias=${KEY_ALIAS}
keyPassword=${KEY_PASS}
`;
  fs.writeFileSync(KEYSTORE_PROPS, content);
  console.log('Wrote', KEYSTORE_PROPS);
}

function patchBuildGradle() {
  const gradlePath = path.join(ROOT, 'android', 'app', 'build.gradle');
  let g = fs.readFileSync(gradlePath, 'utf8');
  if (g.includes('signingConfigs')) return;

  const signingBlock = `
    signingConfigs {
        release {
            def keystorePropertiesFile = rootProject.file("keystore.properties")
            def keystoreProperties = new Properties()
            if (keystorePropertiesFile.exists()) {
                keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }
    }`;

  g = g.replace(
    /android \{\n    namespace/,
    `android {${signingBlock}\n    namespace`
  );
  g = g.replace(
    /release \{\n            minifyEnabled false/,
    `release {
            signingConfig signingConfigs.release
            minifyEnabled false`
  );
  fs.writeFileSync(gradlePath, g);
  console.log('Patched android/app/build.gradle with release signing');
}

function main() {
  fs.mkdirSync(path.dirname(OUT_AAB), { recursive: true });

  run('npm install --legacy-peer-deps');
  ensureKeystore();
  writeKeystoreProperties();
  patchBuildGradle();

  const env = { ...process.env };
  if (process.env.GOOGLE_WEB_CLIENT_ID) {
    env.GOOGLE_WEB_CLIENT_ID = process.env.GOOGLE_WEB_CLIENT_ID;
  }

  run('npm run cap:sync:android', { env });

  const androidHome = process.env.ANDROID_HOME || path.join(process.env.HOME || '', 'android-sdk');
  const gradleEnv = {
    ANDROID_HOME: androidHome,
    PATH: `${androidHome}/cmdline-tools/latest/bin:${androidHome}/platform-tools:${process.env.PATH}`,
  };

  run('./gradlew bundleRelease', { cwd: path.join(ROOT, 'android'), env: gradleEnv });

  const built = path.join(ROOT, 'android', 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab');
  if (!fs.existsSync(built)) {
    throw new Error('AAB not found at ' + built);
  }
  fs.copyFileSync(built, OUT_AAB);
  const mb = (fs.statSync(OUT_AAB).size / (1024 * 1024)).toFixed(2);
  console.log(`\n✅ AAB ready: ${OUT_AAB} (${mb} MB)`);
  console.log('\nUpload in Play Console → Testing → Internal testing → Create release');
  console.log('Keystore:', KEYSTORE);
  console.log('Alias:', KEY_ALIAS);
  if (!process.env.ANDROID_KEYSTORE_PASSWORD) {
    console.log('\n⚠️  Default upload password was used. Set ANDROID_KEYSTORE_PASSWORD before production.');
  }
}

main();
