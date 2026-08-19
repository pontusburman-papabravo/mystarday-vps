#!/bin/sh
# Xcode Cloud archive gates — require Meta token, never print secret values.
# Usage: . scripts/lib/xcode-cloud-archive-gate.sh

xcode_cloud_require_archive_meta_token() {
  if [ "${CI_XCODEBUILD_ACTION:-}" = "archive" ]; then
    if [ -z "${META_CLIENT_TOKEN:-}" ] || [ -z "$(printf '%s' "$META_CLIENT_TOKEN" | tr -d '[:space:]')" ]; then
      echo "ERROR: META_CLIENT_TOKEN is required for archive builds."
      echo "Configure it as a Secret environment variable in Xcode Cloud (App Store Connect)."
      exit 1
    fi
  fi
}
