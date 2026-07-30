#!/usr/bin/env bash
set -euo pipefail
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
ROOT="/workspace"
USER="$(node -e "console.log(new URL(process.env.DATABASE_URL).username)")"
MAIN_URL="$(node -e "const u=new URL(process.env.DATABASE_URL); u.pathname='/compare_npmtest_main'; console.log(u.toString())")"
PR_URL="$(node -e "const u=new URL(process.env.DATABASE_URL); u.pathname='/compare_npmtest_pr'; console.log(u.toString())")"

sudo -u postgres psql -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS compare_npmtest_main;" -c "DROP DATABASE IF EXISTS compare_npmtest_pr;" -c "CREATE DATABASE compare_npmtest_main OWNER \"$USER\";" -c "CREATE DATABASE compare_npmtest_pr OWNER \"$USER\";"

cd "$ROOT/.compare-worktrees/main-db1d27d"
npm ci --legacy-peer-deps --include=dev
DATABASE_URL="$MAIN_URL" npm run migrate

cd "$ROOT"
DATABASE_URL="$PR_URL" npm run migrate

run_one() {
  local label="$1"
  local dir="$2"
  local url="$3"
  local out="$4"
  cd "$dir"
  set +e
  NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false env -u RESEND_API_KEY DATABASE_URL="$url" \
    node --test test/*.test.js > "$out" 2>&1
  ec=$?
  set -e
  echo "${label}_EXIT=$ec" >> "$out"
  grep -E '^# (pass|fail|skip|cancelled) ' "$out" | tail -4
}

run_one MAIN "$ROOT/.compare-worktrees/main-db1d27d" "$MAIN_URL" /tmp/npmtest-main.tap &
PID_MAIN=$!
run_one PR "$ROOT" "$PR_URL" /tmp/npmtest-pr.tap &
PID_PR=$!
wait "$PID_MAIN" || true
wait "$PID_PR" || true

node <<'NODE'
const fs = require('fs');
function fails(path) {
  const lines = fs.readFileSync(path, 'utf8').split('\n');
  const set = new Set();
  for (const line of lines) {
    if (line.startsWith('not ok ')) {
      set.add(line.replace(/^not ok \d+ - /, '').trim());
    }
  }
  return [...set].sort();
}
const main = fails('/tmp/npmtest-main.tap');
const pr = fails('/tmp/npmtest-pr.tap');
const mainSet = new Set(main);
const prSet = new Set(pr);
const both = main.filter((x) => prSet.has(x));
const onlyMain = main.filter((x) => !prSet.has(x));
const onlyPr = pr.filter((x) => !mainSet.has(x));
const report = {
  mainCount: main.length,
  prCount: pr.length,
  both,
  onlyMain,
  onlyPr,
};
fs.writeFileSync('/tmp/npmtest-compare.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ mainCount: main.length, prCount: pr.length, onlyMain: onlyMain.length, onlyPr: onlyPr.length, both: both.length }));
NODE
