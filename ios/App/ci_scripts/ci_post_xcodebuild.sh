#!/bin/sh
# Xcode Cloud: post-archive verification (ATT/widget/Meta) on the real binary.
set -e

cd "$CI_PRIMARY_REPOSITORY_PATH"
export XCODE_CLOUD_STAGE=ci_post_xcodebuild
. "$CI_PRIMARY_REPOSITORY_PATH/scripts/lib/xcode-cloud-stage.sh"

if [ "${CI_XCODEBUILD_ACTION:-}" = "archive" ]; then
  if [ -z "${CI_ARCHIVE_PATH:-}" ]; then
    echo "ERROR: CI_ARCHIVE_PATH is required for archive post-build verification."
    exit 1
  fi
  echo "🔍 Post-archive release verification"
  xcode_cloud_node verify_archive_release scripts/verify-ios-archive-release.mjs --archive "$CI_ARCHIVE_PATH"
fi

echo "✅ ci_post_xcodebuild complete"
