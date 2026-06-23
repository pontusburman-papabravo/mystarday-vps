# SEO & landningssidor (Linear/Jira) <!-- pragma: allowlist secret -->

Status efter PR #293. Tickets markerade **DONE** är levererade i `cursor/seo-landing-plan-7e37`.

---

## Sprint 1 — Teknisk hygien (P0)

### SEO-01 — Ta bort dold SEO-text på `/` **DONE**
| | |
|--|--|
| **Owner** | Dev |
| **Prioritet** | P0 |
| **Beskrivning** | Ta bort `font-size:0` / `color:transparent` keyword-block i `public/index.html` målgruppssektionen. |
| **DoD** | Ingen dold keyword-text i HTML på publika sidor. |

### SEO-02 — Canonical på `/` **DONE**
| | |
|--|--|
| **Owner** | Dev |
| **Prioritet** | P0 |
| **Kod** | `<link rel="canonical" href="/">` i `public/index.html` |
| **DoD** | Startsidan har canonical. |

### SEO-03 — `noindex` på `/login` **DONE**
| | |
|--|--|
| **Owner** | Dev |
| **Prioritet** | P0 |
| **Kod** | `src/lib/seo-pages.js` + `src/middleware/platform-html.js` |
| **DoD** | `/login` returnerar `noindex`; finns inte i sitemap. |

### SEO-04 — `noindex` på auth-routes **DONE**
| | |
|--|--|
| **Owner** | Dev |
| **Prioritet** | P0 |
| **Kod** | Allowlist i `SEO_INDEXABLE_PATHS`; allt annat HTML får `noindex` injicerat. |
| **DoD** | `/dashboard`, `/schedule` m.fl. har `noindex`; inga auth-sidor i sitemap. |

### SEO-05 — Uppdatera `sitemap.xml` **DONE**
| | |
|--|--|
| **Owner** | Dev |
| **Prioritet** | P0 |
| **DoD** | `/pricing-info` tillagd; `/login`, `/child-login` borta; `lastmod` uppdaterad. |

---

## Sprint 2 — Metadata & message match (P1)

### SEO-06 — `/register` metadata + hero **DONE**
| | |
|--|--|
| **Owner** | Dev + Content |
| **Prioritet** | P1 |
| **Title** | `Skapa konto \| Min Stjärndag` | <!-- pragma: allowlist secret -->
| **Meta** | `Skapa ett föräldrakonto på Min Stjärndag och kom igång gratis med visuellt bildstöd…` | <!-- pragma: allowlist secret -->
| **DoD** | Egen title, meta, OG; H1 + stödtext ovanför formulär. |

### SEO-07 — Hero/ingress på `/` **DONE**
| | |
|--|--|
| **Owner** | Content + Dev |
| **Prioritet** | P1 |
| **Ingress** | *Ett visuellt schema och digitalt bildstöd som hjälper barn att förstå dagen…* |
| **DoD** | Produkten förklaras synligt i hero, inte bara i title. |

### SEO-08 — `/register` som indexerbar funnel **DONE**
| | |
|--|--|
| **Owner** | Growth + Dev |
| **Prioritet** | P1 |
| **Beslut** | Indexerbar, i sitemap, men inte primär SEO-sida. |
| **DoD** | Sitemap + metadata följer beslutet. |

---

## Sprint 3 — Sida för sida (P1/P2)

### SEO-09 — `/pedagoger-och-terapeuter` metadata **DONE**
| | |
|--|--|
| **Owner** | Content + Dev |
| **Prioritet** | P1 |
| **Title** | `Digitalt bildstöd för pedagoger, terapeuter och familjer \| Min Stjärndag` | <!-- pragma: allowlist secret -->
| **DoD** | Uppdaterad title, meta, H1, ingress. |

### SEO-10 — `/pricing-info` som tillgångssida **DONE**
| | |
|--|--|
| **Owner** | Dev + Content |
| **Prioritet** | P1 |
| **DoD** | Publik route (ingen billing-gate); copy om gratis läge + framtida Apple/Google IAP. |

### SEO-11 — `/skattkammaren` innehållssida **DONE**
| | |
|--|--|
| **Owner** | Content + Dev |
| **Prioritet** | P2 |
| **DoD** | Sektioner: vad det är, hur det fungerar, när det hjälper, koppling till schema. |

### SEO-12 — Internlänkar mellan publika sidor **DONE**
| | |
|--|--|
| **Owner** | Dev |
| **Prioritet** | P2 |
| **DoD** | `/` → register, pedagoger, skattkammaren, pricing-info; korslänkar på undersidor. |

### SEO-13 — Problem/lösnings-copy på `/` **DONE**
| | |
|--|--|
| **Owner** | Content |
| **Prioritet** | P2 |
| **DoD** | Problemsektion nämner morgon/läggning/övergångar; lösningskort kopplade till vardagsnytta. |

---

## Backlog — efter deploy

### SEO-14 — Search Console-uppföljning
| | |
|--|--|
| **Owner** | Growth |
| **Prioritet** | P2 |
| **Beskrivning** | Efter 2–4 veckor: granska queries, CTR, impressions för `/`, `/register`, `/skattkammaren`. Finjustera title/meta utifrån data. |
| **DoD** | Dokumenterad lista med 3–5 copy-justeringar baserade på faktisk sökdata. |

### SEO-15 — `/en` indexeringsbeslut
| | |
|--|--|
| **Owner** | Growth + Dev |
| **Prioritet** | P3 |
| **Beskrivning** | Om `engelsk_landingssida` feature flag är OFF: överväg ta bort `/en` ur sitemap (redirectar till `/`). Om ON och sidan är komplett: behåll hreflang + sitemap. |
| **DoD** | Sitemap och hreflang matchar faktisk live-status för `/en`. |

---

## Verifiering efter deploy

```bash
# noindex på login
curl -s "$APP_URL/login" | grep -i 'noindex'

# pricing-info publik
curl -sI "$APP_URL/pricing-info" | head -5

# sitemap
curl -s "$APP_URL/sitemap.xml"
```

Google Search Console: skicka in uppdaterad sitemap.
