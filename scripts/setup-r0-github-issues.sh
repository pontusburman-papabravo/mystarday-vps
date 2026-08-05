#!/usr/bin/env bash
# setup-r0-github-issues.sh
# Creates labels + GitHub issues for Epic R0 (Child Reliability).
# Idempotent where possible: skips issues that already exist with exact title.
#
# Usage: ./scripts/setup-r0-github-issues.sh
# Requires: gh auth, repo write access

set -euo pipefail

REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner)"
EPIC_TITLE="Epic R0 — Child Reliability Release"
ROADMAP_BODY_FILE="docs/product-roadmap-r0-epic.md"

ensure_label() {
  local name="$1"
  local color="$2"
  local description="${3:-}"
  if gh api "repos/${REPO}/labels/${name}" >/dev/null 2>&1; then
    echo "  label exists: ${name}"
  else
    gh label create "${name}" --repo "${REPO}" --color "${color}" --description "${description}"
    echo "  created label: ${name}"
  fi
}

issue_exists() {
  local title="$1"
  gh issue list --repo "${REPO}" --state all --search "in:title \"${title}\"" --json title --jq '.[].title' 2>/dev/null | grep -Fxq "${title}"
}

create_issue() {
  local title="$1"
  local labels="$2"
  local body_file="$3"
  if issue_exists "${title}"; then
    echo "  skip (exists): ${title}"
    return 0
  fi
  gh issue create --repo "${REPO}" --title "${title}" --label "${labels}" --body-file "${body_file}"
  echo "  created: ${title}"
}

WORKDIR="$(mktemp -d)"
trap 'rm -rf "${WORKDIR}"' EXIT

extract_section() {
  local issue_id="$1"
  local outfile="${WORKDIR}/${issue_id}.md"
  awk -v id="${issue_id}" '
    $0 ~ "^# " id " " { capture=1; next }
    capture && /^# R0-/ && $0 !~ id { exit }
    capture { print }
  ' "${ROADMAP_BODY_FILE}" > "${outfile}"
  if [[ ! -s "${outfile}" ]]; then
    echo "Failed to extract section ${issue_id} from ${ROADMAP_BODY_FILE}" >&2
    exit 1
  fi
  {
    echo ""
    echo "---"
    echo "Full spec: [\`${ROADMAP_BODY_FILE}\`](https://github.com/${REPO}/blob/main/${ROADMAP_BODY_FILE})"
    echo "Roadmap: [\`docs/product-roadmap-2026-08.md\`](https://github.com/${REPO}/blob/main/docs/product-roadmap-2026-08.md)"
  } >> "${outfile}"
}

echo "== Labels =="
ensure_label "r0-child-reliability" "1D4ED8" "Epic R0 Child Reliability"
ensure_label "r0-order" "0E8A16" "R0-01 canonical schema order"
ensure_label "r0-substeps" "0E8A16" "R0-02 delsteg contract"
ensure_label "r0-perf" "FBCA04" "R0-03 child login performance"
ensure_label "r0-offline" "FBCA04" "R0-04 offline routine"
ensure_label "r0-a11y" "C5DEF5" "R0-05 child accessibility"
ensure_label "r0-support" "D4C5F9" "R0-06 support diagnostics"
ensure_label "r0-gate" "B60205" "R0-07 E2E gate"
ensure_label "ready" "FEF2C0" "Can start now"

echo "== Epic issue =="
EPIC_BODY="${WORKDIR}/epic.md"
{
  echo "# ${EPIC_TITLE}"
  echo ""
  echo "See repository doc \`${ROADMAP_BODY_FILE}\` for full breakdown."
  echo ""
  echo "## Issues (order)"
  echo "- R0-01 Canonical schema order"
  echo "- R0-02 Delsteg interaction contract"
  echo "- R0-03 Child login performance"
  echo "- R0-04 Offline daily routine"
  echo "- R0-05 Child accessibility pass"
  echo "- R0-06 Support diagnostics"
  echo "- R0-07 R0 end-to-end gate (last)"
  echo ""
  echo "**Rule:** No single mega-PR. Activity timer stays in roadmap R2."
} > "${EPIC_BODY}"

if issue_exists "${EPIC_TITLE}"; then
  echo "  skip epic (exists)"
else
  gh issue create --repo "${REPO}" --title "${EPIC_TITLE}" --label "r0-child-reliability,ready" --body-file "${EPIC_BODY}"
  echo "  created epic"
fi

echo "== Child issues =="
for spec in \
  "R0-01|r0-child-reliability,r0-order,ready" \
  "R0-02|r0-child-reliability,r0-substeps,ready" \
  "R0-03|r0-child-reliability,r0-perf,ready" \
  "R0-04|r0-child-reliability,r0-offline,ready" \
  "R0-05|r0-child-reliability,r0-a11y,ready" \
  "R0-06|r0-child-reliability,r0-support,ready" \
  "R0-07|r0-child-reliability,r0-gate"; do
  id="${spec%%|*}"
  labels="${spec#*|}"
  title="${id} — $(case $id in
    R0-01) echo "Canonical schema order" ;;
    R0-02) echo "Delsteg interaction contract" ;;
    R0-03) echo "Child login performance" ;;
    R0-04) echo "Offline daily routine" ;;
    R0-05) echo "Child accessibility pass" ;;
    R0-06) echo "Support diagnostics" ;;
    R0-07) echo "R0 end-to-end gate" ;;
  esac)"
  extract_section "${id}"
  create_issue "${title}" "${labels}" "${WORKDIR}/${id}.md"
done

echo "Done. Link issues to epic manually in GitHub Projects if used."
