#!/usr/bin/env bash
# barnets-samling-post-583-merge.sh
# After PR #583 merge: cleanup test issues, unblock Fas A, mark ready.
# Idempotent — safe to re-run.
#
# Usage: ./scripts/barnets-samling-post-583-merge.sh

set -euo pipefail

REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner)"
FAS_A_EPIC=594
FAS_A_TICKETS=(588 589 590 591 592 593)
FAS_A_READY=(${FAS_A_EPIC} "${FAS_A_TICKETS[@]}")
TEST_ISSUES=(596 597)
UNBLOCK_COMMENT="Feature gate merged. Fas A kan börja."

echo "==> Repo: ${REPO}"
echo "==> Verify #583 merged"
PR_STATE="$(gh pr view 583 --repo "${REPO}" --json state -q .state 2>/dev/null || echo "MISSING")"
if [[ "${PR_STATE}" != "MERGED" ]]; then
  echo "ERROR: PR #583 is not merged (state=${PR_STATE}). Abort."
  exit 1
fi
echo "    PR #583 merged"

echo "==> Close test issues"
for n in "${TEST_ISSUES[@]}"; do
  state="$(gh issue view "${n}" --repo "${REPO}" --json state -q .state 2>/dev/null || echo "MISSING")"
  if [[ "${state}" == "OPEN" ]]; then
    gh issue close "${n}" --repo "${REPO}" --comment "test/cleanup"
    echo "    closed #${n}"
  else
    echo "    skip #${n} (${state})"
  fi
done

echo "==> Unblock Fas A (remove blocked, add ready)"
for n in "${FAS_A_READY[@]}"; do
  gh issue edit "${n}" --repo "${REPO}" \
    --remove-label "blocked" \
    --add-label "ready"
  echo "    #${n}: blocked → ready"
done

echo "==> Epic #${FAS_A_EPIC} kickoff comment"
if gh issue view "${FAS_A_EPIC}" --repo "${REPO}" --comments \
  --json comments --jq '.comments[].body' 2>/dev/null | grep -Fq "${UNBLOCK_COMMENT}"; then
  echo "    comment exists on #${FAS_A_EPIC}"
else
  gh issue comment "${FAS_A_EPIC}" --repo "${REPO}" --body "${UNBLOCK_COMMENT}"
  echo "    commented on #${FAS_A_EPIC}"
fi

cat <<EOF

==> Klart

Roadmap:     #600
Filter:      https://github.com/${REPO}/labels/barnets-samling
Fas A order: #588 → #589 → #590 → #591 → #592 → #593

Nästa ticket: #588
EOF
