#!/usr/bin/env bash
# setup-barnets-samling-labels.sh
# Label-based roadmap fallback — no project/milestone scope required.
# Idempotent: safe to re-run; skips existing labels, comments, and checklist.
#
# Usage: ./scripts/setup-barnets-samling-labels.sh

set -euo pipefail

REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner)"
ROADMAP_TITLE="Barnets samling v1 roadmap"
BLOCKER_COMMENT="Blocked by #583. Starta inte Fas A-implementation förrän feature gate/rollout är mergad."
CHECKLIST_MARKER="## Implementation tickets (gör i denna ordning)"

FAS_A_EPIC=594
FAS_A_TICKETS=(588 589 590 591 592 593)
FAS_A_BLOCKED=(${FAS_A_EPIC} "${FAS_A_TICKETS[@]}")
PHASE_EPICS=(584 585 586 587)
PHASE_LABELS=(phase-b phase-c phase-d phase-e)

ensure_label() {
  local name="$1"
  local color="$2"
  local description="${3:-}"
  if gh api "repos/${REPO}/labels/${name}" >/dev/null 2>&1; then
    echo "    label exists: ${name}"
  else
    gh label create "${name}" --repo "${REPO}" --color "${color}" --description "${description}"
    echo "    created label: ${name}"
  fi
}

set_issue_labels() {
  local number="$1"
  shift
  gh issue edit "${number}" --repo "${REPO}" "$@"
  echo "    issue #${number}"
}

set_pr_labels() {
  local number="$1"
  shift
  gh pr edit "${number}" --repo "${REPO}" "$@"
  echo "    PR #${number}"
}

has_blocker_comment() {
  local number="$1"
  gh issue view "${number}" --repo "${REPO}" --comments \
    --json comments --jq '.comments[].body' 2>/dev/null \
    | grep -Fq "${BLOCKER_COMMENT}"
}

ensure_blocker_comment() {
  local number="$1"
  if has_blocker_comment "${number}"; then
    echo "    comment exists on #${number}"
  else
    gh issue comment "${number}" --repo "${REPO}" --body "${BLOCKER_COMMENT}"
    echo "    commented on #${number}"
  fi
}

FAS_A_EPIC_BODY='## Produktmål

Etablera kartan — **innan** vi bygger samlingens innehåll:

```
Idag            → tjäna stjärnor
Skattkammaren   → spara / inlösa
Min samling     → stolthet / historik
```

'"${CHECKLIST_MARKER}"'

> **Blocker:** #583 (feature gate) måste vara mergad innan implementation påbörjas.

- [ ] #583 Rollout / feature gate
- [ ] #588 Nav: fyra flikar
- [ ] #589 Labels/copy: bort med "Min värld"
- [ ] #590 Hub bort som ingång
- [ ] #591 Skattkammaren som egen flik/route
- [ ] #592 Regression: belöningsflöde
- [ ] #593 Göm/avlänka gammal värld

## Feature gate

`barnets_samling` (dev) — endast testanvändaren + `pontus@burman.cc`  
Migration: PR #583

## Spec

- [barnets-samling-vision.md](https://github.com/'"${REPO}"'/blob/main/docs/barnets-samling-vision.md)
- [npf-arkitektur-v1.md](https://github.com/'"${REPO}"'/blob/main/docs/npf-arkitektur-v1.md)

## Blockerar

Epics Fas B–E (#584–#587) — bryt ner dem **efter** Fas A är klar.'

roadmap_body() {
  cat <<EOF
# Barnets samling v1 roadmap

Label-baserad roadmap (ersätter GitHub Project/milestone tills vidare).

**Spec:** [barnets-samling-vision.md](https://github.com/${REPO}/blob/main/docs/barnets-samling-vision.md) · [npf-arkitektur-v1.md](https://github.com/${REPO}/blob/main/docs/npf-arkitektur-v1.md)

---

## Fas A — Nav + rollout

**Epic:** #${FAS_A_EPIC}  
**Blocker:** PR #583 måste mergas innan Fas A-implementation påbörjas.

| # | Typ | Beskrivning | Labels |
|---|-----|-------------|--------|
| **583** | PR | Rollout / feature gate \`barnets_samling\` | \`ready\` |
| **588** | Ticket | Nav: fyra flikar | \`blocked\` |
| **589** | Ticket | Bort med "Min värld" | \`blocked\` |
| **590** | Ticket | Hub bort som ingång | \`blocked\` |
| **591** | Ticket | Skattkammaren egen flik | \`blocked\` |
| **592** | Ticket | Regression belöningsflöde | \`blocked\` |
| **593** | Ticket | Göm gammal värld | \`blocked\` |

**Ordning:** #583 → #588 → #589 → #590 → #591 → #592 → #593

---

## Fas B — Min samling v1

**Epic:** #584 — väntar på Fas A.

---

## Fas C — Skattkammaren v1

**Epic:** #585 — väntar på Fas A.

---

## Fas D — Minneskort + hylla + diplom

**Epic:** #586 — väntar på Fas A.

---

## Fas E — Årsbok + visuell polish

**Epic:** #587 — väntar på Fas A.

---

## Labels

| Label | Syfte |
|-------|--------|
| \`barnets-samling\` | Alla issues i initiativet |
| \`phase-a\` … \`phase-e\` | Fas |
| \`ready\` | Kan påbörjas nu (#583) |
| \`blocked\` | Väntar på #583 (#594, #588–#593) |

Kör om setup: \`./scripts/setup-barnets-samling-labels.sh\`
EOF
}

echo "==> Repo: ${REPO}"
echo "==> Labels"

ensure_label "barnets-samling" "1d76db" "Barnets samling initiativ"
ensure_label "phase-a" "fbca04" "Fas A: Nav + rollout"
ensure_label "phase-b" "0e8a16" "Fas B: Min samling v1"
ensure_label "phase-c" "5319e7" "Fas C: Skattkammaren v1"
ensure_label "phase-d" "d93f0b" "Fas D: Minneskort + hylla + diplom"
ensure_label "phase-e" "b60205" "Fas E: Årsbok + visuell polish"
ensure_label "blocked" "b60205" "Blockerad — väntar på beroende"
ensure_label "ready" "0e8a16" "Redo att påbörjas"

echo "==> Label assignments"

set_pr_labels 583 \
  --add-label "barnets-samling,phase-a,ready"

for n in "${FAS_A_BLOCKED[@]}"; do
  set_issue_labels "${n}" \
    --add-label "barnets-samling,phase-a,blocked"
done

for i in "${!PHASE_EPICS[@]}"; do
  set_issue_labels "${PHASE_EPICS[$i]}" \
    --add-label "barnets-samling,${PHASE_LABELS[$i]}"
done

echo "==> Blocker comments (Fas A)"
for n in "${FAS_A_BLOCKED[@]}"; do
  ensure_blocker_comment "${n}"
done

echo "==> Epic #${FAS_A_EPIC} checklist"
current_body="$(gh issue view "${FAS_A_EPIC}" --repo "${REPO}" --json body -q .body)"
if echo "${current_body}" | grep -q "#583 Rollout / feature gate"; then
  echo "    checklist already includes #583 — skip"
else
  gh issue edit "${FAS_A_EPIC}" --repo "${REPO}" --body "${FAS_A_EPIC_BODY}"
  echo "    updated checklist on #${FAS_A_EPIC}"
fi

echo "==> Roadmap issue: ${ROADMAP_TITLE}"
ROADMAP_NUMBER="$(
  gh issue list --repo "${REPO}" --search "in:title \"${ROADMAP_TITLE}\"" --state all \
    --json number,title --jq ".[] | select(.title==\"${ROADMAP_TITLE}\") | .number" | head -1
)"

ROADMAP_CONTENT="$(roadmap_body)"

if [[ -z "${ROADMAP_NUMBER}" ]]; then
  roadmap_url="$(
    gh issue create --repo "${REPO}" \
      --title "${ROADMAP_TITLE}" \
      --body "${ROADMAP_CONTENT}" \
      --label "barnets-samling,documentation"
  )"
  ROADMAP_NUMBER="${roadmap_url##*/}"
  echo "    created #${ROADMAP_NUMBER}"
else
  gh issue edit "${ROADMAP_NUMBER}" --repo "${REPO}" \
    --body "${ROADMAP_CONTENT}" \
    --add-label "barnets-samling,documentation"
  echo "    updated #${ROADMAP_NUMBER}"
fi

cat <<EOF

==> Klart (label-fallback)

Roadmap issue: #${ROADMAP_NUMBER}
Filter:        https://github.com/${REPO}/labels/barnets-samling

Efter #583 merge:
  - Ta bort \`blocked\`, lägg till \`ready\` på #594 och #588–#593
  - Flytta #583 till Done (manuellt eller via ny körning)
EOF
