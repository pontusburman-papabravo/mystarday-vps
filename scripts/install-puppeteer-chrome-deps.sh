#!/usr/bin/env bash
# One-time VPS setup: Chrome system libraries for Puppeteer (Journey browser QA).
# Run on the server as a user with sudo, e.g.:
#   ssh deploy@188.66.60.93 'bash -s' < scripts/install-puppeteer-chrome-deps.sh
set -euo pipefail

PACKAGES=(
  libatk1.0-0
  libatk-bridge2.0-0
  libcups2
  libdrm2
  libxkbcommon0
  libxcomposite1
  libxdamage1
  libxfixes3
  libxrandr2
  libgbm1
  libasound2
  libpangocairo-1.0-0
  libpango-1.0-0
  libcairo2
  libnss3
  libnspr4
  libx11-6
  libx11-xcb1
  libxcb1
  libxext6
  libxi6
)

echo "→ Installing Puppeteer/Chrome dependencies…"
sudo apt-get update -qq
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq "${PACKAGES[@]}"
echo "OK — rerun Journey analysis (admin Kör om) for full headless browser QA."
