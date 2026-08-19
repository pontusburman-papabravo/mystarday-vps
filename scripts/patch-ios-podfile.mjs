#!/usr/bin/env node
/**
 * Patch ios/App/Podfile after `npx cap sync ios` for Xcode 15/16+.
 * Fixes:
 *   - double-quoted include in framework header (CapacitorCordova)
 *   - Sandbox deny on Pods-App-frameworks.sh (User Script Sandboxing)
 *   - Remove Google Auth pod on iOS (Android-only; old GoogleSignIn SDK lacks privacy manifest)
 *
 * Usage: node scripts/patch-ios-podfile.mjs
 */
import fs from 'fs';
import path from 'path';

const podfilePath = path.join(process.cwd(), 'ios', 'App', 'Podfile');

const PODFILE_PLATFORM = '15.0';
const PODFILE_PLATFORM_LINE = `platform :ios, '${PODFILE_PLATFORM}'`;
const PODFILE_PLATFORM_RE = /^platform :ios, ['"][\d.]+['"]/m;

const POST_INSTALL_BLOCK = `
  installer.pods_project.build_configurations.each do |config|
    config.build_settings['ENABLE_USER_SCRIPT_SANDBOXING'] = 'NO'
  end
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER'] = 'NO'
      config.build_settings['ENABLE_USER_SCRIPT_SANDBOXING'] = 'NO'
    end
  end
  installer.aggregate_targets.each do |aggregate_target|
    aggregate_target.user_project.build_configurations.each do |config|
      config.build_settings['ENABLE_USER_SCRIPT_SANDBOXING'] = 'NO'
    end
    aggregate_target.user_project.native_targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['ENABLE_USER_SCRIPT_SANDBOXING'] = 'NO'
      end
    end
    aggregate_target.user_project.save
  end
`;

if (!fs.existsSync(podfilePath)) {
  console.error('Podfile not found:', podfilePath);
  console.error('Run: npx cap add ios && npx cap sync ios');
  process.exit(1);
}

let content = fs.readFileSync(podfilePath, 'utf8');

const GOOGLE_AUTH_POD =
  /^\s*pod 'CodetrixStudioCapacitorGoogleAuth'.*\n/m;
if (GOOGLE_AUTH_POD.test(content)) {
  content = content.replace(GOOGLE_AUTH_POD, '');
  console.log('Removed CodetrixStudioCapacitorGoogleAuth from iOS Podfile (Android-only plugin).');
}

const ATT_POD =
  /^\s*pod 'CapacitorPluginAppTrackingTransparency'.*\n/m;
if (ATT_POD.test(content)) {
  content = content.replace(ATT_POD, '');
  console.log('Removed CapacitorPluginAppTrackingTransparency from iOS Podfile (no ATT / no IDFA).');
}

const META_POD = /^\s*pod 'CapacitorFacebookEvents'.*\n/m;
if (META_POD.test(content)) {
  content = content.replace(META_POD, '');
  console.log('Removed CapacitorFacebookEvents from iOS Podfile (iOS 1.4 NO-TRACKING — no Meta native SDK).');
}

if (!PODFILE_PLATFORM_RE.test(content)) {
  console.error('[patch-ios-podfile] Could not find platform :ios line in Podfile.');
  process.exit(1);
}
if (!content.includes(PODFILE_PLATFORM_LINE)) {
  content = content.replace(PODFILE_PLATFORM_RE, PODFILE_PLATFORM_LINE);
  console.log(`[patch-ios-podfile] Set Podfile platform to iOS ${PODFILE_PLATFORM}.`);
}

const hasQuotedFix = content.includes('CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER');
const hasSandboxFix = content.includes('ENABLE_USER_SCRIPT_SANDBOXING');
const hasSaveFix = content.includes('user_project.save');

if (hasQuotedFix && hasSandboxFix && hasSaveFix) {
  fs.writeFileSync(podfilePath, content);
  console.log('Podfile already patched (quoted includes + script sandbox + save).');
  process.exit(0);
}

if (hasQuotedFix && hasSandboxFix && !hasSaveFix) {
  // Upgrade older patch: add project-level configs + save
  if (!content.includes('installer.pods_project.build_configurations')) {
    content = content.replace(
      /installer\.pods_project\.targets\.each do \|target\|/,
      `installer.pods_project.build_configurations.each do |config|
    config.build_settings['ENABLE_USER_SCRIPT_SANDBOXING'] = 'NO'
  end
  installer.pods_project.targets.each do |target|`
    );
  }
  if (content.includes('installer.aggregate_targets') && !content.includes('user_project.build_configurations')) {
    content = content.replace(
      /installer\.aggregate_targets\.each do \|aggregate_target\|/,
      `installer.aggregate_targets.each do |aggregate_target|
    aggregate_target.user_project.build_configurations.each do |config|
      config.build_settings['ENABLE_USER_SCRIPT_SANDBOXING'] = 'NO'
    end`
    );
  }
  if (!content.includes('user_project.save')) {
    content = content.replace(
      /(installer\.aggregate_targets\.each do \|aggregate_target\|[\s\S]*?)(\s+end\s+end)/m,
      (match, body, closing) => {
        if (body.includes('user_project.save')) return match;
        return `${body}
    aggregate_target.user_project.save${closing}`;
      }
    );
  }
} else if (hasQuotedFix && !hasSandboxFix) {
  content = content.replace(
    "config.build_settings['CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER'] = 'NO'",
    `config.build_settings['CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER'] = 'NO'
      config.build_settings['ENABLE_USER_SCRIPT_SANDBOXING'] = 'NO'`
  );
  if (!content.includes('installer.aggregate_targets')) {
    content = content.replace(
      /(\s+end\s+end\s+)(assertDeploymentTarget|$)/m,
      `$1  installer.aggregate_targets.each do |aggregate_target|
    aggregate_target.user_project.build_configurations.each do |config|
      config.build_settings['ENABLE_USER_SCRIPT_SANDBOXING'] = 'NO'
    end
    aggregate_target.user_project.native_targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['ENABLE_USER_SCRIPT_SANDBOXING'] = 'NO'
      end
    end
    aggregate_target.user_project.save
  end
$2`
    );
  }
} else {
  const marker = 'post_install do |installer|';
  if (!content.includes(marker)) {
    console.error('Could not find post_install block in Podfile.');
    process.exit(1);
  }
  content = content.replace(marker, `${marker}${POST_INSTALL_BLOCK}`);
}

fs.writeFileSync(podfilePath, content);
console.log('Patched ios/App/Podfile for Xcode 15/16.');
console.log('Next: cd ios/App && pod install');
