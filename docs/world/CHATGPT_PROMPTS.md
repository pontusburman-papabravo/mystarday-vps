# ChatGPT / DALL·E — Art Prompts per rum

**Källa:** `docs/world/data/*.yaml` → `prompt_manifest`  
**Stil:** `nordic_warm_diorama_2_5d` — alltid inkludera `negative_prompt`  
**Uppdaterad:** 2026-07-03

Kopiera **positive_prompt** + **negative_prompt** till ChatGPT (eller annan bildgenerator).  
Varje rum har minst en **scene_hero** (hela scenen) och ofta en **hero object**-detalj.

---

## 100 — Home (exteriör)

**Fil:** [100-home.yaml](./data/100-home.yaml) · Catalog `0001`

### home_exterior_hero

**Positive:**
> Nordic family house exterior, child-scale warmth, morning golden light. House centered; door lower third; sky 40%; garden foreground 15%; path leading to door; mailbox right of door. Wooden facade, soft slate roof, chimney with light smoke wisp. Child eye height camera, handcrafted Scandinavian illustration, warm inviting home, grass lawn, no cars.

**Negative:**
> No cars, no brand logos, no scary shadows, no text on house, no stock photo aesthetic, no empty grey yard

---

## 101 — Hall

**Fil:** [101-hall.yaml](./data/101-hall.yaml)

### hall_scene_hero

**Positive:**
> Nordic family home hall interior, 2.5D illustrated diorama, warm morning light through side window. Open fireplace with soft ember glow center hero, wooden floor with textile rug, coat hooks on wall, inner doors to bedroom and garden visible, sleeping dog near fireplace optional. Child eye height, cozy Scandinavian morning, handcrafted warmth, no clutter chaos. Portrait mobile, fireplace lower center, window light from left.

**Negative:**
> No text on walls, no brand logos, no scary shadows, no realistic horror, no empty grey rooms, no stock photo aesthetic, no casino lighting, no achievement UI

### fireplace_hero

**Positive:**
> Hero close-up of cozy open fireplace with soft warm ember glow, Nordic illustrated style, gentle flames not roaring, wooden mantel, morning light, child-safe comfort anchor.

**Negative:**
> No roaring flames, no smoke damage, no horror fireplace

---

## 102 — Sovrum

**Fil:** [102-bedroom.yaml](./data/102-bedroom.yaml) · Catalog `0010`

### bedroom_scene_hero

**Positive:**
> Nordic child bedroom interior, 2.5D illustrated diorama, warm evening atmosphere. Low wooden bed with soft blanket and pillow, stuffed animal on bed. Window on right with small warm night light on sill, twilight sky visible. Wooden floor, soft rug, small shelf with books, chair with tomorrow's clothes. Child eye height camera, cozy lagom Scandinavian style, handcrafted illustration, soft shadows, golden amber interior light mixed with cool blue from window. Portrait mobile composition, bed in lower third, ceiling with subtle star stickers.

**Negative:**
> No text on walls, no brand logos, no scary shadows, no horror night, no empty grey room, no stock photo, no realistic horror, no neon, no adult bedroom, no messy chaos

---

## 103 — Kök

**Fil:** [103-kitchen.yaml](./data/103-kitchen.yaml) · Catalog `0011`

### kitchen_scene_hero

**Positive:**
> Nordic family kitchen interior, 2.5D illustrated diorama, warm morning light. Round wooden breakfast table with chairs near large window showing green garden outside. Stove with soft warm glow, kettle with gentle steam, wooden cabinets, honey-toned wood. Child-height step stool near sink, fridge with child's drawing magnet, fruit bowl on counter. Child eye height camera, Scandinavian lagom cozy style, handcrafted warmth, soft golden morning light through window. Portrait mobile composition, table center-left, garden visible through window right.

**Negative:**
> No text, no brand logos, no sterile restaurant kitchen, no scary, no empty grey room, no stock photo, no clutter chaos, no sharp knives prominent

---

## 104 — Badrum

**Fil:** [104-bathroom.yaml](./data/104-bathroom.yaml) · Catalog `0012`

### bathroom_scene_hero

**Positive:**
> Nordic family bathroom interior, 2.5D illustrated diorama, soft neutral-warm lighting. Child-height sink with step stool, round mirror above with soft ring light glow, subtle patterned tile wall in muted Scandinavian colors (sage, cream, soft blue). Bathtub with rubber duck, fluffy towel on hook, toothbrush mug, soap dispenser. Clean but cozy, not clinical hospital. Child eye height camera, handcrafted illustration, portrait mobile composition, mirror centered upper third, warm inviting atmosphere.

**Negative:**
> No text, no brand logos, no scary mirror, no horror, no clinical sterile white, no stock photo, no grime, no adult spa luxury

---

## 105 — Vind

**Fil:** [105-attic.yaml](./data/105-attic.yaml) · Catalog `0013`

### attic_scene_hero

**Positive:**
> Nordic attic interior under sloped wooden roof, 2.5D illustrated diorama. Golden sunbeam through roof window illuminating floating dust motes. Old wooden treasure trunk with brass clasp center, folded quilt, toy wheel, hat boxes, rope ladder, wooden floorboards with patina. Warm curious atmosphere, not scary horror attic. Child eye height looking slightly up, handcrafted Scandinavian illustration, sloped ceiling, cozy mystery, golden light beam. Portrait mobile composition, roof window upper third, trunk lower center.

**Negative:**
> No horror, no scary shadows, no ghosts, no cobweb horror, no dark evil attic, no text, no brand logos, no stock photo, no empty grey room

---

## 110 — Trädgård (SHIPPED)

**Fil:** [110-garden.yaml](./data/110-garden.yaml) · Catalog `0020`  
**Assets:** `public/images/child/world/garden/scene-bg*.webp`

### garden_scene_hero

**Positive:**
> Nordic family garden exterior, 2.5D illustrated diorama, warm golden morning light. Green grass lawn in foreground with gentle path winding through garden, flower bed with soft colorful blooms (not neon), old oak tree silhouette in background, house roof edge visible behind hedge, blue sky with soft white clouds. Child eye height camera, Scandinavian lagom garden, handcrafted illustration, birds optional in sky, watering can by fence, inviting exploration. Portrait mobile composition, path in lower third leading into depth, flower bed right, sky upper portion with clouds.

**Negative:**
> No text, no brand logos, no perfect golf course lawn, no scary forest edge, no stock photo, no empty flat green, no casino colors, no harsh shadows

---

## 120 — Verkstad

**Fil:** [120-workshop.yaml](./data/120-workshop.yaml) · Catalog `0021`

### workshop_scene_hero

**Positive:**
> Nordic family workshop shed interior, 2.5D illustrated diorama, warm honey wood tones. Sturdy wooden workbench center with wood shavings, half-built birdhouse project, pegboard wall with satisfying tool silhouettes (hammer, saw, screwdriver — safe, no spinning blades), window showing green garden outside, soft work lamp glow, child step stool, sorted screw jars, measuring tape, pencil shavings. Maker pride atmosphere, lagom messy not chaotic, child eye height, handcrafted Scandinavian illustration. Portrait mobile composition, workbench lower center, pegboard upper back wall.

**Negative:**
> No dangerous power tools prominent, no spinning blades, no horror, no text, no brand logos, no greasy industrial garage, no stock photo

---

## 130 — Minnesrummet / Museum

**Fil:** [130-museum.yaml](./data/130-museum.yaml) · Catalog `0022`  
**Runtime:** `memory_hall` i worlds.json

### memory_hall_scene_hero

**Positive:**
> Nordic memory hall interior gallery room, 2.5D illustrated diorama, warm soft lighting. Wooden wall with picture frames of various sizes — some filled with warm family moment illustrations (morning routine, child drawing, gentle medal), some empty with subtle warm glow invitation. Large window with soft golden light beam and dust motes, wooden bench, plant on sill, cozy museum feeling not trophy screen. Child eye height, handcrafted Scandinavian warmth, quiet pride, belonging atmosphere. Portrait mobile composition, memory wall center, window light from side upper third.

**Negative:**
> No text in frames, no leaderboard, no red notification dots, no guilt empty frames, no scary, no stock photo, no casino gold, no point numbers visible

---

## 140 — Husdjursstugan

**Fil:** [140-pet_house.yaml](./data/140-pet_house.yaml) · Catalog `0023`

### pet_house_scene_hero

**Positive:**
> Nordic cozy animal rescue shed interior, 2.5D illustrated diorama, warm lamp glow. Soft hay bed with blanket, gentle rabbit or small rescue animal resting peacefully, water bowl with ripple, carrot bin, brush on hook, wooden walls, garden visible through open gate, warm farmhouse lamp casting golden pool of light, straw on floor, caring atmosphere not zoo. Child eye height, Scandinavian lagom warmth, no cages, no guilt, gentle belonging. Portrait mobile composition, bed center, lamp upper right, gate to garden background left.

**Negative:**
> No cages, no sad animals, no Tamagotchi UI, no hunger meters, no guilt text, no horror, no stock photo, no dirty neglect aesthetic

---

## 150 — Troférummet

**Fil:** [150-trophy_room.yaml](./data/150-trophy_room.yaml) · Catalog `0024`

### trophy_room_scene_hero

**Positive:**
> Nordic child trophy room interior, 2.5D illustrated diorama, warm soft spotlight. Wooden shelves with meaningful personal objects — jar with first snowball memory, framed butterfly, drawn star on wood plaque, feather, smooth pebble — not gold sports trophies. Ribbon on door arch (locked tease), polished wooden floor, quiet pride atmosphere, no leaderboard, no point numbers. Child eye height, handcrafted Scandinavian warmth, belonging and ownership. Portrait mobile composition, shelf center, soft spotlight from above.

**Negative:**
> No gold sports trophies, no leaderboard, no scores, no comparison UI, no text, no brand logos, no casino, no empty boastful room

---

## 160 — Läshörnan

**Fil:** [160-reading_corner.yaml](./data/160-reading_corner.yaml) · Catalog `0025`

### reading_corner_scene_hero

**Positive:**
> Nordic cozy reading corner interior, 2.5D illustrated diorama, warm amber evening lamp light. Soft floor cushions and blanket fort edge, low wooden bookshelf with colorful book spines, warm reading lamp casting golden pool, stuffed animal reading companion, slippers on rug, dark window showing night sky, star projector subtle on ceiling, peaceful focus atmosphere. Child eye height low angle, Scandinavian hygge, handcrafted warmth, calm not classroom. Portrait mobile composition, lamp and cushion center, bookshelf back wall, night window side.

**Negative:**
> No homework UI, no screens, no harsh desk lamp, no classroom, no text on book covers readable, no scary night, no stock photo, no clutter chaos

---

## 170 — Skogen

**Fil:** [170-forest.yaml](./data/170-forest.yaml) · Catalog `0030`

### forest_scene_hero

**Positive:**
> Nordic Scandinavian forest glade, 2.5D illustrated diorama, dappled sunlight through pine and birch trees. Mossy path winding between tree trunks, ancient pine with lichen as landmark center, stone cairn, lingonberry bush, fallen log, pine cones on ground, soft green and brown palette, cool forest light with warm sunbeams, child eye height, inviting exploration not scary dark forest, handcrafted illustration, Swedish nature authenticity, depth with path leading deeper. Portrait mobile composition, path foreground center, tall trees framing sides, lake tease light between trees background.

**Negative:**
> No horror dark forest, no scary creatures, no combat, no text, no brand logos, no jungle vines, no stock photo, no empty flat green

---

## 180 — Sjön

**Fil:** [180-lake.yaml](./data/180-lake.yaml) · Catalog `0031`

### lake_scene_hero

**Positive:**
> Nordic Scandinavian forest lake scene, 2.5D illustrated diorama, calm mirror-still water. Simple wooden dock extending over shallow safe water, lily pads cluster as landmark, reeds along shore, boat pulled up on grass, fishing rod leaning on fence, forest trees reflecting in water, ducks distant on surface, soft cool palette with warm accents, child eye height from shore, peaceful patience atmosphere, handcrafted illustration, Swedish summer lake feeling, not tropical, not scary deep water. Portrait mobile composition, dock foreground left, lake center, forest background reflected in water.

**Negative:**
> No scary deep water, no drowning danger, no horror, no tropical beach, no text, no brand logos, no stock photo, no empty flat blue

---

## Tips för ChatGPT

1. **Format:** Be om "illustrated 2.5D diorama, portrait mobile 9:16" om verktyget frågar.
2. **Teman:** Varje rum har `theme_variants` i YAML (castle, treehouse, space, pirate, wizard) — byt nyckelord i prompten.
3. **Säsong:** Lägg till `seasonal_variants` — t.ex. "light snow on roof" vinter, "bright summer blooms" sommar.
4. **Kvalitet:** Kör scene_hero först, sedan hero object för detaljer att composita.
5. **Kanon:** YAML vinner vid konflikt — uppdatera denna fil när YAML ändras.
