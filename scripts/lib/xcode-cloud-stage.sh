#!/bin/sh
# Safe stage logging for Xcode Cloud ci_scripts (no secrets).
# Usage: . scripts/lib/xcode-cloud-stage.sh
#        xcode_cloud_run <category> <command> [args...]

xcode_cloud_run() {
  category="$1"
  shift
  stage="${XCODE_CLOUD_STAGE:-ci_script}"
  echo "[xcode-cloud] stage=${stage} category=${category} cmd=$*"
  "$@"
  exit_code=$?
  echo "[xcode-cloud] stage=${stage} category=${category} exit=${exit_code}"
  return "$exit_code"
}

xcode_cloud_node() {
  category="$1"
  shift
  stage="${XCODE_CLOUD_STAGE:-ci_script}"
  echo "[xcode-cloud] stage=${stage} category=${category} cmd=node $*"
  node "$@"
  exit_code=$?
  echo "[xcode-cloud] stage=${stage} category=${category} exit=${exit_code}"
  return "$exit_code"
}

xcode_cloud_npm() {
  category="$1"
  shift
  stage="${XCODE_CLOUD_STAGE:-ci_script}"
  echo "[xcode-cloud] stage=${stage} category=${category} cmd=npm $*"
  npm "$@"
  exit_code=$?
  echo "[xcode-cloud] stage=${stage} category=${category} exit=${exit_code}"
  return "$exit_code"
}
