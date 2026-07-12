#!/usr/bin/env bash
# Release gate: verify avatar prefixes are not publicly readable.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "== Family Avatar v1 — storage privacy check =="

if [[ -z "${R2_PUBLIC_BASE_URL:-}" ]]; then
  echo "WARN: R2_PUBLIC_BASE_URL unset — skip direct legacy URL probe."
  echo "      Set to prod public base (e.g. https://pub….r2.dev) and re-run before release."
else
  LEGACY_SAMPLE="${AVATAR_LEGACY_TEST_URL:-${R2_PUBLIC_BASE_URL%/}/avatars/.well-known-privacy-probe}"
  echo "Probing legacy public URL (expect non-200): $LEGACY_SAMPLE"
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$LEGACY_SAMPLE" || true)
  if [[ "$HTTP_CODE" == "200" ]]; then
    echo "FAIL: Legacy avatars/ prefix returned 200 — bucket may still be public."
    exit 1
  fi
  echo "OK: Legacy probe returned $HTTP_CODE (not 200)."
fi

if [[ -n "${APP_BASE_URL:-}" ]]; then
  PROBE_URL="${APP_BASE_URL%/}/api/avatars/child/00000000-0000-0000-0000-000000000001"
  echo "Probing app proxy without auth (expect 404): $PROBE_URL"
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$PROBE_URL" || true)
  if [[ "$HTTP_CODE" != "404" ]]; then
    echo "FAIL: Unauthenticated avatar GET returned $HTTP_CODE (expected 404)."
    exit 1
  fi
  echo "OK: Unauthenticated proxy returned 404."
else
  echo "WARN: APP_BASE_URL unset — skip unauthenticated /api/avatars probe."
fi

echo "== Manual follow-up =="
echo "1. R2 console: confirm avatars/ and avatars-private/ have no public read policy."
echo "2. Test a known pre-migration object URL if you have one — must not return image bytes."
echo "3. See docs/ops-family-avatar-release.md for full checklist."

echo "== Done (automated probes passed or skipped with WARN) =="
