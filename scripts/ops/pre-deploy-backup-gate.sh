#!/usr/bin/env bash
# Thin wrapper for VPS deploy — runs Node backup gate implementation.
set -Eeuo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node "$SCRIPT_DIR/pre-deploy-backup-gate.mjs" "$@"
