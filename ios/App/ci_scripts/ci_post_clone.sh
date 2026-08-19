#!/bin/sh
# Xcode Cloud: install Node/CocoaPods deps and sync Capacitor iOS project.
set -e

cd "$CI_PRIMARY_REPOSITORY_PATH"
export XCODE_CLOUD_STAGE=ci_post_clone
. "$CI_PRIMARY_REPOSITORY_PATH/scripts/lib/xcode-cloud-stage.sh"
. "$CI_PRIMARY_REPOSITORY_PATH/scripts/lib/xcode-cloud-archive-gate.sh"

export HOMEBREW_NO_INSTALL_CLEANUP=TRUE

echo "📦 Installing Node.js and CocoaPods"
xcode_cloud_run brew_install brew install node@20 cocoapods

# node@20 is keg-only — link may fail silently without explicit PATH.
NODE20_PREFIX="$(brew --prefix node@20 2>/dev/null || true)"
if [ -n "$NODE20_PREFIX" ] && [ -d "$NODE20_PREFIX/bin" ]; then
  export PATH="$NODE20_PREFIX/bin:$PATH"
fi
brew link node@20 --overwrite --force 2>/dev/null || true

xcode_cloud_run node_version node --version
xcode_cloud_run npm_version npm --version

echo "📦 Installing npm dependencies"
xcode_cloud_run npm_config npm config set maxsockets 3
xcode_cloud_run npm_ci npm ci --legacy-peer-deps --include=dev

xcode_cloud_require_archive_meta_token

echo "🔄 Syncing Capacitor iOS (copy assets, patch Podfile, pod install)"
xcode_cloud_npm cap_sync_ios run cap:sync:ios

if [ "${CI_XCODEBUILD_ACTION:-}" = "archive" ]; then
  echo "🔍 Pre-build Meta/native release verification (post_clone)"
  xcode_cloud_node verify_meta_native_release scripts/verify-meta-native-release.mjs --ios
fi

echo "🔍 Verify no Google Sign-In pods"
xcode_cloud_node verify_no_google_pods scripts/verify-ios-no-google-pods.mjs

echo "✅ ci_post_clone complete"
