# Prompt Bible — Illustration Prompt Schema

**Version:** 1.0 (skeleton)  
**Status:** Template for all AI/human illustration prompts  
**Authority:** Entity Bible → this Bible → Art Prompt Catalog → Art Bible QG  
**Cross-ref:** [ART_BIBLE.md](../ART_BIBLE.md) §2–12, §25–41 · POS 03A

---

## Purpose

Defines **mandatory sections** every production prompt must contain. Numbered prompts live in [ART_PROMPT_CATALOG.md](./ART_PROMPT_CATALOG.md); this document defines the **schema** those entries follow.

---

## Prompt section template

| Section | Required | Content |
|---------|----------|---------|
| **Subject** | ✓ | What is depicted; entity_id link |
| **Composition** | ✓ | Framing, focal point, negative space |
| **Camera** | ✓ | Angle, lens feel, orthographic vs perspective |
| **Lighting** | ✓ | Time of day, key/fill, warmth |
| **Palette** | ✓ | Art Bible palette tokens — no hex invention |
| **Style** | ✓ | Line weight, texture, reference era (Nordic warmth) |
| **Scale** | ✓ | Relative to child avatar / door / tree |
| **Layers** | ✓ | Foreground / mid / background separation for engine |
| **Safe areas** | ✓ | UI overlay zones, thumb reach, notch |
| **Motion intent** | | Which parts animate (feeds Animation Bible) |
| **Negative prompt** | ✓ | Exclusions — stock, scary, cluttered, text |
| **Emotion** | ✓ | Five feelings filter — which feeling strengthened |
| **Export spec** | ✓ | Resolution, format, alpha, @2x |

---

## Example — section fill (dog, idle frame 1)

```yaml
prompt_id: PROMPT-0018-A
entity_ref: dog_companion
art_catalog_ref: "0018"
subject: >
  Golden retriever puppy, sitting, three-quarter view, friendly but calm —
  not cartoon exaggeration. Single character on transparent-friendly background.
composition: >
  Subject occupies 60% frame height; tail room for wag animation;
  eyes at upper third; ground shadow soft ellipse.
camera: >
  Low child-eye height (~90cm); slight 3/4; no dutch angle.
lighting: >
  Warm morning window key from left; soft ambient fill; no harsh rim.
palette: >
  Art Bible warm_neutral_fur, cream_highlight, nose_brown_soft.
style: >
  Hand-painted pixel-adjacent illustration; visible brush warmth;
  Nintendo-adjacent readability at 430px width.
scale: >
  Sits below child waist when composited in home_hall.
layers: >
  Single sprite layer mid_ground; shadow separate optional layer.
safe_areas: >
  Top 12% clear for child header; right 15% clear for system menu.
motion_intent: >
  Ears and tail isolated for subtle idle loop; paws planted.
negative: >
  No text, no collar brand, no teeth, no aggression, no photoreal,
  no stock photo, no duplicate dogs, no human hands.
emotion: comfort
export: >
  512×512 PNG + WebP @2x; pivot bottom-center; naming dog_golden_retriever_v1_idle01.png
```

---

## Rules

1. **No prompt without Entity Bible row.**  
2. **Palette tokens only** — never invent colours outside Art Bible.  
3. **Negative prompt mandatory** — prevents drift on AI generation.  
4. **Safe areas mandatory** on all child-surface assets.  
5. Prompt changes require Art Prompt Catalog version bump.

---

*Concrete numbered entries: [ART_PROMPT_CATALOG.md](./ART_PROMPT_CATALOG.md)*
