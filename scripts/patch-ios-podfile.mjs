#!/usr/bin/env node
/**
 * Patch ios/App/Podfile after `npx cap sync ios` for Xcode 16+.
 * Fixes: double-quoted include in framework header (CapacitorCordova).
 *
 * Usage: node scripts/patch-ios-podfile.mjs
 */
import fs from 'fs';
import path from 'path';

const podfilePath = path.join(process.cwd(), 'ios', 'App', 'Podfile');

const POST_INSTALL_BLOCK = `
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER'] = 'NO'
    end
  end
`;

if (!fs.existsSync(podfilePath)) {
  console.error('Podfile not found:', podfilePath);
  console.error('Run: npx cap add ios && npx cap sync ios');
  process.exit(1);
}

let content = fs.readFileSync(podfilePath, 'utf8');

if (content.includes('CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER')) {
  console.log('Podfile already patched.');
  process.exit(0);
}

const marker = 'post_install do |installer|';
if (!content.includes(marker)) {
  console.error('Could not find post_install block in Podfile.');
  process.exit(1);
}

content = content.replace(
  marker,
  `${marker}${POST_INSTALL_BLOCK}`
);

fs.writeFileSync(podfilePath, content);
console.log('Patched ios/App/Podfile for Xcode 16 (quoted include warnings → off).');
console.log('Next: cd ios/App && pod install && reopen Xcode');
