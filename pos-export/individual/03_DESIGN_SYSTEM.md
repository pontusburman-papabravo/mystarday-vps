# 03 — Design System

**Version:** 2.0  
**Owner:** UX Director + Art Director  
**Authority:** Implements [00B_PRODUCT_TASTE.md](./00B_PRODUCT_TASTE.md)

---

## Purpose

Visual and layout language — tokens and structure. Illustration law: [03A](./03A_ART_DIRECTION.md). Motion: [03B](./03B_MOTION_SYSTEM.md).

---

## North Star

Handcrafted calm — gold warmth on trustworthy navy. Never generic SaaS.

---

## Color Tokens

| Token | Role |
|-------|------|
| **Gold** `#F5A623` | Primary warmth, CTA, stars (accent only) |
| **Navy** `#1B2340` | Text, trust, evening calm |
| **Lavender** | Soft borders, dreams, inactive |
| **Gold light** | Highlights, coach cards |
| **Cream/white** | Card surfaces |

One saturated accent per screen. Room themes extend palette — [03A](./03A_ART_DIRECTION.md).

---

## Typography

| Context | Rule |
|---------|------|
| Parent | Clear hierarchy; semibold titles; calm body |
| Child | ≥16px body; ≥44pt touch targets |
| Tone | Swedish sentence case; warm short lines |

---

## Layout

- Card radius: generous (`rounded-2xl` class equivalent)
- Padding: airy — never cramped
- Safe areas: respect notches and home indicators
- **No dense tables on family home** (P-04)

---

## Components (conceptual)

| Surface | Pattern |
|---------|---------|
| Parent shell | Magic dark/light calm shell; bottom or side nav — one primary cluster |
| Coach | Single card, one CTA |
| Child activity | Visual-first tile; one primary next action |
| Approval | One-tap chip — exception UI |

Implementation may change; **shape** must not.

---

## Rules

**DS-01** Token colors only — no random hex  
**DS-02** Primary CTA: gold + white text  
**DS-03** No Material/shadcn-default aesthetic  
**DS-04** Tailwind/build pipeline — no CDN in product HTML  
**DS-05** Admin aesthetic never leaks to family surfaces

---

## Anti-Patterns

Enterprise dashboard · Tailwind CDN · emoji-as-final-brand · star-count as hero typography

---

## Release Criteria

[03A](./03A_ART_DIRECTION.md) + [15](./15_PRODUCT_QUALITY_STANDARD.md) visual gates.

---

## AI Instructions

Match tokens; never add CDN; new colors need ADR + table update.

---

## CXO Review Summary

All roles **10/10** — v2.0.
