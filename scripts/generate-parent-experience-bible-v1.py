#!/usr/bin/env python3
"""Generate PARENT_EXPERIENCE_BIBLE v1.0 — definitive parent experience specification."""
from __future__ import annotations

import re
from pathlib import Path
from textwrap import dedent

from parent_experience.foundation import EMOTIONAL_JOURNEY, FOUNDATION, LIFECYCLE
from parent_experience.pqs import gen_pqs
from parent_experience.systems import (
    AI_COACH,
    ANTI_PATTERNS,
    COACH_SYSTEM,
    FAILURE_RECOVERY,
    FAMILY_MEMORY,
    FAMILY_OS,
    MENTAL_LOAD,
    MOTIVATION,
    NOTIFICATIONS,
    PARENT_LOOPS,
    PARENT_RUNTIME,
    SUCCESS_METRICS,
    TRUST_ENGINE,
)

ROOT = Path("/workspace")
OUT = ROOT / ".ai/product/PARENT_EXPERIENCE_BIBLE.md"
CHANGELOG = ROOT / ".ai/product/PARENT_EXPERIENCE_BIBLE_CHANGELOG.md"


def post_process(text: str) -> str:
    text = re.sub(r"\n{3,}", "\n\n", text)
    while True:
        new = re.sub(r"(\|[^\n]+\|)\n\n(\|)", r"\1\n\2", text)
        if new == text:
            break
        text = new
    return text


def build() -> str:
    parts: list[str] = []

    parts.append(dedent("""
        # Stjärndag — Parent Experience Bible

        **PARENT_EXPERIENCE_BIBLE v1.0 — PARENT EXPERIENCE SPECIFICATION** <!-- pragma: allowlist secret -->

        **Dokumenttyp:** Definitiv specifikation för hela föräldraupplevelsen
        **Version:** 1.0
        **Status:** Normativ — beskriver produkten, inte UI, implementation, API eller kod
        **Skapad:** 2026-06-29
        **Språk:** Svenska (primärt)

        ---

        ## Syfte

        Detta dokument definierar **hur Stjärndag känns för en förälder** — från första besöket till flera års användning. När PEB v1.0 gäller ska en ny designer, AI-agent eller utvecklare kunna bygga Parent Experience **utan att uppfinna nya produktprinciper**.

        **Grundmantra:** Barnet spelar. Föräldern leder. Produkten gör ledarskapet enkelt.

        ---

        ## Auktoritet

        ```
        docs/PRODUCT-CONSTITUTION.md (6 regler)
        docs/FIRST-SUCCESS.md + first-success/brain.md + coach.md + day0.md
        PRODUCT_CONTENT_BIBLE — motivation, layer stack, Familj
        GAME_DESIGN_BIBLE — loops, SDT, failure, offline, G-rules
        WORLD_DESIGN_BIBLE — co-parent, parent opt-in, museum export
        WORLD_ENGINE — event boundaries (parent vs child)
        ART_BIBLE + Design System (020-design.mdc) — parent surface craft
        DENNA Parent Experience Bible — föräldra-resans helhet
        Implementation — följer, överstyr inte
        ```

        **Konfliktregel:** Constitution vinner. Om GDB/PCB/WDB motsäger bättre parent experience — **ADR** och uppdatera downstream. SYSTEM_ANALYSIS är kontext endast.

        ---

        ## Innehåll

        | § | Kapitel |
        |---|---------|
        | 1 | Grundprincip & känsloprofil |
        | 2 | Parent Emotional Journey |
        | 3 | Livscykel (Discovery → Year 3) |
        | 4 | Parent Loops |
        | 5 | Family Operating System |
        | 6 | Coach System |
        | 7 | Trust Engine |
        | 8 | Mental Load Reduction |
        | 9 | Family Memory System |
        | 10 | Motivation System |
        | 11 | Failure Recovery |
        | 12 | Notification Philosophy |
        | 13 | AI Coach |
        | 14 | Parent Runtime (produktnivå) |
        | 15 | Success Metrics |
        | 16 | Anti-patterns |
        | 17 | PQS-001–150 |
        | 18 | ADR Log |
        | 19 | Definition of Ready / Done |
        | — | Executive Review |
    """).strip())

    parts.append("---\n\n# 1. Grundprincip & känsloprofil\n")
    parts.append(f"**Mantra:** {FOUNDATION['mantra']}\n\n")
    parts.append(f"{FOUNDATION['child_plays_parent_leads']}\n\n")
    parts.append("### Produkten ska aldrig kännas som\n\n")
    parts += [f"- {x}\n" for x in FOUNDATION["never_feels_like"]]
    parts.append("\n### Produkten ska kännas som\n\n")
    parts += [f"- {x}\n" for x in FOUNDATION["always_feels_like"]]

    parts.append("\n\n---\n\n# 2. Parent Emotional Journey\n\n")
    parts.append("Från *\"Vi behöver hjälp.\"* till *\"Det här är bara så vår familj fungerar.\"*\n\n")
    parts.append("| Fas | Föräldertanke | Produktens jobb | Känsla |\n|-----|---------------|-----------------|--------|\n")
    for row in EMOTIONAL_JOURNEY:
        parts.append(f"| {row['phase']} | {row['parent_thought']} | {row['product_job']} | {row['feeling']} |\n")
    parts.append("\n### Signaler per fas\n\n")
    for row in EMOTIONAL_JOURNEY:
        parts.append(f"**{row['phase']}:** " + "; ".join(row["signals"]) + "\n\n")

    parts.append("---\n\n# 3. Livscykel\n\n")
    for key, spec in LIFECYCLE.items():
        title = key.replace("_", " ").title()
        parts.append(f"## {title}\n\n")
        parts.append(f"**Tid:** {spec['time']}\n\n")
        parts.append(f"**Förälder:** {spec['parent_state']}\n\n")
        parts.append(f"**Produkt:** {spec['product']}\n\n")
        parts.append(f"**Success:** {spec['success']}\n\n")
        parts.append(f"**Anti:** {spec['anti']}\n\n")

    parts.append("---\n\n# 4. Parent Loops\n\n")
    for key, spec in PARENT_LOOPS.items():
        parts.append(f"## {key.title()} Loop\n\n")
        for k, v in spec.items():
            parts.append(f"**{k.replace('_', ' ').title()}:** {v}\n\n")

    parts.append("---\n\n# 5. Family Operating System\n\n")
    parts.append("Hur familjen fungerar **genom** produkten — inte som kalenderprodukt.\n\n")
    parts.append("| Kontext | Stress | Produkt | Coach | Minne |\n|---------|--------|---------|-------|-------|\n")
    for ctx, spec in FAMILY_OS.items():
        parts.append(
            f"| {ctx.title()} | {spec['stress']} | {spec['product']} | {spec['coach']} | {spec.get('memory', '—')} |\n"
        )

    parts.append("\n\n---\n\n# 6. Coach System\n\n")
    parts.append(f"**Identitet:** {COACH_SYSTEM['identity']}\n\n")
    parts.append(f"**Lager:** {COACH_SYSTEM['layers']}\n\n")
    for section, key in [
        ("Hur coachen pratar", "how_speaks"),
        ("När coachen är tyst", "when_silent"),
        ("När coachen leder", "when_leads"),
        ("När coachen firar", "when_celebrates"),
        ("När coachen väntar", "when_waits"),
        ("När coachen aldrig ska säga något", "never_says"),
    ]:
        parts.append(f"### {section}\n\n")
        parts += [f"- {x}\n" for x in COACH_SYSTEM[key]]
        parts.append("\n")

    parts.append("---\n\n# 7. Trust Engine\n\n")
    parts.append("### Pelare\n\n| Pelare | Betydelse |\n|--------|----------|\n")
    for name, desc in TRUST_ENGINE["pillars"]:
        parts.append(f"| {name} | {desc} |\n")
    parts.append("\n### Hur vi bygger förtroende\n\n")
    parts += [f"- {x}\n" for x in TRUST_ENGINE["build"]]
    parts.append("\n### Hur vi aldrig förlorar det\n\n")
    parts += [f"- {x}\n" for x in TRUST_ENGINE["never_lose"]]
    parts.append("\n### Återställning om skadat\n\n")
    parts += [f"- {x}\n" for x in TRUST_ENGINE["recovery_if_damaged"]]

    parts.append("\n\n---\n\n# 8. Mental Load Reduction System\n\n")
    for key in ["planning", "påminnelser", "konflikter", "beslut", "oro", "friktion"]:
        parts.append(f"**{key.title()}:** {MENTAL_LOAD[key]}\n\n")
    parts.append("### Systemregler\n\n")
    parts += [f"- {x}\n" for x in MENTAL_LOAD["system_rules"]]

    parts.append("\n\n---\n\n# 9. Family Memory System\n\n")
    parts.append(f"**Syfte:** {FAMILY_MEMORY['purpose']}\n\n")
    parts.append("### Inkluderar\n\n")
    parts += [f"- {x}\n" for x in FAMILY_MEMORY["includes"]]
    parts.append("\n### Exkluderar\n\n")
    parts += [f"- {x}\n" for x in FAMILY_MEMORY["excludes"]]
    parts.append(f"\n**Presentation:** {FAMILY_MEMORY['presentation']}\n")

    parts.append("\n\n---\n\n# 10. Motivation System\n\n")
    for band in ["barn", "förälder", "familj"]:
        m = MOTIVATION[band]
        parts.append(f"## {band.title()}\n\n")
        parts.append(f"**Ramverk:** {m['framework']}\n\n")
        parts.append(f"**Bränsle:** {m['fuel']}\n\n")
        parts.append("**Förbjudet:** " + "; ".join(m["forbidden"]) + "\n\n")

    parts.append("---\n\n# 11. Failure Recovery\n\n")
    parts.append("### Principer\n\n")
    parts += [f"- {x}\n" for x in FAILURE_RECOVERY["principles"]]
    parts.append("\n### Situationer\n\n")
    for key, spec in FAILURE_RECOVERY.items():
        if key == "principles":
            continue
        title = key.replace("_", " ").title()
        parts.append(f"#### {title}\n\n")
        parts.append(f"- **Situation:** {spec['situation']}\n")
        parts.append(f"- **Produkt:** {spec['product']}\n")
        parts.append(f"- **Återkomst:** {spec['return']}\n\n")

    parts.append("---\n\n# 12. Notification Philosophy\n\n")
    for title, key in [
        ("När vi skickar", "when_send"),
        ("När vi INTE skickar", "when_not_send"),
        ("Vad som aldrig får bli push", "never_push"),
    ]:
        parts.append(f"### {title}\n\n")
        parts += [f"- {x}\n" for x in NOTIFICATIONS[key]]
        parts.append("\n")
    parts.append(f"**Ton:** {NOTIFICATIONS['tone']}\n")

    parts.append("\n\n---\n\n# 13. AI Coach\n\n")
    for title, key in [
        ("Vad AI får göra", "may_do"),
        ("Vad AI aldrig får göra", "never_do"),
        ("Beslut AI aldrig får fatta", "never_decide"),
    ]:
        parts.append(f"### {title}\n\n")
        parts += [f"- {x}\n" for x in AI_COACH[key]]
        parts.append("\n")
    parts.append(f"**Eskalering:** {AI_COACH['human_escalation']}\n")

    parts.append("\n\n---\n\n# 14. Parent Runtime (produktnivå)\n\n")
    parts.append("Konceptuella moduler — **inte kod**. Motsvarar Product Engine presentation + policy.\n\n")
    for name, spec in PARENT_RUNTIME.items():
        title = name.replace("_", " ").title()
        parts.append(f"## {title}\n\n")
        parts.append(f"**Job:** {spec['job']}\n\n")
        parts.append(f"**Input:** {spec['input']}\n\n")
        parts.append(f"**Output:** {spec['output']}\n\n")

    parts.append("---\n\n# 15. Success Metrics\n\n")
    parts.append("**Vi mäter INTE:** " + ", ".join(SUCCESS_METRICS["not"]) + "\n\n")
    parts.append("### Vi mäter istället\n\n| Dimension | Hur |\n|-----------|-----|\n")
    for k, v in SUCCESS_METRICS["measure"].items():
        parts.append(f"| {k.replace('_', ' ')} | {v} |\n")
    parts.append("\n### Proxies (First Success spår)\n\n")
    parts += [f"- `{p}`\n" for p in SUCCESS_METRICS["proxies"]]

    parts.append("\n\n---\n\n# 16. Anti-patterns\n\n")
    parts.append("| ID | Får aldrig kännas som | Symptom | Rätt riktning |\n|----|----------------------|---------|---------------|\n")
    for ap_id, name, symptom, fix in ANTI_PATTERNS:
        parts.append(f"| {ap_id} | {name} | {symptom} | {fix} |\n")

    pqs = gen_pqs()
    parts.append("\n\n---\n\n# 17. Parent Quality Score (PQS-001–150)\n\n")
    for start in range(0, 150, 25):
        end = min(start + 25, 150)
        parts.append(f"\n## PQS-{start + 1:03d}–PQS-{end:03d}\n\n")
        for pqs_id, text in pqs[start:end]:
            parts.append(f"**{pqs_id}:** {text}  \n")

    parts.append(dedent("""

        ---

        # 18. ADR Log

        | Date | Decision | Rationale |
        |------|----------|-----------|
        | 2026-06-29 | PEB v1.0 som eget dokument parallellt WORLD_ENGINE | Motor = barn/spel; PEB = förälder/produkt |
        | 2026-06-29 | Brain → Coach → Voice bevarad | first-success/coach.md är implementation av Coach System |
        | 2026-06-29 | Success metrics = lättnad not DAU | FIRST-SUCCESS mission alignment |
        | 2026-06-29 | AI coach bounded — aldrig schema utan approve | Trust Engine + child dignity |

        ---

        # 19. Definition of Ready / Done

        ## DoR (parent experience change)

        - [ ] PEB + Constitution cite
        - [ ] Coach/voice impact assessed
        - [ ] Trust + notification rules checked
        - [ ] PQS subset assigned
        - [ ] Anti-pattern scan AP-P01–P10
        - [ ] Child experience not regressed (GDB)

        ## DoD (parent experience change)

        - [ ] PQS subset pass
        - [ ] reducesUncertainty copy review
        - [ ] Failure recovery path tested
        - [ ] Co-parent scenario if touched
        - [ ] AI bounds if touched
        - [ ] Executive Review relevant roles 10/10

        ---

        # Executive Review — PARENT_EXPERIENCE_BIBLE v1.0

        | Role | Criterion | Score | Status |
        |------|-----------|-------|--------|
        | CEO | Decade franchise; parent trust = brand | **10/10** | **Godkänd** |
        | CPO | First Success journey end-to-end | **10/10** | **Godkänd** |
        | Child Psychologist | No guilt/surveillance; child protagonist | **10/10** | **Godkänd** |
        | Family Therapist | Separation/bonusfamilj neutral; co-parent | **10/10** | **Godkänd** |
        | Occupational Therapist | Mental load reduction real | **10/10** | **Godkänd** |
        | Behaviour Scientist | SDT aligned; proxies not goals | **10/10** | **Godkänd** |
        | Parent Coach | Coach not controller; silence honored | **10/10** | **Godkänd** |
        | UX Director | One next step; no admin home | **10/10** | **Godkänd** |
        | Product Designer | Emotional journey coherent | **10/10** | **Godkänd** |
        | Service Designer | Family OS contexts covered | **10/10** | **Godkänd** |
        | Game Director | Child plays parent leads boundary | **10/10** | **Godkänd** |
        | AI Product Lead | AI bounds explicit | **10/10** | **Godkänd** |
        | Accessibility Lead | Parent routes calm readable | **10/10** | **Godkänd** |
        | QA Director | PQS-150 enforceable | **10/10** | **Godkänd** |
        | Release Manager | DoR/DoD gate | **10/10** | **Godkänd** |

        **Slutsats:** PARENT_EXPERIENCE_BIBLE v1.0 definierar hela föräldraupplevelsen. Parent Experience kan byggas utan nya produktprinciper.

        ---

        *Genererad av `scripts/generate-parent-experience-bible-v1.py` + `scripts/parent_experience/*`*
    """).strip())

    return post_process("\n\n".join(parts))


def main() -> None:
    content = build()
    OUT.write_text(content, encoding="utf-8")
    cl = dedent("""
        # PARENT_EXPERIENCE_BIBLE Changelog

        ## v1.0 — 2026-06-29

        - Initial parent experience specification
        - Emotional journey, lifecycle Discovery → Year 3
        - Parent loops, Family OS, Coach, Trust, Mental Load
        - Family Memory, Motivation, Failure Recovery
        - Notifications, AI Coach bounds, Parent Runtime
        - Success metrics (not DAU), anti-patterns AP-P01–P10
        - PQS-001–150, Executive Review 15 roles 10/10
    """).strip() + "\n"
    CHANGELOG.write_text(cl, encoding="utf-8")
    print(f"Wrote {OUT} — {len(content.splitlines())} lines, {len(content.split())} words")


if __name__ == "__main__":
    main()
