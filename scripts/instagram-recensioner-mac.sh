#!/bin/bash
# Mac: lägg dina 6 bilder i source/ och kör detta skript.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/docs/marketing/instagram-recensioner/source"
OUT="$ROOT/docs/marketing/instagram-recensioner"

echo "📁 Källbilder ska ligga i:"
echo "   $SRC"
echo ""
echo "Förväntade filnamn:"
echo "   01-recensioner.png"
echo "   02-fardiga-scheman.png"
echo "   03-landing.png"
echo "   04-hem.png"
echo "   05-schema-anna.png"
echo "   06-rutiner.png"
echo ""

missing=0
for f in 01-recensioner 02-fardiga-scheman 03-landing 04-hem 05-schema-anna 06-rutiner; do
  found=0
  for ext in png jpg jpeg webp PNG JPG JPEG WEBP; do
    if [[ -f "$SRC/$f.$ext" ]]; then found=1; break; fi
  done
  if [[ $found -eq 0 ]]; then
    echo "❌ Saknas: $f"
    missing=1
  else
    echo "✓ $f"
  fi
done

if [[ $missing -eq 1 ]]; then
  echo ""
  echo "Spara dina bilder från chatten i mappen ovan och kör igen."
  open "$SRC" 2>/dev/null || true
  exit 1
fi

cd "$ROOT"
npm run instagram:recensioner
open "$OUT/instagram-recensioner.mp4"
