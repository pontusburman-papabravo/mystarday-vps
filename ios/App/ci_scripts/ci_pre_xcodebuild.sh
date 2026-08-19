#!/bin/sh
# Xcode Cloud: refresh Pods after post_clone without re-running pbx-modifying patches.
set -e

cd "$CI_PRIMARY_REPOSITORY_PATH"
export XCODE_CLOUD_STAGE=ci_pre_xcodebuild
. "$CI_PRIMARY_REPOSITORY_PATH/scripts/lib/xcode-cloud-stage.sh"
. "$CI_PRIMARY_REPOSITORY_PATH/scripts/lib/xcode-cloud-archive-gate.sh"

NODE20_PREFIX="$(brew --prefix node@20 2>/dev/null || true)"
if [ -n "$NODE20_PREFIX" ] && [ -d "$NODE20_PREFIX/bin" ]; then
  export PATH="$NODE20_PREFIX/bin:$PATH"
fi

echo "🧹 Refresh Pods tree (no Google Sign-In SDK)"
xcode_cloud_node prepare_native scripts/prepare-ios-native.mjs

echo "📦 pod install (reuse post_clone patches — no second cap:sync:ios)"
xcode_cloud_run pod_install sh -c 'cd ios/App && pod install'

echo "🔍 Verify Apple Sign In iPad patch still present"
xcode_cloud_node verify_apple_sign_in scripts/verify-ios-apple-sign-in-patch.mjs

echo "🔍 Verify no Google Sign-In pods"
xcode_cloud_node verify_no_google_pods scripts/verify-ios-no-google-pods.mjs

if [ "${CI_XCODEBUILD_ACTION:-}" = "archive" ]; then
  xcode_cloud_require_archive_meta_token
  echo "🔢 Apply Xcode Cloud build number (CI_BUILD_NUMBER)"
  xcode_cloud_node patch_build_number scripts/patch-ios-xcode-cloud-build-number.mjs
  echo "🔍 Pre-archive Meta/native release verification"
  xcode_cloud_node verify_meta_native_release scripts/verify-meta-native-release.mjs --ios
fi

echo "✅ ci_pre_xcodebuild complete"
