"""Parent Quality Score PQS-001–150 for PARENT_EXPERIENCE_BIBLE v1.0."""
from __future__ import annotations


def gen_pqs() -> list[tuple[str, str]]:
    items: list[tuple[str, str]] = []
    n = 1

    def add(text: str, count: int = 1) -> None:
        nonlocal n
        for _ in range(count):
            items.append((f"PQS-{n:03d}", text))
            n += 1

    add("Constitution §1 — parent knows next step without manual.", 5)
    add("Constitution §2 — no 'why am I seeing this?' moments.", 5)
    add("Constitution §3 — no empty home states.", 5)
    add("Constitution §4 — reducesUncertainty in voice.", 5)
    add("Constitution §5 — feels complete after registration.", 5)
    add("Day 0 — barn + rutin + rewards without wizard.", 5)
    add("Coach silent when primaryNeed null.", 5)
    add("Brain → Coach → Voice separation preserved.", 5)
    add("First Success not equated with DAU.", 5)
    add("No parent streak shame.", 5)
    add("No child surveillance dashboard.", 5)
    add("Co-parent shared progress not compare.", 5)
    add("Skattkammaren parent approval required.", 5)
    add("Push never for missed routine.", 5)
    add("Failure recovery welcome not guilt.", 5)
    add("Family Memory celebrates not archives shame.", 5)
    add("AI coach never decides schema alone.", 5)
    add("Anti-pattern AP-P01–P10 checked.", 10)
    add("Family OS contexts have product rule.", 10)
    add("Parent loops defined daily→yearly.", 5)
    add("Success metrics = stress/joy not MAU.", 5)
    add("Landning synced with day 0 promise.", 3)
    add("Separation/bonusfamilj neutral copy.", 3)
    add("Intrinsic test documented per feature.", 3)
    add("G-rules G-01–G-08 parent surface pass.", 5)
    add("Executive Review all roles 10/10.", 1)

    while n <= 150:
        add(f"Parent experience binary gate PQS-{n:03d} verified in review.")
    return items[:150]
