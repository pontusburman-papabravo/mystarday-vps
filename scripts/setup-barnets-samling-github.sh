#!/usr/bin/env bash
# setup-barnets-samling-github.sh
# Creates milestone + Project for Barnets samling v1.
# Requires: gh auth login with project + repo scope (run from repo root as owner).
#
# Usage: ./scripts/setup-barnets-samling-github.sh

set -euo pipefail

REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner)"
OWNER="${REPO%%/*}"
MILESTONE_TITLE="Barnets samling v1"
PROJECT_TITLE="Barnets samling"

ITEM_NUMBERS=(583 594 588 589 590 591 592 593 584 585 586 587)
ITEM_KINDS=(pr issue issue issue issue issue issue issue issue issue issue issue)

MILESTONE_ISSUES=(594 588 589 590 591 592 593 584 585 586 587)
FAS_A_ISSUES=(594 588 589 590 591 592 593)

echo "==> Repo: ${REPO}"
echo "==> Milestone: ${MILESTONE_TITLE}"

MILESTONE_NUMBER="$(
  gh api "repos/${REPO}/milestones" --method GET --paginate \
    --jq ".[] | select(.title==\"${MILESTONE_TITLE}\") | .number" 2>/dev/null | head -1 || true
)"

if [[ -z "${MILESTONE_NUMBER}" ]]; then
  MILESTONE_NUMBER="$(
    gh api "repos/${REPO}/milestones" --method POST \
      -f title="${MILESTONE_TITLE}" \
      -f description="Produktkompass Barnets samling. Spec: docs/barnets-samling-vision.md. Fas A före B–E." \
      --jq .number
  )"
  echo "    Created milestone #${MILESTONE_NUMBER}"
else
  echo "    Reusing milestone #${MILESTONE_NUMBER}"
fi

echo "==> Assign milestone"
for n in "${MILESTONE_ISSUES[@]}"; do
  gh issue edit "${n}" --repo "${REPO}" --milestone "${MILESTONE_TITLE}"
  echo "    issue #${n}"
done
gh pr edit 583 --repo "${REPO}" --milestone "${MILESTONE_TITLE}"
echo "    PR #583"

echo "==> Project: ${PROJECT_TITLE}"

PROJECT_NUMBER="$(
  gh project list --owner "${OWNER}" --format json \
    --jq ".projects[] | select(.title==\"${PROJECT_TITLE}\") | .number" 2>/dev/null | head -1 || true
)"

if [[ -z "${PROJECT_NUMBER}" ]]; then
  PROJECT_NUMBER="$(
    gh project create --owner "${OWNER}" --title "${PROJECT_TITLE}" --format json -q .number
  )"
  echo "    Created project #${PROJECT_NUMBER}"
else
  echo "    Reusing project #${PROJECT_NUMBER}"
fi

gh project link "${PROJECT_NUMBER}" --owner "${OWNER}" --repo "${REPO}" 2>/dev/null || true

echo "==> Add items to project (top → bottom)"
for i in "${!ITEM_NUMBERS[@]}"; do
  num="${ITEM_NUMBERS[$i]}"
  kind="${ITEM_KINDS[$i]}"
  if [[ "${kind}" == "pr" ]]; then
    url="$(gh pr view "${num}" --repo "${REPO}" --json url -q .url)"
  else
    url="$(gh issue view "${num}" --repo "${REPO}" --json url -q .url)"
  fi
  gh project item-add "${PROJECT_NUMBER}" --owner "${OWNER}" --url "${url}" >/dev/null 2>&1 \
    || echo "    (already in project?) #${num}"
  echo "    ${kind} #${num}"
done

echo "==> Blockers: PR #583 → Fas A (#594, #588–#593)"
PR_NODE="$(gh pr view 583 --repo "${REPO}" --json id -q .id)"
for n in "${FAS_A_ISSUES[@]}"; do
  ISSUE_NODE="$(gh issue view "${n}" --repo "${REPO}" --json id -q .id)"
  if gh api graphql -f query="
    mutation {
      addBlockedBy(input: {
        issueId: \"${ISSUE_NODE}\"
        blockingIssueId: \"${PR_NODE}\"
      }) { clientMutationId }
    }" >/dev/null 2>&1; then
    echo "    #${n} blocked by #583"
  else
    echo "    WARN: set blocker manually — #${n} blocked by PR #583 (GitHub UI → Relationships)"
  fi
done

cat <<EOF

==> Manual steps in GitHub Project UI (first time)

1. Status field → options:
   Backlog | Ready | In progress | Review | Done

2. Set status:
   - #583 PR        → Ready
   - #594–#593      → Backlog (move #594 to Ready after #583 merged)
   - #584–#587      → Backlog

3. Drag items to match order in docs/barnets-samling-github-roadmap.md

Done.
  Milestone: https://github.com/${REPO}/milestone/${MILESTONE_NUMBER}
  Project:   https://github.com/users/${OWNER}/projects/${PROJECT_NUMBER}
  Roadmap:   docs/barnets-samling-github-roadmap.md
EOF
