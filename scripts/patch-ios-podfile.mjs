#!/usr/bin/env node
/**
 * Patch ios/App/Podfile after `npx cap sync ios` for Xcode 15/16+.
 * Fixes:
 *   - double-quoted include in framework header (CapacitorCordova)
 *   - Sandbox deny on Pods-App-frameworks.sh (User Script Sandboxing)
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
      config.build_settings['ENABLE_USER_SCRIPT_SANDBOXING'] = 'NO'
    end
  end
  installer.aggregate_targets.each do |aggregate_target|
    aggregate_target.user_project.native_targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['ENABLE_USER_SCRIPT_SANDBOXING'] = 'NO'
      end
    end
  end
`;

if (!fs.existsSync(podfilePath)) {
  console.error('Podfile not found:', podfilePath);
  console.error('Run: npx cap add ios && npx cap sync ios');
  process.exit(1);
}

let content = fs.readFileSync(podfilePath, 'utf8');

const hasQuotedFix = content.includes('CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER');
const hasSandboxFix = content.includes('ENABLE_USER_SCRIPT_SANDBOXING');

if (hasQuotedFix && hasSandboxFix) {
  console.log('Podfile already patched (quoted includes + script sandbox).');
  process.exit(0);
}

if (hasQuotedFix && !hasSandboxFix) {
  content = content.replace(
    "config.build_settings['CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER'] = 'NO'",
    `config.build_settings['CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER'] = 'NO'
      config.build_settings['ENABLE_USER_SCRIPT_SANDBOXING'] = 'NO'`
  );
  if (!content.includes('installer.aggregate_targets')) {
    content = content.replace(
      /(\s+end\s+end\s+)(assertDeploymentTarget|$)/m,
      `$1  installer.aggregate_targets.each do |aggregate_target|
    aggregate_target.user_project.native_targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['ENABLE_USER_SCRIPT_SANDBOXING'] = 'NO'
      end
    end
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
console.log('Next: cd ios/App && pod install && Clean Build in Xcode');
