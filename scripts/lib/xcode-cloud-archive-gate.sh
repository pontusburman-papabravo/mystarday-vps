#!/bin/sh
# Xcode Cloud archive gates — iOS 1.4 NO-TRACKING does not require META_CLIENT_TOKEN.
# Android Meta token checks live in cap:sync:android / Play release scripts only.
# Usage: . scripts/lib/xcode-cloud-archive-gate.sh

xcode_cloud_require_archive_meta_token() {
  :
}
