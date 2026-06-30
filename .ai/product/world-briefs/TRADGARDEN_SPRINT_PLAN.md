# Trädgården — Game Director Sprint Plan

**Roll:** Game Director, Living World  
**Underlag:** [TRADGARDEN_WORLD_BRIEF.md](./TRADGARDEN_WORLD_BRIEF.md) · Living World Playbook v1.0 (godkänd)  
**Status:** Aktiv under implementation  
**Version:** 1.0  
**Datum:** 2026-06-30

**Medvetet uteslutet:** implementation · kod · UI-copy · teknik · API

**Syfte:** Bryta ned Trädgården i små, spelbara inkrement. Varje sprint ska kunna byggas, testas, visas för riktiga familjer — och godkännas kreativt innan nästa påbörjas.

**Game Director-veto:** Implementation stoppas om kreativ kvalitet inte håller efter sprint-review. Ingen "vi polerar i nästa sprint" för skuld, farm-känsla eller identitetsbrott.

---

## Sprintöversikt

| Sprint | Namn | Signaturmoment | Familjetest krävs före nästa? |
|--------|------|----------------|-------------------------------|
| **0** | Ankomst | M1 — Första foten i gräset | **Ja** |
| **1** | Planteringslådan | Ägande utan krav | Nej (intern QA räcker) |
| **2** | Första fröet | M2 | **Ja** |
| **3** | Första grodden | M3 | **Ja** |
| **4** | Första blomman | M4 | **Ja** |
| **5** | Vissna och kompost | M7 | **Ja** — blockerande |
| **6** | Skörd och delning | M5, M6 | **Ja** |
| **7** | Omgivningsliv | M9, M10 | Nej (intern + spot familj) |
| **8** | Årstidsförändring | M8, M12-tease | **Ja** |

**Justering mot exempelstruktur:** Sprint 0 (Ankomst) tillagd — unlock och första foten är en egen upplevelse enligt brief. Vissna/kompost är **egen sprint** (5) före skörd — brief failure mode #1 om vissna känns som straff. Omgivningsliv flyttat efter blomma/vissna så fjäril och fågel har kontext.

---

## Principer för varje sprint

1. **Minsta magiska kärna** — inte full funktion.  
2. **Ett Wonder Moment minimum** per sprint där det är möjligt.  
3. **Reality-first** — inget växer av skärmtid alone (från sprint 2).  
4. **Ingen skuld** — gäller alla sprintar, verifieras varje gång.  
5. **Idag leder** — trädgården följer, kommenderar inte.  
6. **Syskon parallellt** — när fler barn finns, aldrig rankat (från sprint 1).

---

# Sprint 0 — Ankomst

## Mål

Barnet **hittar** Trädgården efter Morgonhuset Root och känner: *luft, lugn, något kan finnas här* — utan uppgifter.

## Känsla som ska uppnås

**Tillhörighet i det öppna.** Som att öppna en grind till en tom men vänlig rabatt i maj. Nyfikenhet utan krav.

## Minsta spelbara upplevelse

Grinden går att passera. Gräs som rör sig. Tom planteringsyta **syns** men är inte ännu "mitt". Fågelbad skimras i fjärran. Inget popup-fyrverkeri vid unlock — upptäckt via karta eller glimt från Morgonhuset.

**Det minsta som fortfarande känns magiskt:** Vinden i gräset + känslan *"det här är ett nytt ställe som väntade på mig"*.

## Vad barnet kan göra

- Öppna grinden och gå in  
- Utforska tom yta med korta, varma responser  
- Se fågelbad och horisont i periferin  
- Lämna när hen vill — ingen exit-straff  

## Vad barnet INTE ska kunna göra ännu

- Plantera frö  
- Placera låda  
- Se grodd, blomma, fjäril, skörd  
- Interagera med Familjegårdens projektbord via trädgård  
- Syskon-jämförelse eller delad rabatt  

## Product verifierar innan sprint klar

- Unlock sker **in-world** — ingen login-popup  
- Morgonhuset Root uppnådd före tillgång  
- Första besök känns lugnt, inte tomt på fel sätt (idle-liv finns)  
- Barn förstår att det finns **ett** ställe att gå till — inte tio val  
- FM/Idag-spine opåverkad — barn kan ignorera trädgården  

## Risker (barnets perspektiv)

| Risk | Tecken |
|------|--------|
| Tomt = tråkigt | Barn lämnar inom 15 sekunder upprepade gånger |
| För hype | Känns som nytt spel, inte Stjärndag |
| Vilse | Hittar inte trädgården utan förälder |
| Stress | Känns som ännu en plats med måsten |

## Frågor till riktiga familjer

1. *"Vad tyckte du om stället med gräset?"* (öppen, inte ledande)  
2. *"Ville du gå tillbaka — eller var det nog?"*  
3. *"Kändes det stressigt eller lugnt?"*  
4. *"Hur hittade du dit?"* (discovery)  

## Review Checklist — Sprint 0

- [ ] Känns världen fortfarande lugn?  
- [ ] Finns ingen skuld?  
- [ ] Har barnet något att upptäcka?  
- [ ] Finns minst ett Wonder Moment? (vinden, första foten, fjärran fågelbad)  
- [ ] Känns detta som Stjärndag?  
- [ ] Känns det ALDRIG som Morgonhuset utomhus?  
- [ ] Tystnad/session utan handling är OK?  
- [ ] Unlock utan kasino-känsla?  

**Game Director:** ☐ Godkänd ☐ Revision ☐ **STOPP**

---

# Sprint 1 — Planteringslådan

## Mål

Barnet får **sin egen yta** — planteringslådan placeras. Ägande utan växtliv ännu.

## Känsla som ska uppnås

**"Det här är min fläck jord."** Liten stolthet, ingen brådska.

## Minsta spelbara upplevelse

Tom låda kan placeras på barnets rabatt — en gest, tillfredsställande "snap". Efter placering: tom jord som känns redo. Gräset lever runt omkring.

**Det minsta som fortfarande känns magiskt:** *Jag satte min låda på plats — trädgården är lite mer min.*

## Vad barnet kan göra

- Placera planteringslådan (ett val per besök som default)  
- Trycka på lådan/jord — kort respons  
- Utforska grind och gräs som sprint 0  
- Syskon: **egen låda på egen rabatt** (om flera barn)  

## Vad barnet INTE ska kunna göra ännu

- Så frö  
- Vattna med syfte  
- Se växtliv  
- Fjäril, fågel, kompost, skörd  
- Hemlig stig  

## Product verifierar innan sprint klar

- Placering känns bra på mobil (tumme, portrait)  
- Syskon ser parallella ytor — ingen rankning  
- Ingen kravloop: placera eller bara vara där  
- Ghost/spår av framtida frö **utan** text som säger "så nu måste du…"  

## Risker (barnets perspektiv)

| Risk | Tecken |
|------|--------|
| IKEA-manual | För många steg till placering |
| Syskonfight | "Varför fick du större låda?" |
| Antiklimax | "Bara en låda?" utan levande kant |

## Frågor till riktiga familjer

*(Valfritt denna sprint — intern QA + Game Director räcker om sprint 0 passerat.)*

1. *"Känns lådan som din?"*  
2. *"Vill du ha något i den?"* (naturlig nyfikenhet = bra)  

## Review Checklist — Sprint 1

- [ ] Känns världen fortfarande lugn?  
- [ ] Finns ingen skuld?  
- [ ] Har barnet något att upptäcka?  
- [ ] Finns minst ett Wonder Moment? (placering-snap, jord som känns redo)  
- [ ] Känns detta som Stjärndag?  
- [ ] Syskon parallellt utan tävling?  
- [ ] Ett primärt val per besök respekterat?  

**Game Director:** ☐ Godkänd ☐ Revision ☐ **STOPP**

---

# Sprint 2 — Första fröet

## Mål

**M2 — Första fröet.** Verklig handling (utomhus / hjälp / plantering på Idag) speglas i lådan. Reality-first börjar här.

## Känsla som ska uppnås

**Hopp och ansvar.** *"Något är på väg — för att jag gjorde något på riktigt."*

## Minsta spelbara upplevelse

Efter speglad verklig aktivitet: frö syns i jorden — litet, ömt. Ingen blomma. Ingen countdown. Kanske något ändrats i jorden sedan igår vid återbesök.

**Det minsta som fortfarande känns magiskt:** *Fröet är där för att jag hjälpte till / var ute / planterade — inte för att jag tryckte i appen.*

## Vad barnet kan göra

- Se frö i sin låda efter reality-trigger  
- Kort respons vid tryck på jord/frö  
- Återbesöka och se att jorden "minns"  
- Fortfarande utforska grind, gräs, låda  

## Vad barnet INTE ska kunna göra ännu

- Tvinga frö utan verklig spegling  
- Se grodd eller blomma  
- Vattenkanna som daglig quest  
- Plantera flera frö i grind  
- Skörd, vissna, kompost  

## Product verifierar innan sprint klar

- Frö **utan** verklig spegling = omöjligt (reality-first)  
- Ingen popup "plantera nu!"  
- Barn som inte har triggat ser fortfarande tom jord — utan skuld  
- Idag-spine tydlig: rutin först, trädgård sedan  

## Risker (barnets perspektiv)

| Risk | Tecken |
|------|--------|
| Otydlig koppling | "Varför finns plötsligt ett frö?" |
| FOMO | Syskon får frö, jag inte — utan förklaring i livet |
| Farm-start | "Måste jag göra aktivitet för frö varje dag?" |

## Frågor till riktiga familjer

1. *"Fattade du varför fröet kom?"*  
2. *"Kändes det som belöning eller som något naturligt?"*  
3. *"Ville du göra mer utomhus / hjälpa till efteråt?"*  
4. *"Kändes det som att du måste logga in varje dag?"*  

## Review Checklist — Sprint 2

- [ ] Känns världen fortfarande lugn?  
- [ ] Finns ingen skuld?  
- [ ] Har barnet något att upptäcka?  
- [ ] Finns minst ett Wonder Moment? (frö som överraskning efter verklighet)  
- [ ] Känns detta som Stjärndag?  
- [ ] Reality-first utan undantag?  
- [ ] Ingen farm-känsla vid frö?  

**Game Director:** ☐ Godkänd ☐ Revision ☐ **STOPP**

**⛔ Familjetest krävs innan Sprint 3.**

---

# Sprint 3 — Första grodden

## Mål

**M3 — Första grodden.** Tålamod lönar sig — grönt sticker upp efter **tid och återbesök**, inte efter grind.

## Känsla som ska uppnås

**Förundran.** *"Det växer! Jag väntade och det hände."* Långsammare än Morgonhuset — medvetet.

## Minsta spelbara upplevelse

Liten grodd syns efter naturlig pacing (flera besök / dagar — produktbeslut om exakt pacing, inte Game Director här). Ingen progress bar. Vid återbesök: grodd kanske lite större. Vinden fortgår.

**Det minsta som fortfarande känns magiskt:** *Något levande stack upp ur min jord — jag behövde inte stressa.*

## Vad barnet kan göra

- Se och hälsa på grodden  
- Återkomma och notera förändring  
- Utforska som tidigare  
- Upptäcka att något **ändrats sedan igår** (idle-liv + grodd)  

## Vad barnet INTE ska kunna göra ännu

- Påskynda grodd med upprepade taps  
- Se knopp/blomma  
- Vissna (ingen väg tillbaka)  
- Fjäril landar på grodd (för tidigt — vänta till omgivningsliv eller blomma-sprint)  
- Skörd  

## Product verifierar innan sprint klar

- Ingen countdown till grodd  
- Grodd kommer inte samma dag som frö (tålamodstest)  
- Frånvaro bestraffar inte — grodd väntar eller växer lugnt vid återkomst  
- Max en major micro-händelse per session vid grodd-reveal  

## Risker (barnets perspektiv)

| Risk | Tecken |
|------|--------|
| För långt väntan | Barn tappar intresse före grodd |
| För snabb payoff | Känns som Morgonhuset — fel takt |
| Tap-to-grow | Barn hamrar på jorden |
| "Död grodd" | Frånvaro gör att grodd försvinner |

## Frågor till riktiga familjer

1. *"Hur kändes det att vänta på grodden?"*  
2. *"Var det tråkigt eller spännande?"*  
3. *"Ville du kolla varje dag — eller räckte det ibland?"*  
4. *"Hände något om du var borta några dagar?"* (skuld-test)  

## Review Checklist — Sprint 3

- [ ] Känns världen fortfarande lugn?  
- [ ] Finns ingen skuld?  
- [ ] Har barnet något att upptäcka?  
- [ ] Finns minst ett Wonder Moment? (grodd-reveal)  
- [ ] Känns detta som Stjärndag?  
- [ ] Tålamod känns rättvis, inte arbiträrt?  
- [ ] Frånvaro = välkomnande, inte straff?  

**Game Director:** ☐ Godkänd ☐ Revision ☐ **STOPP**

**⛔ Familjetest krävs innan Sprint 4.** Detta är briefens **kärn-risk**: farm vs tålamod.

---

# Sprint 4 — Första blomman

## Mål

**M4 — Första blomman.** Emotionell payoff — stolthet efter väntan. Kort ceremoni, skippbar.

## Känsla som ska uppnås

**Stolthet.** *"Den öppnade! Min blomma."* Inte jackpot — blomsteröppning i slow motion.

## Minsta spelbara upplevelse

Grodd → knopp (kan ske mellan sprint 3–4 internt) → blomma öppnar. Ett vackert ögonblick. Barnet kan stå still och titta. Ceremoni ≤2 s, skippbar.

**Det minsta som fortfarande känns magiskt:** *Blomman öppnade sig — för mig — efter att jag väntat.*

## Vad barnet kan göra

- Uppleva blommans öppning  
- Hälsa på blomman vid återbesök  
- Visa stolthet (förberedelse för familj sprint 6 — inte full delning än)  
- Fortfarande utforska trädgården  

## Vad barnet INTE ska kunna göra ännu

- Plocka/skörda blomman (ännu)  
- Vissna  
- Fjärils-loggbok  
- Perfektion-krav ("guldblomma")  
- Familjevägg-export full  

## Product verifierar innan sprint klar

- Blomma kräver inte perfekt vecka på Idag  
- Ceremoni irriterar inte förälder (skippbar, kort)  
- Blomma känns **earned**, inte random login  
- Syskon: egna blommor på egna tider  

## Risker (barnets perspektiv)

| Risk | Tecken |
|------|--------|
| Antiklimax efter väntan | "Bara det där?" |
| För stark celebration | Känns som spel, inte trädgård |
| Syskon-sorg | Syskon blommar först — rankning |
| Perfektionism | Barn orolig för att "förstöra" blomman |

## Frågor till riktiga familjer

1. *"Hur kändes det när blomman öppnades?"*  
2. *"Berättade du för någon hemma?"*  
3. *"Var det värt att vänta?"*  
4. *"Kändes firandet lagom eller för mycket?"*  

## Review Checklist — Sprint 4

- [ ] Känns världen fortfarande lugn?  
- [ ] Finns ingen skuld?  
- [ ] Har barnet något att upptäcka?  
- [ ] Finns minst ett Wonder Moment? (blommans öppning)  
- [ ] Känns detta som Stjärndag?  
- [ ] Stolthet > excitement?  
- [ ] Syskon parallellt?  

**Game Director:** ☐ Godkänd ☐ Revision ☐ **STOPP**

**⛔ Familjetest krävs innan Sprint 5.**

---

# Sprint 5 — Vissna och kompost

## Mål

**M7 — Första vissna blomman.** Naturlig cykel — **inte fail-state.** Komposthörna introduceras som mottagare, inte som straff.

## Känsla som ska uppnås

**Acceptans och förståelse.** *"Den vissnade — men det är okej. Något nytt kan komma."* Höstkänsla, inte sorg som skuld.

## Minsta spelbara upplevelse

Blomman mjuknar visuellt över tid. Löv/kronblad mot kompost — mjukt, utan text som säger "du misslyckades". Komposthörna syns som ny plats att utforska.

**Det minsta som fortfarande känns magiskt:** *Trädgården ljuger inte — saker slutar också — och världen är fortfarande snäll.*

## Vad barnet kan göra

- Se vissna-processen  
- Besöka komposthörna  
- Förstå att jorden fortfarande är "sin"  
- Återbesöka utan att blomman "straffar"  

## Vad barnet INTE ska kunna göra ännu

- Tvingas "fixa" vissna med taps  
- Få skuldbudskap eller NPC-moral  
- Kompost-minigame med poäng  
- Permanent tom rabatt utan hopp  
- Skörd (kommer sprint 6)  

## Product verifierar innan sprint klar

- **Support-risk noll:** inga "min blomma dog"-rapporter  
- Barn stannar i appen veckan efter vissna (retention kvalitativ)  
- Kompost utan predikan  
- Vissna sker inte dag 1 efter blomma — barn hinner älska blomman först  

## Risker (barnets perspektiv)

| Risk | Tecken |
|------|--------|
| **KRITISK: Skuld** | Barn gråter, slutar besöka, förälder klagar |
| Tamagotchi-död | "Du glömde vattna" |
| Meningslöshet | "Varför brydde jag mig?" |
| För snabb vissna | Ingen tid att vara stolt |

## Frågor till riktiga familjer

1. *"Vad hände med blomman?"* (öppen)  
2. *"Kändes det tråkigt eller okej?"*  
3. *"Vill du fortfarande gå till trädgården?"*  
4. *"Fattade du vad komposten var?"*  
5. *"Kände du att du gjort fel?"* ← **nyckelfråga**

## Review Checklist — Sprint 5

- [ ] Känns världen fortfarande lugn?  
- [ ] Finns ingen skuld? ← **veto om Nej**  
- [ ] Har barnet något att upptäcka?  
- [ ] Finns minst ett Wonder Moment? (mjuk cykel, inte fest)  
- [ ] Känns detta som Stjärndag?  
- [ ] Vissna = höst, inte game over?  
- [ ] Kompost utan moral?  

**Game Director:** ☐ Godkänd ☐ Revision ☐ **STOPP**

**⛔ BLOCKERANDE familjetest.** Ingen Sprint 6 utan explicit godkännande på skuld-frågan. Game Director kan stoppa hela Trädgården här.

---

# Sprint 6 — Skörd och delning

## Mål

**M5 + M6 — Skörd och visa för någon.** Metaforisk eller speglad verklig skörd. Valbar koppling till Familjegårdens stolthet.

## Känsla som ska uppnås

**Generositet och delad stolthet.** *"Jag har något att visa — hemma eller i familjen."*

## Minsta spelbara upplevelse

Efter verklig skörd/bär/plocka ELLER metaforisk mogen frukt/blomma: ett plock-ögonblick — kort, skönt. Valfri möjlighet att sätta något på familjeprojektbord/vägg (barn-initierat, inte förälder-admin).

**Det minsta som fortfarande känns magiskt:** *Jag plockade något och någon annan kan se att jag är stolt.*

## Vad barnet kan göra

- Uppleva skörd-moment  
- Dela till familjeyta (om famijsystem finns)  
- Prata om det hemma (produkt hoppas, inte tvingar)  
- Återbesöka trädgården med ny frö-cykel på horisont  

## Vad barnet INTE ska kunna göra ännu

- Sälja skörd för stjärnor  
- Syskon-tävling "mest plockat"  
- Skörd utan reality-koppling eller etablerad cykel  
- Full årstidsomvandling  

## Product verifierar innan sprint klar

- Skörd känns som **delning**, inte loot  
- Familj-koppling utan admin-formulär för barn (C-01)  
- Ny cykel kan börja — världen inte färdig  
- Reality-first om verklig skörd finns i familjen  

## Risker (barnets perspektiv)

| Risk | Tecken |
|------|--------|
| Loot-känsla | "Jag fick grejer" inte "jag delade" |
| Familj som prestation | Förälder pressar att visa upp |
| Syskon-jämförelse | Större skörd = vinnare |

## Frågor till riktiga familjer

1. *"Visade du något för mamma/pappa/syskon?"*  
2. *"Kändes det som en riktig skörd eller ett spel?"*  
3. *"Vill du plantera igen?"*  
4. *"Blev det något samtal hemma om trädgården?"*  

## Review Checklist — Sprint 6

- [ ] Känns världen fortfarande lugn?  
- [ ] Finns ingen skuld?  
- [ ] Har barnet något att upptäcka?  
- [ ] Finns minst ett Wonder Moment? (skörd + delning)  
- [ ] Känns detta som Stjärndag?  
- [ ] Delning utan rankning?  
- [ ] Reality bridge hemma?  

**Game Director:** ☐ Godkänd ☐ Revision ☐ **STOPP**

**⛔ Familjetest krävs innan Sprint 7–8 skalas brett.**

---

# Sprint 7 — Omgivningsliv

## Mål

**M9 + M10 — Fjärilar och fågelbad.** Trädgården andas utan barnets kommando. Vattenkanna som **spegel**, inte quest.

## Känsla som ska uppnås

**Flyktig glädje och överraskning.** *"Något hände som jag inte beställde."*

## Minsta spelbara upplevelse

Fjäril passerar (sällan). Droppe i fågelbad. Sällsynt fågel efter utomhus-dagar. Vattenkanna reagerar om barn vattnat på riktigt. Gräset, molnet, vind — tätare idle.

**Det minsta som fortfarande känns magiskt:** *Jag stod still och en fjäril kom — eller en fågel drack.*

## Vad barnet kan göra

- Bevittna fjäril/fågel  
- Se vattenkanna spegla verklig vattning  
- Vänta vid fågelbad (valfritt)  
- Allt tidigare i trädgården  

## Vad barnet INTE ska kunna göra ännu

- Fånga fjäril  
- Mata fågel dagligen  
- Vattenkanna-streak  
- Fjärils-loggbok 3/10  
- Full årstid  

## Product verifierar innan sprint klar

- Fågel/fjäril är **sällsynt** — inte varje session  
- Vattenkanna utan daglig skuld  
- Max en major micro-händelse per session  
- Ljud av default av — tystnad OK  

## Risker (barnets perspektiv)

| Risk | Tecken |
|------|--------|
| Completionism | "Jag måste samla alla fjärilar" |
| Fågel-Tamagotchi | "Fågeln är hungrig" |
| Överstimulering | För mycket rörelse — tappar lugn |

## Frågor till riktiga familjer

*(Spot-check — 2–3 familjer räcker om sprint 5 passerat.)*

1. *"Såg du fjäril eller fågel?"*  
2. *"Kändes det speciellt eller stressigt?"*  
3. *"Ville du vänta på mer?"*  

## Review Checklist — Sprint 7

- [ ] Känns världen fortfarande lugn?  
- [ ] Finns ingen skuld?  
- [ ] Har barnet något att upptäcka?  
- [ ] Finns minst ett Wonder Moment? (fjäril/fågel)  
- [ ] Känns detta som Stjärndag?  
- [ ] Sällsynt > spam?  
- [ ] Ingen samling med siffror?  

**Game Director:** ☐ Godkänd ☐ Revision ☐ **STOPP**

---

# Sprint 8 — Årstidsförändring

## Mål

**M8 + M12-tease — Första årstidsskiftet och horisont.** Världen förnyas; fruktbuske/stig skimras — inte färdig.

## Känsla som ska uppnås

**Förnyelse och horisont.** *"Trädgården är annorlunda nu — och det finns mer bortåt."*

## Minsta spelbara upplevelse

Max 2 props swap (t.ex. höstlöv vid kompost, is i fågelbad ELLER vårknopp). Lådan vilar utan död. Avlägsen stig/fruktbuske syns. Ingen "100 % complete".

**Det minsta som fortfarande känns magiskt:** *Jag kom tillbaka och trädgården hade bytt säsong — den lever vidare.*

## Vad barnet kan göra

- Upptäcka säsongsbyte  
- Se horisont — stig/buske  
- Fortsätta hela cykeln (nytt frö på sikt)  
- Tyst besök i vinterläge  

## Vad barnet INTE ska kunna göra ännu

- Nå horisontgrind fullt  
- Tvingas spela säsongsevent  
- Förlora rabatt permanent vinter  
- Slutskärm "klart"  

## Product verifierar innan sprint klar

- Säsong kopplad verklig kalender — inte battle pass  
- Vinter = vila, inte straff  
- Append-only horisont dokumenterad för WDB  
- Constitution: världen känns inte färdig  

## Risker (barnets perspektiv)

| Risk | Tecken |
|------|--------|
| Vinter = straff | "Allt är dött" |
| FOMO-säsong | "Hinner inte eventet" |
| Färdig-känsla | "Nu är trädgården klar" |

## Frågor till riktiga familjer

1. *"Märkte du att det blev höst/vinter/vår?"*  
2. *"Kändes trädgården tråkig eller ny?"*  
3. *"Såg du något längre bort som du vill gå till?"*  
4. *"Vill du hålla på med trädgården nästa år också?"*  

## Review Checklist — Sprint 8

- [ ] Känns världen fortfarande lugn?  
- [ ] Finns ingen skuld?  
- [ ] Har barnet något att upptäcka?  
- [ ] Finns minst ett Wonder Moment? (säsong eller horisont)  
- [ ] Känns detta som Stjärndag?  
- [ ] Ingen "färdig"-skärm?  
- [ ] Vinter/vila utan död?  

**Game Director:** ☐ Godkänd ☐ Revision ☐ **STOPP**

**⛔ Familjetest krävs innan Trädgården markeras Live för alla familjer.**

---

## Familjetest — obligatoriska grindar

| Efter sprint | Varför blockerande |
|--------------|-------------------|
| **0 — Ankomst** | Discovery och första intryck sätter hela världen. Fel = farm eller tomhet. |
| **2 — Fröet** | Reality-first måste kännas äkta, inte belöningshack. |
| **3 — Grodden** | Tålamod är Trädgårdens identitet. Farm här = produktfail. |
| **4 — Blomman** | Payoff måste vara värd väntan. |
| **5 — Vissna** | **Största churn-risken i hela världen.** Stoppar pipeline vid skuld. |
| **6 — Skörd** | Delning hemma = briefens hemma-berättelse. |
| **8 — Årstid** | Lång horisont — färdig-känsla dödar Living World-löftet. |

**Sprint 1 och 7:** Intern QA + Game Director räcker om tidigare grindar passerat. Spot-familj rekommenderas.

---

## Game Director veto — när implementation stoppas

| Signal | Åtgärd |
|--------|--------|
| Barn uttrycker skuld kring vissna/vattning | **STOPP** — redesign sprint 5/7 |
| Förälder: "ännu en sak att sköta" | **STOPP** — granska hela kadensen |
| Syskon-jämförelse observerad | **STOPP** — parallell modell |
| Barn hoppar över Idag för trädgård | **STOPP** — layer stack-brut |
| Session <20 s upprepat efter sprint 0 | **STOPP** — idle/wonder otillräckligt |
| Celebration irriterar förälder | Revidera ceremoni sprint 4 |
| "Känns som Farmville" i familjetest | **STOPP** — hela världen paus |

**Eskalering:** CPO informeras. Ingen nästa sprint förrän veto lösts och ny review checklist grön.

---

## Korsnitt — Review Checklist (alla sprintar)

Varje sprint avslutas med denna lista. **Alla måste vara Ja** för Game Director-godkännande.

| # | Kriterium |
|---|-----------|
| 1 | Känns världen fortfarande lugn? |
| 2 | Finns ingen skuld? |
| 3 | Har barnet något att upptäcka? |
| 4 | Finns minst ett Wonder Moment? |
| 5 | Känns detta som Stjärndag? |
| 6 | Känns det ALDRIG som farm/checklista? |
| 7 | Idag leder, trädgården följer? |
| 8 | Reality-first respekterat (sprint 2+)? |
| 9 | Syskon parallellt utan rankning (vid flera barn)? |
| 10 | Tystnad/session utan placement är giltig? |

---

## Handoff till Engineering (per sprint)

Game Director levererar **inte** kod. Per godkänd sprint:

1. Sprintnummer + godkännandedatum  
2. Ifylld Review Checklist (alla Ja)  
3. Familjetest-sammanfattning (om krävs)  
4. Referens till WORLD BRIEF-moment (M1–M12)  
5. Explicit lista: **INTE i denna sprint** (scope fence)  
6. Veto = nej till merge/release för nästa sprint-scope

WDB progression nodes mappas av Game Director + CPO **efter** sprint-godkännande — inte före.

---

## Appendix — Moment ↔ Sprint

| Moment | Sprint |
|--------|--------|
| M1 Första foten | 0 |
| M2 Första fröet | 2 |
| M3 Första grodden | 3 |
| M4 Första blomman | 4 |
| M5 Skörd | 6 |
| M6 Visa blomman | 6 |
| M7 Vissna | 5 |
| M8 Årstid | 8 |
| M9 Fjäril | 7 |
| M10 Fågel i bad | 7 |
| M11 Hemlig stig | 8 (tease) eller append-later |
| M12 Horisontgrind | 8 |

---

*Trädgården Game Director Sprint Plan v1.0 — Living World implementation governance.*
