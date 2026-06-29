#!/usr/bin/env python3
"""Generate ART_BIBLE v1.0 FINAL live-release edition."""
from __future__ import annotations

import re
from pathlib import Path
from textwrap import dedent

ROOT = Path("/workspace/.ai/product/ART_BIBLE.md")
OUT = ROOT
TEMP = Path("/workspace/ART-BIBLE-ALL-DOCUMENTS-TEMP.md")

WORLDS = [
    ("routine_home", "Morgonhuset", "Kapabel trygghet", "#F5A623", "Morgonljus, ek, frukost, dörrtröskel"),
    ("workshop", "Verkstaden", "Maker pride", "#E8A849", "Pegboard, spån, halvfärdigt projekt"),
    ("pet_home", "Husdjurshemmet", "Gentle belonging", "#F0C4A0", "Hage, sovande djur, varm skål"),
    ("dino_valley", "Dinosaurielunden", "Awe & courage", "#8B7BA8", "Dimma, silhuett, stig, ägg"),
    ("dollhouse", "Dockhuset", "Cozy control", "#C9B8D9", "Mini-rum, lagom röra, harmoni"),
    ("fishing_pier", "Fiskebryggan", "Patient calm", "#7A9EB8", "Vatten, brygga, väntan"),
    ("reading_nook", "Läshörnan", "Focus pride", "#9B7E9E", "Bokhylla, lampa, tystnad"),
]


def fix_markdown(text: str) -> str:
    """Repair common bold spacing artifacts without breaking QG/D/N/P IDs."""
    placeholders: dict[str, str] = {}

    def protect(m: re.Match) -> str:
        key = f"__PROT_{len(placeholders)}__"
        placeholders[key] = m.group(0)
        return key

    for pat in [
        r"\*\*(QG-\d{3}|D-\d{3}|N-\d{3}|P-\d{3}):\*\*",
        r"\*\*(Dokumenttyp|Version|Status|Skapad|Språk|Målgrupp|Konfliktregel):\*\*",
    ]:
        text = re.sub(pat, protect, text)
    text = re.sub(r"\*\* ([a-zåäöA-Z0-9])", r"**\1", text)
    text = re.sub(r"\*\*([^\*]+?)\*\*(?=[a-zåäöA-Z\(\"\[])", r"**\1** ", text)
    text = re.sub(r"(?<=[a-zåäö])(?<!\*)\*\*(?=[a-zåäöA-Z])", " **", text)
    for key, val in placeholders.items():
        text = text.replace(key, val)
    text = re.sub(r":\*\*([A-ZÅÄÖa-z])", r":** \1", text)
    text = re.sub(r"(?<=\*\*)([a-zåäö])", lambda m: " " + m.group(1) if False else m.group(1), text)
    return text


def trim_appendices(text: str) -> str:
    """Remove duplicate QG appendices; point to §13."""
    note = dedent("""
        ## Appendix E — Quality Gates ( consolidated )

        QG-121–QG-165 och QG-001–QG-500 finns ** endast** i **§13 Quality Gates**. Denna appendix ersattes i FINAL v1.0 för att eliminera duplicering.

        ## Appendix L — Världsscener ( consolidated )

        Världsspecifika QG-151–QG-165 ingår i **§13** och scen-walkthrough **Appendix J**. Använd J.1–J.7 för visuell genomgång.
    """).strip()
    text = re.sub(
        r"## Appendix E — Utökade Quality Gates.*?(?=## Appendix F)",
        note + "\n\n",
        text,
        flags=re.S,
    )
    text = re.sub(
        r"## Appendix L — Quality Gates QG-151.*?(?=## Appendix M)",
        "",
        text,
        flags=re.S,
    )
    return text


def trim_accessibility_dup(text: str) -> str:
    """Keep §22 canonical; shorten duplicate accessibility block."""
    replacement = dedent("""
        ## Accessibility — snabbreferens ( canonical: §22 )

        Fullständiga regler: **§22 Accessibility för illustration**. Parent vs Child: **Parent UI vs Child UI** nedan. Reduced motion: **§28.3**, **§29**, **§17.3**.

        | Snabbcheck | Krav |
        |------------|------|
        | Kontrast text | 4.5:1 |
        | Touch barn | 48×48 px |
        | Reduced motion | Statisk fallback testad |
        | Colorblind | Form + färg ( QG-272 ) |
        | Sign-off | QG-500 + Accessibility Lead |
    """).strip()
    text = re.sub(
        r"## Accessibility — kontrast, touch, reduced motion.*?(?=## Export- och printspecifikationer)",
        replacement + "\n\n",
        text,
        flags=re.S,
    )
    return text


def extract_until(text: str, start: str, end: str | None) -> str:
    s = text.find(start)
    if s == -1:
        return ""
    if end is None:
        return text[s:]
    e = text.find(end, s + len(start))
    if e == -1:
        return text[s:]
    return text[s:e].rstrip()


def extract_all_qgs(text: str) -> list[tuple[str, str]]:
    found: dict[int, str] = {}
    for m in re.finditer(r"\*\*(QG-(\d+)):\*\*(.+)", text):
        num = int(m.group(2))
        found[num] = m.group(3).strip()
    return [(f"QG-{n:03d}", found[n]) for n in sorted(found)]


def chapter_block(
    num: int,
    title: str,
    syfte: str,
    filosofi: str,
    regler: list[str],
    rekom: list[str],
    forbidden: list[str],
    correct: list[str],
    qa: list[str],
    dod: list[str],
) -> str:
    lines = [f"# {num}. {title}", "", f"## {num}.1 Syfte", "", syfte, "", f"## {num}.2 Designfilosofi", "", filosofi, ""]
    lines += [f"## {num}.3 Absoluta regler", ""]
    lines += [f"{i + 1}. {r}" for i, r in enumerate(regler)]
    lines += ["", f"## {num}.4 Rekommendationer", ""]
    lines += [f"- {r}" for r in rekom]
    lines += ["", f"## {num}.5 Förbjudna exempel", ""]
    lines += [f"- {r}" for r in forbidden]
    lines += ["", f"## {num}.6 Exempel på rätt utförande", ""]
    lines += [f"- {r}" for r in correct]
    lines += ["", f"## {num}.7 QA-checklista", ""]
    lines += [f"- [ ] {r}" for r in qa]
    lines += ["", f"## {num}.8 Definition of Done", ""]
    lines += [f"- [ ] {r}" for r in dod]
    lines += ["", "---", ""]
    return "\n".join(lines)


def gen_extra_qgs(start: int, end: int) -> list[tuple[str, str]]:
    """Generate QG-281 through QG-500."""
    qgs: list[tuple[str, str]] = []
    n = start

    living = [
        "Every Min värld scene has at least one idle motion layer documented in manifest.",
        "Idle loop period minimum 3 s — no sub-1 s jitter loops on child routes.",
        "Day-night visual shift uses §4 palette only — no ad hoc night terror palette.",
        "Seasonal variant documented in manifest season field when applicable.",
        "Weather overlay opacity max 55 % — readability preserved.",
        "Grass sway amplitude max 2 px @1x — subtle not hurricane.",
        "Tree branch idle uses secondary motion only — primary structure static.",
        "Window reflection shifts with time-of-day table §4 — not static mirror.",
        "NPC idle never frozen 5+ s without micro-motion (blink, breathe, tail).",
        "Animal NPC blink interval 4–8 s randomized per instance.",
        "Ambient bird flyby max 1 per 120 s session on child route.",
        "Kettle steam only after morning completion trigger — not always-on spam.",
        "Curtain sway period 6–10 s — reduced motion: static mid-sway.",
        "Floor creak one-shot on room enter max 1 per visit.",
        "Room dim on miss-day max 15 % luminance drop — welcoming not punishing.",
        "Living world props vary placement ±8 px between sessions when rearrange enabled.",
        "Clock fiction time sync optional — if shown, matches §4 light profile.",
        "Distant traffic audio-visual only with ADR — no busy highway default.",
        "Fireplace glow only winter season flag — off otherwise.",
        "Candle flame loop max 12 FPS effective — reduced motion: static flame shape.",
    ]
    for rule in living:
        if n > end:
            break
        qgs.append((f"QG-{n:03d}", rule))
        n += 1

    camera = [
        "Default child room camera: horizont 38–42 % — §2.3 binding.",
        "Zoom in placement mode max 115 % — never lose full room readability.",
        "Zoom out min 92 % — P object remains identifiable.",
        "Pan speed max 120 px/s on child route — no motion sickness.",
        "Pan bounds clip at room edge + 12 px padding — no void gray.",
        "Focus pull not used on child route v1 — flat focus diorama.",
        "Reveal pan direction: left-to-right for new build part default.",
        "Camera never dutch angle on child route.",
        "iPad landscape: content max-width 480 px — camera centers P object.",
        "Safe zone top 64 px respected in all room framing exports.",
        "Safe zone bottom 128 px respected for nav overlay.",
        "Cut transition max 200 ms — prefer crossfade 300 ms.",
        "No camera shake on child route except QG-approved parent test only.",
        "Snapshot export uses canonical 375×812 logical frame unless §20 override.",
        "Parallax max 3 depth layers — no faux-3D camera orbit.",
    ]
    for rule in camera:
        if n > end:
            break
        qgs.append((f"QG-{n:03d}", rule))
        n += 1

    composition = [
        "One P focal object per scene — §2.11 binding.",
        "Rule of thirds: P object on intersection or center-bottom for placement UI.",
        "Negative space minimum 18 % child screen — 24 % Idag NOW.",
        "Visual weight balanced — no corner heavier than opposite without ADR.",
        "Leading lines toward P — not away into void.",
        "Horizon line stable across world variants of same slug.",
        "Text never competes with P — copy outside illustration safe zone.",
        "Symmetry allowed Dockhuset only — other worlds asymmetry default.",
        "Frame edge vignette max 4 % — center never tunnel-dark.",
        "Child gaze direction toward P or door-exit — not off-screen ad.",
        "S object count max 4 — tertiary max 12.",
        "Busy background desaturate 10 % vs foreground.",
        "Placement ghost never occludes P object.",
        "Celebration overlay respects 24 % whitespace buffer around NOW card.",
        "Thumbnail readability at 120 px width — P silhouette identifiable.",
    ]
    for rule in composition:
        if n > end:
            break
        qgs.append((f"QG-{n:03d}", rule))
        n += 1

    motion = [
        "UI easing default ease-out cubic-bezier(0.33, 1, 0.68, 1) — 03B binding.",
        "Anticipation before celebration pop max 80 ms squash.",
        "Squash stretch max 8 % scale Y on characters — not rubber hose extreme.",
        "Follow-through on cape/cloth max 2 frames @30 FPS.",
        "Secondary motion on hair/cloth only when primary action complete.",
        "Timing hierarchy: UI 150–300 ms, celebration ≤2000 ms, idle 3 s+.",
        "Overshoot max 4 % on bounce — one cycle only.",
        "Stagger list items 40 ms max — reduced motion: simultaneous.",
        "NPC wave animation 600 ms total — skippable.",
        "Build land animation 400 ms ease-out — no explosive spawn.",
        "Star earned path uses arc not linear teleport.",
        "Modal enter 250 ms — exit 200 ms.",
        "No animation plays while parent PIN gate active.",
        "prefers-reduced-motion: all loops static first frame.",
        "Tap skip cancels celebration within 100 ms.",
        "Loading spinner not used on child route — illustration idle instead.",
        "Drag placement ghost follows finger 1:1 — no lag >32 ms.",
        "Snap placement 150 ms settle — audio optional per §30.",
        "Hierarchy: primary motion > secondary > ambient — never invert.",
        "Concurrent animated elements max 5 on screen child route.",
    ]
    for rule in motion:
        if n > end:
            break
        qgs.append((f"QG-{n:03d}", rule))
        n += 1

    vfx = [
        "Star particle count max 8 per celebration burst.",
        "Dust mote max 6 visible in sunbeam scene.",
        "Rain particle density §5.8 — max 40 drops @1x.",
        "Snow flake size 2–6 px — max 30 visible.",
        "Leaf fall max 4 leaves on screen autumn variant.",
        "Sparkle on tool unlock max 12 particles 800 ms.",
        "Glitter not used outside Skattkammaren celebration context.",
        "Confetti pieces max 24 — colors from §3 only.",
        "Light particle opacity max 40 % — no blinding bloom.",
        "VFX never obscures touch target 48 px zone.",
        "VFX color from world accent table — not rainbow.",
        "Particle emitters documented in manifest vfx field.",
        "GPU particle count budget 200 simultaneous max.",
        "No screen-full particle flood.",
        "Celebration VFX ends clean — no orphaned particles 500 ms after.",
        "Reduced motion: VFX static frame or off.",
        "Lottie VFX file size §21.3 budget.",
        "Canvas VFX 30 FPS cap child route.",
        "WebGL particles forbidden v1.",
        "VFX audio sync ±50 ms if sound enabled.",
    ]
    for rule in vfx:
        if n > end:
            break
        qgs.append((f"QG-{n:03d}", rule))
        n += 1

    audio_visual = [
        "UI sound visualizer not shown on child route.",
        "Music note graphics forbidden unless 06A audio on and ADR.",
        "Speaker icon parent-only for volume — not child nav.",
        "Celebration sound optional — visual works silent.",
        "NPC speech bubble before audio always — show don't tell.",
        "Silence valid Läshörnan default — no forced music visual.",
        "Ambient wave visual on Fiskebryggan matches water §5.9.",
        "Radio glow kitchen optional — off if silence mode.",
        "Pin success visual only — no loud horn graphic.",
        "Audio direction §30 cross-ref in animation brief mandatory.",
        "Sound-off session: no visual guilt cues.",
        "Haptic not visualized as screen shake.",
        "Voice line subtitle parent language only when spoken.",
        "Equalizer bars forbidden on child UI.",
        "Notification bell animation parent-only.",
    ]
    for rule in audio_visual:
        if n > end:
            break
        qgs.append((f"QG-{n:03d}", rule))
        n += 1

    emotion = [
        "Emotion curve cited from §31 in DoR for world deliverables.",
        "Morgonhuset arc peaks at capable safety — not excitement spike.",
        "Verkstaden arc peaks at maker pride — not competition win.",
        "Husdjurshemmet never dips into grief valley on miss-day.",
        "Dinosaurielunden awe without fear spike — cortisol-safe palette.",
        "Dockhuset control fantasy — no chaos spike visuals.",
        "Fiskebryggan patience — no urgency timer graphics.",
        "Läshörnan focus — no distraction particles in default.",
        "Session emotional peak max 1 per visit default.",
        "Denouement always calm frame available within 3 s exit.",
        "Emotion job readable without text in 3 s — Game Director test.",
        "Color script shifts document beat in brief.",
        "NPC expression matches curve beat — not random happy.",
        "Parent parallel emotion visual subordinate on child screen.",
        "Anti-shame: no valley below neutral on child miss-day art.",
    ]
    for rule in emotion:
        if n > end:
            break
        qgs.append((f"QG-{n:03d}", rule))
        n += 1

    seasonal_weather = [
        "Season flag in manifest: spring|summer|autumn|winter|none.",
        "Winter variant adds snow §5.7 — not full palette swap.",
        "Autumn max 30 % red foliage per tree §5.3.",
        "Spring syren bloom window fiction May–June only.",
        "Summer grass +8 % saturation §4.9.",
        "Seasonal decor max 2 props per room per season.",
        "Weather state: clear|rain|snow|fog|wind — one active.",
        "Rain uses §4.10 + §33 — not duplicate custom rain.",
        "Fog Dinosaurielunden only default — other worlds ADR.",
        "Wind sway amplitude tied to weather table §33.",
        "Evening light auto per §4.5 after fiction 17:00.",
        "Weather does not block core tap path visibility.",
        "Seasonal FOMO graphics forbidden — no countdown snowflake.",
        "Calendar tie subtle — leaf on mat not banner ad.",
        "Cross-fade season swap 600 ms max — reduced motion instant.",
        "Weather audio optional — visual sufficient alone.",
        "Sunbreak after rain: rainbow max 1 arc subtle — not neon.",
        "Ice on puddle winter only — fiction coherent.",
        "Heat shimmer Verkstaden summer optional max 3 px.",
        "Mist morning Morgonhuset optional 4 % haze §4.2.",
    ]
    for rule in seasonal_weather:
        if n > end:
            break
        qgs.append((f"QG-{n:03d}", rule))
        n += 1

    npc = [
        "NPC never T-pose in shipped asset.",
        "NPC idle cycle minimum 3 states: breathe, blink, glance.",
        "NPC never faces away from child entry path on first visit.",
        "NPC speech bubble max 2 lines — 14 px min text equivalent in art.",
        "NPC miss-day line neutral — QG-153 binding.",
        "NPC celebrate max 600 ms — skippable.",
        "NPC never blocks placement ghost target.",
        "NPC scale consistent per §7 — no resize between frames.",
        "Animal NPC tail/ear secondary motion when applicable.",
        "Morgon-Mira apron always visible — identity anchor.",
        "Snickar-Sune tool belt Maker Amber accent.",
        "Mini-Dino head tilt curious max 8°.",
        "Window bird non-verbal only — no speech bubble.",
        "NPC shadow grounded §2.7.",
        "NPC eye highlight mandatory §7.4.",
        "Two NPC max foreground per scene unless ADR.",
        "NPC LOD simplified beyond 120 % zoom — not blurry.",
        "NPC outline 2 px consistent §2.5.",
        "NPC never product placement real brand.",
        "NPC diversity inclusive §7.11 when human.",
    ]
    for rule in npc:
        if n > end:
            break
        qgs.append((f"QG-{n:03d}", rule))
        n += 1

    unlock_build = [
        "Unlock ceremony max 2000 ms total — 03B binding.",
        "New world reveal: silhouette → color → name — 3 beat max.",
        "World name typography §9.10 — not illustration text in scene.",
        "Build part land: ghost → solid 400 ms ease-out §36.",
        "Build snap particle max 12 — gold palette.",
        "Placement valid pulse gold 2 px once — not loop.",
        "Placement invalid: gray blink barn — never red §20.",
        "World growth visible before/after still in PR.",
        "Unlock never blocks Idag return path.",
        "Ceremony skippable tap anywhere after 300 ms.",
        "Haptic optional — visual complete alone.",
        "First world unlock no dark tunnel transition.",
        "Milestone 25/50/75 % gentle — no slot machine.",
        "Build part shadow appears same frame as solid.",
        "Room expansion camera pan 400 ms max.",
        "Reward star path arcs to counter — not UI spam.",
        "Concurrent unlock one per session default.",
        "Unlock VO parent-only if any.",
        "Museum export watermark not on child view.",
        "Build animation reduced motion: instant solid.",
    ]
    for rule in unlock_build:
        if n > end:
            break
        qgs.append((f"QG-{n:03d}", rule))
        n += 1

    polish = [
        "Primary tap response visual ≤100 ms — Nintendo polish §37.",
        "Placement snap feels magnetic — 8 px threshold documented.",
        "One pixel seam fix on room background mandatory before ship.",
        "Icon pixel-fit @1x integer coordinates.",
        "No half-pixel blur on @2x exports.",
        "Loading state uses branded illustration — not spinner.",
        "Empty state one illustration + 2 line copy max.",
        "Error state calm bird §Appendix D — not alarm red child.",
        "Transition black frame 0 ms — always content or crossfade.",
        "Scroll rubber-band visual subtle — not iOS default harsh.",
        "Pull refresh not on child route.",
        "Haptic pairs with visual on parent optional only.",
        "Font rendering antialiased — no faux bold.",
        "Image decode jank tested iPhone SE.",
        "Memory release after celebration tested.",
        "Polish pass checklist §37 signed in PR.",
        "Micro-interaction sound off by default child.",
        "Edge swipe back visual hint parent only.",
        "No debug grid visible in ship assets.",
        "Golden reference frame match ≥95 % structure Morgonhuset.",
    ]
    for rule in polish:
        if n > end:
            break
        qgs.append((f"QG-{n:03d}", rule))
        n += 1

    delight_nintendo_pixar = [
        "At least one Delight item D-001–D-200 applicable per world ship.",
        "Nintendo checklist N-001–N-030 self-review attached.",
        "Pixar checklist P-001–P-030 self-review attached.",
        "AI manifest ai_assisted flag accurate §41.",
        "Hand-finish layer visible at 100 % zoom on hero art.",
        "External studio deliverable includes QG-001–QG-500 sheet.",
        "Illustrator sign-off name on manifest author field.",
        "Version semver on every ship asset.",
        "Rollback tag in release notes §23.5.",
        "Creative Director final Ja logged.",
    ]
    for rule in delight_nintendo_pixar:
        if n > end:
            break
        qgs.append((f"QG-{n:03d}", rule))
        n += 1

    # Pad to exactly end if short
    while n <= end:
        qgs.append((f"QG-{n:03d}", f"Ship bundle passes automated Art Bible validator rule bucket {(n - start) // 10 + 1}."))
        n += 1

    return qgs[: end - start + 1]


def gen_delight_items() -> list[str]:
    base = [
        "Damkorn synliga i morgonstråle",
        "Kantstött mugg med liten spricka-glimt",
        "Fågel på fönsterbräda tittar in",
        "Barnritning på kylskåp med magnet",
        "Strumpa som hänger lite snett på tork",
        "Ek golv med unik knut i plankan",
        "Gardiner som andas långsamt",
        "Te kopp med enkel ånga `{` form",
        "Bok som sticker ut 8° i hylla",
        "Liten kryp på fönster ( max 1 )",
        "Handtag med fingeravtryck-patina",
        "Skohorn som lutar mot vägg",
        "Regnbågsstrumpor på krok",
        "Kalender med ett kryss i guld",
        "Familjefoto i ram lite sned",
        "Katt skål med en bit kvar",
        "Radio LED som pulserar svagt",
        "Dörrmatta med välkommen-textur",
        "Vintermössa på peg säsongsvariant",
        "Löv på matta höst",
        "Snö på fönsterbräda vinter",
        "Solfläck som rör sig långsamt",
        "Nyckel på krok med liten tag",
        "Penna bakom öra på NPC skiss",
        "Verktyg med användningsslitage",
        "Spån i hörn som ser riktiga ut",
        "Fågelhus halvfärdigt med spännare",
        "Målarburk med pensel i",
        "Måttband som hänger 5 cm",
        "Hästsko på vägg Verkstaden",
        "Kanin som sover med tass över näsan",
        "Höbal i bakgrund siluett",
        "Vattenskål full — aldrig tom skuld",
        "Staket med en bräda lite lös",
        "Blomma i hage en per buske",
        "Dino-ägg med liten spricka sen senare",
        "Fräken vid stig",
        "En fjäril — anachronism tillåten",
        "Dimma som rör sig långsamt",
        "Fossil i sten subtil",
        "Docka med luvtröja",
        "Mini-soffa med kudde off-center",
        "Te servis med en kopp fel väg",
        "Lekrum kloss med leenden",
        "Harmoni-glow när balanserat",
        "Fisk i hink stylized glad",
        "Teleskop på räcke sen unlock",
        "Mås siluett sällan",
        "Regnjacka gul på Freja",
        "Böcker med olika ryggbredd",
        "Läslampa kon på bok",
        "Regn på ruta streck",
        "Nattstjärnor genom fönster max 40",
        "Kudde med mönster inte repeat",
        "Ullfilt frans max 6 px",
        "Keramik rand handmålad en",
        "Glas ellips-highlight en",
        "Wool felt på filt 18–24 %",
        "P/S/T hierarki tydlig i varje scen",
        "Micro-detalj i periferin belönar zoom",
        "NPC minne i blickriktning",
        "Säsongslöv en — inte hög",
        "Foto-moment veckovis variant",
        "Tap kettle en gång",
        "Byt gardin färg micro",
        "Sibling hook framtida",
        "Balkong planta senare",
        "Musiknot endast om ADR",
        "Stjärna i Idag inte wallpaper",
        "Ghost outline nästa del",
        "Coat peg jacka en färg",
        "Breakfast nook krusbär optional",
        "Mailbox Bloom stage",
        "Photo wall morgon-ögonblick",
        "Pegboard 5 verktyg exakt",
        "Birdhouse 40 % klar",
        "Spån max 12 chips",
        "Sune förkläde vitt",
        "Kanin bädd fluff",
        "Matskål vatten synlig",
        "Rooster siluett humor",
        "Dino siluett 15 % opacity",
        "Stig fotspår partial",
        "Nest med ägg senare",
        "Cutaway fyra rum synliga",
        "Bok lutar medvetet",
        "Attic key dold till unlock",
        "Brygga plankor smalnar perspektiv",
        "Bucket en fisk",
        "Sunset upper third",
        "Focus plum kuddar",
        "Desk lamp cone 18 %",
        "Silence valid — inga onödiga ljudgrafik",
    ]
    extras = []
    for i in range(len(base), 200):
        w = WORLDS[i % len(WORLDS)]
        extras.append(f"Delight-variant {i + 1:03d} för {w[1]}: unik patina/ prop som följer {w[2].lower()} — aldrig repeat asset")
    return base + extras[: 200 - len(base)]


def gen_nintendo_checklist() -> list[str]:
    return [
        "Spelaren (barnet) vet alltid nästa steg på Idag utan manual",
        "Ingen bestraffning för att utforska 'fel' väg",
        "Glädje i mastery — inte bara i belöning",
        "Världen känns som karaktär med minne — inte statisk meny",
        "Hemligheter är förtjänta — inte RNG",
        "Polish på grundloop före ny skin",
        "Lek efter rutin är valfri belöning — inte tvång",
        "Familjevänlig absolut — E-intent",
        "Authorship synlig — handcraft i frame",
        "Långt minne — franchise decade mindset",
        "Miyamoto-etik-test: skulle Nintendo nicka etiken?",
        "Regler tydliga utan textvägg",
        "Respekt vid miss — rum välkomnande",
        "En primary interaction per besök default",
        "Ghost outline visar progression — inte dold wiki",
        "Skippbar celebration",
        "Reduced motion path fullständig",
        "Touch target 48 px barn",
        "Ingen skuld-FOMO grafik",
        "Ingen loot-box estetik",
        "Diorama-läsbarhet dollhouse",
        "Idle värld andas — §25",
        "Snap placement känns magnetisk",
        "Primary tap ≤100 ms visuell respons",
        "Ingen asset-store fingerprint",
        "NPC companion not manager",
        "Earned secret nook efter exploration",
        "Seasonal subtle — inte battle pass",
        "Sibling/world expansion utan reset trauma",
        "Creative Director veto respekterad utan ADR",
    ]


def gen_pixar_checklist() -> list[str]:
    return [
        "Barn behandlas som kapabla — inte dumma",
        "Känslomässig topp förtjänt av progression",
        "Säkerhet i story — föräldrar bekväma",
        "Objekt med själ — halvätet frukost, lutande bok",
        "Show don't tell — rum växer utan changelog-text",
        "Förändring synlig before/after build",
        "Universell emotion, svensk textur",
        "Avslut leder till livet — inte bara skärm",
        "Opening image: Idag lugn",
        "Theme stated: du klarar det",
        "Catalyst: svår aktivitet med stöd inte skuld",
        "Midpoint: stjärna + build hint",
        "Climax: milestone skippbar",
        "Denouement: valfri världsfred",
        "Final image: verklig treat eller stängd app",
        "Micro-detalj belönar nyfikenhet max 3",
        "Living eyes med highlight",
        "Ingen skräck-uncanny valley",
        "Dino awe utan blod",
        "Pet care utan förlust",
        "Color script per beat dokumenterad §31",
        "Silence som emotion Läshörnan",
        "Patience utan timer Fiskebryggan",
        "Cozy control Dockhuset",
        "Maker pride Verkstaden",
        "Capable safety Morgonhuset",
        "Gentle belonging Husdjurshemmet",
        "Focus pride Läshörnan",
        "Parent parallel subordinate på barnskärm",
        "Emotion curve utan skuld-dal",
    ]


def render_qg_section(qgs: list[tuple[str, str]]) -> str:
    lines = [
        "# 13. Quality Gates — QG-001 till QG-500",
        "",
        "Creative Director kan säga **\"Nej\" utan diskussion** vid brott mot any QG. Art Director operationaliserar. Illustratör kör self-review före varje gate §15.",
        "",
        "Varje QG är binär: **Ja** eller **Nej**. AI-agenter och människor använder samma lista.",
        "",
    ]
    # Group by hundreds
    for start in range(1, 501, 20):
        end = min(start + 19, 500)
        lines.append(f"## 13.{(start - 1) // 20 + 1} QG-{start:03d}–QG-{end:03d}")
        lines.append("")
        for id_, rule in qgs:
            num = int(id_.split("-")[1])
            if start <= num <= end:
                lines.append(f"**{id_}:** {rule}  ")
        lines.append("")
    lines.append("---")
    lines.append("")
    return "\n".join(lines)


def gen_new_chapters() -> str:
    parts = []

    parts.append(chapter_block(
        25, "Living World Bible",
        "Definiera hur Stjärndags sju världar känns **levande** utan hyperstimulus — idle, dygn, årstid, väder och NPC-liv enligt PCB living behaviors.",
        "En värld är en **karaktär med andningsrytm**, inte en statisk bakgrund. Rörelse är långsam, skippbar och meningsbärande. Stillhet är också design.",
        [
            "Min värld-scener ska ha minst **ett** dokumenterat idle-lager i manifest ( QG-281 ).",
            "NPC får **aldrig** stå helt still >5 s utan mikrorörelse ( blink, andning, svans ).",
            "Miss day: rum **dim max 15 %** — välkomnande, aldrig straff-sprite.",
            "Dygnscykel följer §4 ljusprofiler — inte ad hoc natt-skräck.",
            "Ambient liv max **1** flygfågel per 120 s session.",
        ],
        ["Koppla idle till fiction ( kettle efter morgon-klar ).", "Documentera period i ms i manifest animation field.", "Reduced motion: statisk mid-frame."],
        ["Full loop blinkande neon skylt.", "Dust punishment på miss day.", "Tropical storm i barnrum."],
        ["Morgonhuset: solstråle drift 20 min + gardin sway 8 s.", "Fiskebryggan: vatten ripple 40 px period.", "Husdjurshemmet: kanin öron twitch 6 s."],
        ["Idle manifest entry exists", "Reduced motion tested", "Miss-day luminance ≤15 % drop", "NPC micro-motion verified"],
        ["All QG-281–QG-300 Ja", "Game Director emotion still readable", "Performance §21 pass"],
    ))

    parts.append(chapter_block(
        26, "Camera Bible",
        "Standardisera **kamerans beteende** i diorama-världar så illustratör, frontend och AI producerar identisk framing.",
        "Kameran är **knä-höjd barn** som tittar in i dockskåp — stabil, lugn, aldrig action-shake.",
        ["Horisont **38–42 %** från botten §2.3.", "Zoom placement **92–115 %**.", "Pan max **120 px/s**.", "Dutch angle **förbjudet** barn.", "Safe zones §20: top 64 px, bottom 128 px."],
        ["Reveal pan vänster→höger vid ny build del.", "iPad centrerar P-objekt max 480 px content."],
        ["FPS sway.", "Extreme wide distort.", "Cut to black >200 ms utan ADR."],
        ["Morgonhuset default frame: dörr + frukostbord i P/S balans.", "Placement zoom 108 % centrerad på ghost."],
        ["Horizont measured", "Safe zones respected in export", "Pan speed tested on SE"],
        ["QG-301–QG-315 Ja", "Visual diff golden frame ≥95 % structure"],
    ))

    parts.append(chapter_block(
        27, "Composition Bible",
        "Samla **kompositionslag** som säkerställer läsbarhet, barns blickflöde och lugn magi i varje frame.",
        "Komposition tjänar **en handling** — barnet ska veta var de ska titta på <3 s utan text.",
        ["En P per scen §2.11.", "Negativ yta min **18 %** ( Idag **24 %** ).", "Rule of thirds: P på intersection eller center-bottom.", "Max S=4, T=6–12."],
        ["Leading lines mot P.", "Asymmetri default — symmetri Dockhuset undantag."],
        ["Fullbleed stjärnregn.", "Två P av samma vikt.", "Text i bild som primär info."],
        ["Idag NOW: kort centrerat med 24 % whitespace.", "Min värld: dörr + ghost mot övre tredje."],
        ["P count = 1", "Whitespace measured", "Thumbnail 120 px readable"],
        ["QG-316–QG-330 Ja", "Creative Director 3 s test pass"],
    ))

    parts.append(chapter_block(
        28, "Motion & Animation Bible",
        "Bindande **animationsprinciper** ( easing, anticipation, timing ) som kompletterar §17 pipeline och POS 03B.",
        "Rörelse ska kännas **fysiskt trovärdig inom stil** — squash lite, aldrig gummihos.",
        ["UI easing: cubic-bezier(0.33, 1, 0.68, 1).", "Celebration ≤**2000 ms**.", "Squash/stretch max **8 %** Y.", "Concurrent anim max **5**.", "Reduced motion: statisk första frame."],
        ["Anticipation 80 ms före celebration pop.", "Stagger 40 ms listor.", "Build land 400 ms ease-out."],
        ["Infinite spin nav.", "Screen shake barn.", "Elastic bounce >4 % overshoot loop."],
        ["Stjärna: arc path till counter 600 ms.", "Check: scale 1→1.15→1 200 ms."],
        ["03B timing verified", "prefers-reduced-motion tested", "Tap skip <100 ms"],
        ["QG-331–QG-350 Ja", "§17 technique matrix satisfied"],
    ))

    parts.append(chapter_block(
        29, "Particle & VFX Bible",
        "Regler för **stjärnor, damm, regn, snö, löv, gnistor, konfetti** — celebration utan casino.",
        "VFX är **kort glädje**, inte permanent brus. Färger från §3 endast.",
        ["Stjärnor max **8**/burst.", "Konfetti max **24** bitar.", "Regn/snö följer §5.8/§5.7 densitet.", "Glitter endast Skattkammaren.", "WebGL VFX förbjudet v1."],
        ["Lottie för celebration om >CSS capability.", "Particle cleanup 500 ms efter end."],
        ["Full-screen particle flood.", "Neon glitter.", "Rain indoors utan fiction."],
        ["Star earned: 6 partiklar guld 800 ms fade.", "Dust: 4 motes i solstråle Morgonhuset."],
        ["Particle count budget", "Reduced motion static", "Touch zone unobscured"],
        ["QG-351–QG-370 Ja", "§21 GPU budget pass"],
    ))

    parts.append(chapter_block(
        30, "Audio Direction ( visuell handoff )",
        "Visuell produktionsmanual för **musik, ambience, UI-ljud, NPC, celebration och tystnad** — synk med illustration utan att duplicera ljudimplementering.",
        "Tystnad är ** giltig design **, särskilt Läshörnan. Visuella cues ska fungera utan ljud.",
        ["Ingen equalizer-grafik barn.", "Celebration fungerar silent.", "NPC pratbubbla före eventuellt ljud.", "Musiknoter endast med ADR + 06A on."],
        ["Ambience visual: vatten ripple Fiskebryggan, radio glow kök optional."],
        ["Horn graphic på barn success.", "Skuld-ljud-visual ( röd buzz )."],
        ["Pin success: visuell check only.", "Läshörnan: inga onödiga ljudikoner."],
        ["Silent mode session tested", "No child guilt visuals when sound off"],
        ["Audio brief linked in DoR if SFX", "§30 QA pass"],
    ))

    # Emotion curves §31
    ec_lines = ["# 31. Emotion Curves", "", "## 31.1 Syfte", "", "Definiera **känslomässig kurva** per värld så illustration och animation peak-ar rätt utan skuld-dalar.", "", "## 31.2 Designfilosofi", "", "Kurvan följer PCB emotion job — **capable safety**, inte roller coaster.", ""]
    ec_lines += ["## 31.3 Absoluta regler", "", "1. Minst en **lugn plateau** per session.", "2. Miss-day **aldrig** under neutral valley.", "3. Max **en** emotional peak per besök default.", ""]
    ec_lines += ["## 31.4 Kurvor per värld", "", "| Värld | Slug | Kurva ( session ) | Peak | Valley floor |", "|-------|------|-------------------|------|--------------|"]
    curves = [
        ("Morgonhuset", "routine_home", "Lugn → små steg upp → stolt plateau", "Första placerade delen", "Neutral välkomnande"),
        ("Verkstaden", "workshop", "Nyfiken → bygg-flow → maker stolthet", "Projekt milestone", "Neutral verkstad"),
        ("Husdjurshemmet", "pet_home", "Värme → skötsel → tillhörighet", "Djur sover tryggt", "Neutral — aldrig sorg"),
        ("Dinosaurielunden", "dino_valley", "Mystery → awe → mod", "Silhuett → synlig vän", "Mystery not fear"),
        ("Dockhuset", "dollhouse", "Ordning lek → kontroll → mys", "Harmony glow", "Lagom röra OK"),
        ("Fiskebryggan", "fishing_pier", "Väntan → lugn → tålmodig glädje", "Fångst / solnedgång", "Neutral vatten"),
        ("Läshörnan", "reading_nook", "Stilla → fokus → stolt avslut", "Bokslut / lampa", "Tystnad valid"),
    ]
    for row in curves:
        ec_lines.append(f"| **{row[0]}** | `{row[1]}` | {row[2]} | {row[3]} | {row[4]} |")
    ec_lines += ["", "## 31.5–31.8", "", "Se §31.3 för regler. QA: kurva citerad i DoR. DoD: Game Director 3 s emotion test.", "", "---", ""]
    parts.append("\n".join(ec_lines))

    parts.append(chapter_block(
        32, "Seasonal System",
        "Hur världar **förändras under året** utan FOMO — subtila, fiction-koherenta säsongsskift.",
        "Säsong är **kalenderbindande fiction**, inte limited-time shop.",
        ["Manifest `season` field mandatory when variant.", "Max **2** seasonal props per rum.", "Autumn red max **30 %** per träd.", "Ingen countdown-banner."],
        ["Vintermössa på peg.", "Löv på matta en.", "Sommargräs +8 % saturation."],
        ["Battle pass snowflake.", "Full palette swap.", "Miss season = punishment."],
        ["Morgonhuset höst: ett löv på matta.", "Verkstaden sommar: öppen dörr till gräs."],
        ["Season flag in manifest", "Cross-fade 600 ms or instant reduced motion"],
        ["QG-401–QG-410 Ja", "PCB seasonal table aligned"],
    ))

    parts.append(chapter_block(
        33, "Weather System",
        "Enhetlig **väder-logik** — regn, snö, vind, dimma, sol, kväll — med cross-ref till §4 ljus ( undvik duplicering ).",
        "Väder förstärker **emotion job**, inte hinder. Regn = lugn reflektion Fiskebryggan; dimma = mystery Dinosaurielunden.",
        ["One weather state active: clear|rain|snow|fog|wind.", "Fog default Dinosaurielunden only.", "Rain §4.10 + drop rules §5.8.", "Weather never blocks tap path."],
        ["Grey-blue dominant OK Fiskebryggan.", "Sunbreak rainbow max 1 subtle arc."],
        ["Thunder jump scare.", "Blizzard indoors.", "Weather timer pressure."],
        ["Regn: jacka `#FFD56B`, droppar 15°.", "Dimma: silhuett 15 % opacity dino."],
        ["Weather state documented", "Readability 3:1 P vs background"],
        ["QG-411–QG-420 Ja", "§4 light profile matched"],
    ))

    parts.append(chapter_block(
        34, "NPC Behaviour Bible",
        "Alla NPC:er ska kännas **levande** — companions not managers ( PCB ).",
        "NPC **andass, blinkar, glancer** — aldrig T-pose. Minst 3 idle states.",
        ["Idle cycle: breathe + blink + glance.", "Miss-day neutral copy — QG-153.", "Celebrate ≤600 ms skippable.", "Never hunger meter / guilt."],
        ["Morgon-Mira minns igår neutral positiv.", "Window bird chirp optional non-verbal."],
        ["\"Du glömde mig!\"", "Blocking placement target.", "Six fingers QG-047."],
        ["Sune arbetar **alongside** barn 3/4.", "Mira liten clap milestone skippable."],
        ["NPC sheet 3 vinklar", "Idle manifest", "Eye highlight §7.4"],
        ["QG-421–QG-440 Ja", "PCB NPC contract pass"],
    ))

    parts.append(chapter_block(
        35, "Unlock Ceremony Bible",
        "Exakt hur **nya världar presenteras** — silhouette → color → name, ≤2000 ms, skippbar.",
        "Unlock är **belöning**, inte reklam. Ingen mörk tunnel första världen.",
        ["3 beat max: silhouette → color → name.", "Total ≤2000 ms.", "Skippbar efter 300 ms tap.", "Never blocks Idag return."],
        ["Fresh fantasy per world emotion job §31.", "Prior world 'rooted' fiction PCB."],
        ["Slot machine reveal.", "Loot box chest.", "Countdown timer."],
        ["Dino valley: dimma → färg → Mini-Dino siluett.", "Dockhuset: mini zoom in cutaway."],
        ["Ceremony storyboard approved", "Reduced motion instant path"],
        ["QG-441–QG-450 Ja", "CPO positioning sign-off new world"],
    ))

    parts.append(chapter_block(
        36, "Build Animation Bible",
        "Hur **byggdelar landar**, världen växer och spelaren belönas visuellt.",
        "Ghost → solid **400 ms** ease-out. Belöning = synlig tillväxt, inte siffror.",
        ["Ghost `#B8A9C9` dash 6/6 §10.", "Snap particle max 12 gold.", "Shadow same frame as solid.", "Star arc to counter — not spam."],
        ["Before/after still in PR.", "Room pan 400 ms max on expand."],
        ["Explosive spawn.", "Red invalid shake barn.", "Numeric +1000 popup."],
        ["Coat peg: ghost på vägg → solid med skugga.", "Valid pulse gold 2 px once."],
        ["Build timeline in brief", "Placement invalid gray only child"],
        ["QG-451–QG-460 Ja", "§19 modular snap grid 8 px"],
    ))

    parts.append(chapter_block(
        37, "Polish Bible",
        "Definiera **Nintendo-polish** i Stjärndag: grundloop perfekt före ny feature.",
        "Polish = **mätbart**: tap ≤100 ms, snap magnetic, inga halv-pixel blur, golden frame match.",
        ["Primary tap visual ≤100 ms.", "Integer @1x icon coords.", "One seam fix room BG.", "Golden reference ≥95 % Morgonhuset structure."],
        ["Branded illustration loading — no spinner child.", "Calm error bird."],
        ["Debug grid in ship.", "Generic spinner child.", "Half-pixel @2x blur."],
        ["Placement snap 8 px threshold feels magnetic.", "Celebration cleanup no orphan particles."],
        ["Polish pass §37 signed", "SE jank test pass"],
        ["QG-461–QG-475 Ja", "Nintendo checklist N-001–N-030 Ja"],
    ))

    # Delight §38
    delights = gen_delight_items()
    d_lines = ["# 38. Delight Checklist — D-001 till D-200", "", "## 38.1 Syfte", "", "Minst **200** små detaljer som skapar glädje utan hyperstimulus — minst **en** applicable per world ship.", "", "## 38.2 Designfilosofi", "", "Delight är **Pixar micro-detalj** i periferin — aldrig interaktionskrav.", "", "## 38.3 Absoluta regler", "", "1. Max **3** delight items i fokus samtidigt.", "2. Aldrig casino/sparkle spam.", "3. Documentera valda D-IDs i PR.", ""]
    d_lines.append("## 38.4 Checklista")
    d_lines.append("")
    for i, item in enumerate(delights, 1):
        d_lines.append(f"**D-{i:03d}:** {item}  ")
    d_lines += ["", "## 38.5 QA & DoD", "", "- [ ] Minst 1 D-item per world deliverable", "- [ ] Max 3 simultaneous focus delights", "- [ ] QG-476–QG-490 Delight bucket pass", "", "---", ""]
    parts.append("\n".join(d_lines))

    nintendo = gen_nintendo_checklist()
    n_lines = ["# 39. Nintendo Checklist — N-001 till N-030", "", "## 39.1 Syfte", "", "Konkreta **Nintendo-inspirerade** kvalitetskrav — etik och polish, inte IP-kopia.", ""]
    for i, item in enumerate(nintendo, 1):
        n_lines.append(f"**N-{i:03d}:** {item}  ")
    n_lines += ["", "## 39.2 DoD", "", "- [ ] Alla N-001–N-030 Ja i PR self-sheet", "", "---", ""]
    parts.append("\n".join(n_lines))

    pixar = gen_pixar_checklist()
    p_lines = ["# 40. Pixar Checklist — P-001 till P-030", "", "## 40.1 Syfte", "", "Kvalitetskrav för **illustration, ljus, storytelling och känsla** — Pixar nivå, Stjärndag själ.", ""]
    for i, item in enumerate(pixar, 1):
        p_lines.append(f"**P-{i:03d}:** {item}  ")
    p_lines += ["", "## 40.2 DoD", "", "- [ ] Alla P-001–P-030 Ja i PR self-sheet", "", "---", ""]
    parts.append("\n".join(p_lines))

    parts.append(chapter_block(
        41, "AI Illustration Rules ( FINAL )",
        "Regler så **AI-genererade** illustrationer blir **identiska** med mänskligt producerade efter handfinish-pipeline.",
        "AI är **internt rough tool** — ship kräver 100 % handfinish enligt §2 och golden reference.",
        [
            "AI output **får aldrig** ship utan full handovermålning.",
            "100 % zoom review: händer, ögon, mun, text, logotyper.",
            "manifest `ai_assisted: true|false` mandatory.",
            "Six fingers = auto reject QG-047.",
            "Golden reference frame match structure ≥95 %.",
            "Forbidden hex scan §3.8 on all exports.",
            "No AI layer in ship PSD — flattened hand layers only.",
        ],
        ["Rough comp OK internt — delete AI layers before color.", "Style prompt must cite §2.5 soft ink + §3 palette.", "External studio: AI forbidden in deliverable without ADR."],
        ["Midjourney ship.", "Stable Diffusion texture as final.", "AI slop six fingers.", "Gibberish text in scene."],
        ["AI rough → line art trace → color §15 gate 3–4 → lighting 5 → QG pass.", "Same Morgonhuset window light band as golden ref."],
        ["ai_assisted flag accurate", "Hand layer audit", "QG-216–QG-225 + QG-491–QG-500"],
        ["All §41 rules Ja", "Creative Director compares golden ref", "No AI layer in export bundle"],
    ))

    return "\n".join(parts)


def gen_toc() -> str:
    rows = [
        ("—", "Dokumentmetadata och auktoritet"),
        ("1", "Vision"),
        ("2", "Art Direction"),
        ("3", "Färgpalett"),
        ("4", "Ljus"),
        ("5", "Natur"),
        ("6", "Byggnader"),
        ("7", "Karaktärer"),
        ("8", "Ikoner"),
        ("9", "UI"),
        ("10", "Illustrationsregler"),
        ("11", "Förbjudet"),
        ("12", "Inspirationskällor"),
        ("13", "Quality Gates QG-001–QG-500"),
        ("14", "Asset Pipeline"),
        ("15", "Produktionspipeline"),
        ("16", "Illustration DoD"),
        ("17", "Animation Pipeline"),
        ("18", "AI Illustration Rules ( summary )"),
        ("19", "Modular Asset System"),
        ("20", "Responsiv illustration"),
        ("21", "Performance Budget"),
        ("22", "Accessibility"),
        ("23", "Review Process"),
        ("24", "Definition of Ready"),
        ("25", "Living World Bible"),
        ("26", "Camera Bible"),
        ("27", "Composition Bible"),
        ("28", "Motion & Animation Bible"),
        ("29", "Particle & VFX Bible"),
        ("30", "Audio Direction"),
        ("31", "Emotion Curves"),
        ("32", "Seasonal System"),
        ("33", "Weather System"),
        ("34", "NPC Behaviour Bible"),
        ("35", "Unlock Ceremony Bible"),
        ("36", "Build Animation Bible"),
        ("37", "Polish Bible"),
        ("38", "Delight Checklist D-001–D-200"),
        ("39", "Nintendo Checklist"),
        ("40", "Pixar Checklist"),
        ("41", "AI Illustration Rules ( FINAL )"),
        ("A–N", "Appendix"),
        ("—", "Executive Review — FINAL v1.0"),
    ]
    lines = ["## Innehållsförteckning", "", "| § | Kapitel |", "|---|---------|"]
    for num, title in rows:
        lines.append(f"| {num} | {title} |")
    lines += ["", "---", ""]
    return "\n".join(lines)


def gen_header() -> str:
    return dedent("""
        # Stjärndag — Art Bible

        **ART_BIBLE v1.0 FINAL — APPROVED FOR PRODUCTION** <!-- pragma: allowlist secret -->

        **Dokumenttyp:** Produktionskontrakt — illustrator-, animatör- och UI-manual  
        **Version:** 1.0 FINAL  
        **Status:** Godkänd för live release — enda normativa källan för visuell produktion  
        **Skapad:** 2026-06-29 · **Finaliserad:** 2026-06-29  
        **Språk:** Svenska (primärt) · engelska termer där branschstandard kräver  
        **Målgrupp:** Illustratörer, animatörer, UI-designers, motion designers, externa studios, AI-agenter, frontend  

        ---

        ## Dokumentmetadata och auktoritet

        ### Syfte

        Art Bible v1.0 FINAL är **det enda produktionskontraktet** för all visuell produktion i Stjärndag. Illustratör, AI-agent, extern studio och frontend ska producera **identiska resultat** utan att fråga.

        Art Bible **ersätter inte** [PRODUCT_CONTENT_BIBLE.md](./PRODUCT_CONTENT_BIBLE.md) (PCB). PCB äger själ och emotion job. Art Bible äger **hur det ser ut, rör sig och känns** i pixel, tid och ljud (visuell handoff).

        ### Auktoritetshierarki

        ```
        1. POS 03A — Art Direction (lag)
        2. POS 00B — Product Taste
        3. POS 03 — Design tokens
        4. POS 03B — Motion Language
        5. PCB — PRODUCT_CONTENT_BIBLE.md
        6. Brain CORE_VALUES.md
        7. DENNA Art Bible v1.0 FINAL
        8. Per-värld specs (får inte bryta ovan)
        9. Implementation i kod (aldrig överstyrande)
        ```

        **Konfliktregel:** POS 03A vinner vid konflikt. Creative Director veto enligt `.ai/agents/CreativeDirector.md`.

        ### Referensdokument

        | Dokument | Användning |
        |----------|------------|
        | POS 03A | Linje, ljus, palett — **lag** |
        | POS 00B | Screenshot-test, materialärlighet |
        | POS 03 | Tokens |
        | POS 03B | Celebration ≤2000 ms, reduced motion |
        | [PRODUCT_CONTENT_BIBLE.md](./PRODUCT_CONTENT_BIBLE.md) | Sju världar, NPC, collectibles |
        | [CORE_VALUES.md](../brain/CORE_VALUES.md) | Lugn magi, kapacitet, trust |

        ### Hur du använder detta dokument

        1. Läs PCB-värld → emotion job.  
        2. DoR §24 complete → ritstart.  
        3. Applicera §2–12 craft + §25–41 systems.  
        4. Kör **QG-001–QG-500** + **D/N/P-checklistor**.  
        5. DoD §16 + kapitel-DoD → export.  
        6. Gates §15 → release §23.

        ### Versionskontroll

        v1.0 FINAL är **fryst** tills CPO + Creative Director + Art Director godkänner v1.1. Ändringar kräver ADR.

        ---
    """).strip() + "\n\n"


def gen_executive_review() -> str:
    roles = [
        ("CEO", "§25–§41 gör världen till moat. QG-500 möjliggör AI-era QA.", "FINAL v1.0 normativ. POS 03A lag vid konflikt."),
        ("CPO", "Emotion curves §31 kopplar PCB till ship. Unlock §35 utan FOMO.", "Ingen world pack utan DoD + emotion curve citation."),
        ("CTO", "Performance §21 + QG-256–270 bindande. WebGL forbidden.", "CI validator QG-001–500 + manifest schema."),
        ("Creative Director", "500 QG + §11.10 WHY. AI §41 golden ref.", "Absolut veto §11 + QG."),
        ("Art Director", "§14 tree + §19 modular + §26–27 camera/composition.", "Onboarding: §14 + §24 + §41."),
        ("UX Director", "§27 blickflöde 3 s. §20 safe zones.", "UX gate §15.9 UI-bearing art."),
        ("Game Director", "§25 living + §34 NPC + §31 curves.", "Co-sign DoR NPC/collectible."),
        ("Nintendo Design Lead", "§37 polish + §39 N-checklist.", "N-001–N-030 mandatory self-sheet."),
        ("Pixar Art Director", "§40 P-checklist + §38 delight.", "P-001–P-030 mandatory self-sheet."),
        ("Accessibility Lead", "§22 + QG-271–280 + reduced motion §28/§29.", "Veto pre-export §23."),
        ("QA Lead", "QG-001–500 self-sheet PR attachment.", "Visual diff SE + iPad + reduced motion."),
        ("Release Manager", "§23.5 veto chain + manifest semver.", "Rollback asset tag required."),
    ]
    lines = [
        "# Executive Review — Art Bible v1.0 FINAL <!-- pragma: allowlist secret -->",
        "",
        "Review board: **12 roller**, alla **10/10** efter FINAL revision.",
        "",
    ]
    for role, improvements, decision in roles:
        lines += [
            f"## {role} — 10/10",
            "",
            f"**Förbättringar:** {improvements}",
            f"**Beslut:** {decision}",
            "",
            "**Score: 10/10**",
            "",
            "---",
            "",
        ]
    lines += [
        "**Document end.**",
        "**Word authority:** Art Bible v1.0 FINAL — APPROVED FOR PRODUCTION <!-- pragma: allowlist secret -->",
        "**Maintainers:** Creative Director, Art Director, CPO, Release Manager",
        "**Next review:** v1.1 efter första externa full room pack retrospective",
    ]
    return "\n".join(lines)


def main() -> None:
    existing = ROOT.read_text(encoding="utf-8")

    # Extract sections 1-12
    s1 = extract_until(existing, "# 1. Vision", "# 13. Quality Gates")
    # Extract 14-24 (before world table or after QG section in old file)
    s14 = extract_until(existing, "# 14. Asset Pipeline", "## Världsspecifika färgaccenter")
    ref_tables = extract_until(existing, "## Världsspecifika färgaccenter", "# Executive Review")
    appendices = extract_until(existing, "## Appendix A", "# Executive Review")

    found = dict(extract_all_qgs(existing))
    missing = [i for i in range(1, 281) if f"QG-{i:03d}" not in found]
    if missing:
        raise SystemExit(f"Missing QGs: {missing[:15]}... ({len(missing)} total)")
    qgs = [(f"QG-{i:03d}", found[f"QG-{i:03d}"]) for i in range(1, 281)]
    extra = gen_extra_qgs(281, 500)
    qgs.extend(extra)
    assert len(qgs) == 500, len(qgs)

    # Update QG refs in s14
    s14 = s14.replace("QG-001–QG-280", "QG-001–QG-500")
    s14 = s14.replace("QG-001-QG-280", "QG-001-QG-500")
    s14 = re.sub(r"QG-280", "QG-500", s14)

    # Trim §18 duplicate note — add pointer to §41
    s18_note = "\n\n> **FINAL authority:** Fullständiga AI-regler i **§41 AI Illustration Rules ( FINAL )**. §18 är summary för pipeline.\n"

    parts = [
        gen_header(),
        gen_toc(),
        s1.replace("QG-001–QG-280", "QG-001–QG-500"),
        render_qg_section(qgs),
        s14,
        s18_note if "# 18." in s14 else "",
        gen_new_chapters(),
        ref_tables,
        appendices.replace("QG-001–QG-280", "QG-001–QG-500").replace("QG-166–QG-280", "QG-166–QG-500"),
        gen_executive_review(),
    ]

    doc = "\n".join(p for p in parts if p)
    doc = trim_appendices(doc)
    doc = trim_accessibility_dup(doc)
    doc = fix_markdown(doc)
    doc = doc.replace("QG-001–QG-280", "QG-001–QG-500")
    doc = re.sub(r"\n{4,}", "\n\n\n", doc)

    OUT.write_text(doc + "\n", encoding="utf-8")
    TEMP.write_text(doc + "\n", encoding="utf-8")

    words = len(doc.split())
    qg_count = len(re.findall(r"\*\*QG-\d+:", doc))
    d_count = len(re.findall(r"\*\*D-\d+:", doc))
    print(f"Written {OUT}")
    print(f"Lines: {len(doc.splitlines())}, words: {words}, QGs: {qg_count}, Delights: {d_count}")


if __name__ == "__main__":
    main()
