#!/bin/sh
# Xcode Cloud: install Node/CocoaPods deps and sync Capacitor iOS project.
set -e

cd "$CI_PRIMARY_REPOSITORY_PATH"

export HOMEBREW_NO_INSTALL_CLEANUP=TRUE

echo "📦 Installing Node.js and CocoaPods"
brew install node@20 cocoapods
brew link node@20 --overwrite --force 2>/dev/null || true

echo "📦 Installing npm dependencies"
npm config set maxsockets 3
npm ci --legacy-peer-deps --include=dev

echo "🔄 Syncing Capacitor iOS (copy assets, patch Podfile, pod install)"
npm run cap:sync:ios

echo "✅ ci_post_clone complete"
