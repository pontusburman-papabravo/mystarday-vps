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

# Project order (top → bottom)
ITEM_NUMBERS=(583 594 588 589 590 591 592 593 584 585 586 587)
ITEM_KINDS=(pr issue issue issue issue issue issue issue issue issue issue issue)

MILESTONE_ISSUES=(594 588 589 590 591 592 593 584 585 586 587)
FAS_A_ISSUES=(594 588 589 590 591 592 593)

# Status targets: Ready for rollout PR, Backlog for everything else
READY_ITEM=583

gh_graphql() {
  gh api graphql -f query="$1" "${@:2}"
}

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

PROJECT_ID="$(
  gh project view "${PROJECT_NUMBER}" --owner "${OWNER}" --format json -q .id
)"

echo "==> Add items to project"
declare -A ITEM_NODES=()
for i in "${!ITEM_NUMBERS[@]}"; do
  num="${ITEM_NUMBERS[$i]}"
  kind="${ITEM_KINDS[$i]}"
  if [[ "${kind}" == "pr" ]]; then
    url="$(gh pr view "${num}" --repo "${REPO}" --json url -q .url)"
  else
    url="$(gh issue view "${num}" --repo "${REPO}" --json url -q .url)"
  fi
  item_json="$(gh project item-add "${PROJECT_NUMBER}" --owner "${OWNER}" --url "${url}" --format json 2>/dev/null || true)"
  if [[ -z "${item_json}" ]]; then
    echo "    (already in project?) #${num}"
    item_json="$(gh_graphql "
      query {
        user(login: \"${OWNER}\") {
          projectV2(number: ${PROJECT_NUMBER}) {
            items(first: 100) {
              nodes {
                id
                content {
                  ... on Issue { number }
                  ... on PullRequest { number }
                }
              }
            }
          }
        }
      }
    " --jq ".data.user.projectV2.items.nodes[] | select(.content.number==${num}) | {id: .id}" 2>/dev/null || echo '{}')"
  fi
  node_id="$(echo "${item_json}" | jq -r '.id // empty')"
  if [[ -n "${node_id}" ]]; then
    ITEM_NODES["${num}"]="${node_id}"
  fi
  echo "    ${kind} #${num}"
done

echo "==> Order items (top → bottom per roadmap)"
prev_id=""
for num in "${ITEM_NUMBERS[@]}"; do
  item_id="${ITEM_NODES[$num]:-}"
  [[ -z "${item_id}" ]] && continue
  if [[ -z "${prev_id}" ]]; then
    gh_graphql "
      mutation {
        updateProjectV2ItemPosition(input: {
          projectId: \"${PROJECT_ID}\"
          itemId: \"${item_id}\"
        }) { clientMutationId }
      }
    " >/dev/null 2>&1 || true
  else
    gh_graphql "
      mutation {
        updateProjectV2ItemPosition(input: {
          projectId: \"${PROJECT_ID}\"
          itemId: \"${item_id}\"
          afterId: \"${prev_id}\"
        }) { clientMutationId }
      }
    " >/dev/null 2>&1 || true
  fi
  prev_id="${item_id}"
  echo "    positioned #${num}"
done

echo "==> Status field (#${READY_ITEM} → Ready, övriga → Backlog)"
STATUS_FIELD_JSON="$(gh_graphql "
  query {
    node(id: \"${PROJECT_ID}\") {
      ... on ProjectV2 {
        fields(first: 30) {
          nodes {
            ... on ProjectV2SingleSelectField {
              id
              name
              options { id name }
            }
          }
        }
      }
    }
  }
")"

STATUS_FIELD_ID="$(echo "${STATUS_FIELD_JSON}" | jq -r '.data.node.fields.nodes[] | select(.name=="Status") | .id' | head -1)"
BACKLOG_OPT="$(echo "${STATUS_FIELD_JSON}" | jq -r '.data.node.fields.nodes[] | select(.name=="Status") | .options[] | select(.name|test("(?i)^backlog$")) | .id' | head -1)"
READY_OPT="$(echo "${STATUS_FIELD_JSON}" | jq -r '.data.node.fields.nodes[] | select(.name=="Status") | .options[] | select(.name|test("(?i)^ready$")) | .id' | head -1)"

if [[ -z "${STATUS_FIELD_ID}" || -z "${BACKLOG_OPT}" || -z "${READY_OPT}" ]]; then
  echo "    WARN: Status field saknar Backlog/Ready — justera manuellt i Project UI:"
  echo "          Backlog | Ready | In progress | Review | Done"
else
  for num in "${ITEM_NUMBERS[@]}"; do
    item_id="${ITEM_NODES[$num]:-}"
    [[ -z "${item_id}" ]] && continue
    if [[ "${num}" == "${READY_ITEM}" ]]; then
      opt_id="${READY_OPT}"
      label="Ready"
    else
      opt_id="${BACKLOG_OPT}"
      label="Backlog"
    fi
    gh_graphql "
      mutation {
        updateProjectV2ItemFieldValue(input: {
          projectId: \"${PROJECT_ID}\"
          itemId: \"${item_id}\"
          fieldId: \"${STATUS_FIELD_ID}\"
          value: { singleSelectOptionId: \"${opt_id}\" }
        }) { clientMutationId }
      }
    " >/dev/null 2>&1 && echo "    #${num} → ${label}" || echo "    WARN: kunde inte sätta status på #${num}"
  done
fi

echo "==> Blockers: PR #583 → Fas A (#594, #588–#593)"
PR_NODE="$(gh pr view 583 --repo "${REPO}" --json id -q .id)"
for n in "${FAS_A_ISSUES[@]}"; do
  ISSUE_NODE="$(gh issue view "${n}" --repo "${REPO}" --json id -q .id)"
  if gh_graphql "
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

==> Klart

Milestone: https://github.com/${REPO}/milestone/${MILESTONE_NUMBER}
Project:   https://github.com/users/${OWNER}/projects/${PROJECT_NUMBER}
Roadmap:   docs/barnets-samling-github-roadmap.md

Efter #583 merge:
  - Flytta PR #583 till Done i projektet
  - Sätt #594 till Ready
  - Påbörja Fas A (#588–#593) bakom barnets_samling-gaten
EOF
