#!/bin/bash
# Öppna alla Reels-exporter i Finder (Mac)
ROOT="$(cd "$(dirname "$0")" && pwd)"
open "$ROOT/morgonrutin"
open "$ROOT/kvallrutin"
open "$ROOT/npf"
echo "Öppnade:"
echo "  morgonrutin/reels-morgonrutin.mp4"
echo "  kvallrutin/reels-kvallrutin.mp4"
echo "  npf/reels-npf.mp4"
