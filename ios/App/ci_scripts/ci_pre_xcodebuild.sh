#!/bin/sh
# Xcode Cloud: ensure stale Pods (GoogleSignIn) are gone before archive.
set -e

cd "$CI_PRIMARY_REPOSITORY_PATH"

echo "🧹 Prepare clean iOS native tree (no Google Sign-In SDK)"
node scripts/prepare-ios-native.mjs

echo "🔄 Re-sync iOS + fresh pod install"
npm run cap:sync:ios

echo "🔍 Verify no Google Sign-In pods"
node scripts/verify-ios-no-google-pods.mjs

echo "✅ ci_pre_xcodebuild complete"
