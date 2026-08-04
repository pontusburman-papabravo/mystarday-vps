#!/usr/bin/env bash
# Activation full Android QA — prod API gate + adb app launch. No WebView CDP.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
export PATH="${HOME}/.nvm/versions/node/v20.20.2/bin:${HOME}/Library/Android/sdk/platform-tools:${PATH}"

if [ -f "${ACTIVATION_QA_SECRETS_FILE:-$HOME/.config/mystarday/founder-activation-qa.env}" ]; then
  set -a
  # shellcheck disable=SC1090
  source "${ACTIVATION_QA_SECRETS_FILE:-$HOME/.config/mystarday/founder-activation-qa.env}"
  set +a
fi

cd "$ROOT"
NODE_ENV=development node scripts/ops/activation-qa-prod-gate.mjs
code=$?
if [ "$code" -ne 0 ]; then
  echo ""
  echo "Om BLOCKED: lägg QA_PASSWORD (min 12 tecken, samma som vid provision av QA-familjen) i"
  echo "  ~/.config/mystarday/founder-activation-qa.env"
  echo "Kör sedan detta skript igen."
  exit "$code"
fi

echo ""
echo "=== Fysisk Android (SM-G991B) — gör på telefonen ==="
echo "1. Tvinga stopp om appen flimrar."
echo "2. Logga in QA-förälder (founder-activation-qa-sv @test.stjarndag.local) — INTE barn först."
echo "3. Hem: exakt en First Success-coach."
echo "4. Barnväljare → qaactsv → PIN från mode-600 secretfil (QA_CHILD_PIN)."
echo "5. Idag → delsteg → en stjärna → tillbaka till förälder → coach borta/avancerad."
echo "6. Bakgrund + force close → session kvar."
echo "Skriv till agenten: android qa pass (utan lösenord/PIN)."
