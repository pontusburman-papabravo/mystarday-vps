# Legal Decisions & Risk Acceptance — P-IE-LAUNCH Track 1

**Project:** P-IE-LAUNCH Track 1  
**Controller:** Papa Bravo AB (Sweden)  
**Status:** Internal compliance sign-off — **not externally legally verified**  
**Purpose:** Document our interpretation, product decisions, and accepted residual risk for Ireland launch prep.

---

## How to read this document

Each decision includes:

| Field | Meaning |
|-------|---------|
| **Official source** | Statute, regulator guidance, or authoritative reference |
| **Our interpretation** | What we believe applies to My Starday today |
| **Product decision** | Concrete action we take (or have taken) |
| **Residual risk** | LOW / MEDIUM / HIGH after mitigations |
| **Launch blocker** | YES = must close before `resolveLegalRoutes()` → `live` or `market_ie_open ON` |
| **Revisit trigger** | What would force us to reopen the decision |

We do **not** claim “legally approved” or “fully compliant”. This is **internal risk acceptance** based on code facts, official guidance, and documented mitigations.

---

## Internal sign-off rule

Track 1 is **launch-ready** when all of the following are true:

1. **No HIGH residual risks remain open** (MEDIUM accepted with documented mitigation).
2. **Public statements match verified implementation** (no known policy/code drift).
3. **Processor/hosting/transfer facts verified** and filed in registers (LDRA-A3, A4).
4. **Child-data lawful bases explicitly documented** per activity (LDRA-A1, lawful-basis-register).
5. **Irish consumer/subscription disclosures match actual IAP flow** (LDRA-A6, commercial track).

`resolveLegalRoutes()` may move from `placeholder` → `live` after **internal sign-off** (separate PR).  
`market_ie_open` remains OFF until store + RC + launch control complete — independent of legal docs.

---

## Priority decisions (former Priority A)

### LDRA-A1 — Child processing / Article 8

| | |
|--|--|
| **Official source** | GDPR Art. 8; DPC guidance on children and parental consent ([dataprotection.ie](https://www.dataprotection.ie/en/dpc-guidance/children-parents-and-data-protection-can-i-make-complaint-behalf-my-child)) |
| **Our interpretation** | Ireland’s digital age of consent is **16** where we rely on **consent** as lawful basis for an information-society service offered **directly to the child**. My Starday does **not** offer independent child registration. The **parent** is the contractual counterparty; children access a PIN-gated child view created by the parent. Core routine processing (schedules, stars, completions) is **contract performance** on the parent account, not child consent. Optional web analytics/marketing use **parent consent** (cookie banner / Settings), not child consent. Article 8 is therefore **narrow** in our model — it matters if we later rely on consent for ISS offered directly to children. |
| **Product decision** | Document per-activity lawful bases in [`lawful-basis-register.md`](./internal/lawful-basis-register.md). Do **not** default to “consent” for all child processing. No child email collection. Child privacy notice at `/en/eea/child-privacy`. Parent registers and accepts Terms. |
| **Residual risk** | **MEDIUM** (interpretive edge cases if regulators view child view as direct ISS) |
| **Launch blocker** | **NO** (with documented bases) |
| **Revisit trigger** | Child self-registration; marketing targeted at children; ISS features requiring child consent; material change to parent/child account model |

---

### LDRA-A2 — Special-category / wellbeing data (Article 9)

| | |
|--|--|
| **Official source** | GDPR Art. 9; EDPB guidance on health data |
| **Our interpretation** | Optional `pedagog_notes` / `child_observation` fields (mood, sleep, behaviour, free text) are **parent/pedagog-entered**, not child forms. They may be **health-adjacent** but are routine/wellbeing notes in a family app context, not medical records or diagnosis. Strict Art. 9 classification is **interpretive**. We treat them as **sensitive**, minimise fields, and do not use for advertising or profiling. |
| **Product decision** | Keep optional; disclose in EEA privacy notice; lawful basis **contract** (parent-initiated feature) + transparency. No automated inference or third-party sharing. Monitor for user-entered clinical content in free text. |
| **Residual risk** | **MEDIUM** |
| **Launch blocker** | **NO** (accepted with disclosure + minimisation) |
| **Revisit trigger** | Diagnosis/ICD fields; sharing with health providers as processor; AI analysis of wellbeing data; school bulk deployment with health reporting |

---

### LDRA-A3 — Processor contracts & hosting regions

| | |
|--|--|
| **Official source** | GDPR Art. 28; processor accountability |
| **Our interpretation** | We must know **actual** processing locations and have Article 28 arrangements (DPA or equivalent terms) with each processor. Public docs must not overstate EU hosting until verified. |
| **Product decision** | Before launch: verify and file in [`processor-register.md`](./internal/processor-register.md): Neon prod region, VPS location (deploy host), Resend, Cloudflare R2 (if enabled), RevenueCat, Google, Meta, Apple. Update public privacy processor section with verified facts only. |
| **Residual risk** | **MEDIUM** until verification complete |
| **Launch blocker** | **YES** (operational verification — not external counsel) |
| **Revisit trigger** | New processor; region migration; Neon/VPS provider change |

---

### LDRA-A4 — International transfers

| | |
|--|--|
| **Official source** | GDPR Chapter V; Schrems II; EU-US Data Privacy Framework; SCCs |
| **Our interpretation** | US-based processors (Resend, RevenueCat, optional GA4/Meta/Google Ads, Apple/Google global infra) require a documented transfer mechanism. Consent-gated marketing/analytics are **optional** and off by default. Transactional processors are necessary for service delivery. |
| **Product decision** | Document mechanism per processor in [`transfer-register.md`](./internal/transfer-register.md) (DPF participant, SCCs in DPA, or adequacy). No marketing transfers without consent. TIA summary for high-volume US analytics if enabled. |
| **Residual risk** | **MEDIUM** until mechanisms filed |
| **Launch blocker** | **YES** (internal documentation task) |
| **Revisit trigger** | New third-country processor; DPF invalidation; processor drops SCCs; enabling new US analytics without transfer record |

---

### LDRA-A5 — Public Privacy / Terms / Child Privacy / Tracking

| | |
|--|--|
| **Official source** | GDPR Arts. 12–14 (transparency); consumer fairness |
| **Our interpretation** | Public EEA documents must reflect **verified code behaviour**, use honest uncertainty where facts are pending (hosting regions), and **not** claim external legal approval. |
| **Product decision** | Publish `/en/eea/*` and `/en/tracking-choices` with version 0.1 + internal sign-off notice. Flip `resolveLegalRoutes()` to `live` only after this checklist passes. Swedish `/privacy` aligned for cookies and softened hosting claim. |
| **Residual risk** | **LOW** (with honest disclaimers) |
| **Launch blocker** | **NO** once checklist complete |
| **Revisit trigger** | Material product change; regulatory inquiry; user complaint pattern on transparency |

---

### LDRA-A6 — Irish consumer / subscription (IAP)

| | |
|--|--|
| **Official source** | CCPC guidance on digital content and services ([ccpc.ie](https://www.ccpc.ie/consumer-advice/consumer-rights/buying-services/buying-digital-content-and-services)); EU Consumer Rights Directive / Irish transposition; Apple/Google platform terms |
| **Our interpretation** | Native subscriptions are sold via **Apple App Store / Google Play** (merchant of record). We must disclose: service description, **total price**, auto-renewal, how to cancel in store settings, and that digital content/service rules may limit withdrawal once use begins. Auto-renewal is permitted if cost and cancellation are clear. |
| **Product decision** | EEA Terms §7 describes IAP/RevenueCat, EUR pricing, store-managed renewal/cancellation/refunds. Paywall strings must match (commercial track). No web card checkout. |
| **Residual risk** | **LOW** |
| **Launch blocker** | **NO** (commercial track confirms paywall copy) |
| **Revisit trigger** | Web billing; subscription model change; free-trial copy change; regulatory enforcement action |

---

## Confirmations (former short confirmations)

### LDRA-C-A — Main establishment / lead supervisory authority

| | |
|--|--|
| **Official source** | GDPR Art. 56; EDPB Guidelines 8/2022 on lead supervisory authority |
| **Our interpretation** | Papa Bravo AB is **established in Sweden** (EU). Main establishment and central administration for processing decisions are in Sweden → **IMY** is expected **lead SA** for cross-border processing. **DPC** is a **concerned SA** for Irish-resident users (complaint rights). |
| **Product decision** | EEA privacy Ireland section states this model. IMY cited for Swedish users; DPC for Irish complaints. |
| **Residual risk** | **LOW** |
| **Launch blocker** | **NO** |
| **Revisit trigger** | Irish subsidiary; move decision-making outside Sweden |

---

### LDRA-C-B — Article 27 EU representative

| | |
|--|--|
| **Official source** | GDPR Art. 27 |
| **Our interpretation** | Art. 27 applies to controllers/processors **not established in the Union**. Papa Bravo AB is EU-established → representative **not required**. |
| **Product decision** | No Art. 27 representative appointed. Document N/A in overlay. |
| **Residual risk** | **LOW** |
| **Launch blocker** | **NO** |
| **Revisit trigger** | Controller relocates outside EU/EEA |

---

## Secondary decisions (former Priority B — accepted or deferred)

| ID | Topic | Residual risk | Launch blocker | Notes |
|----|-------|---------------|----------------|-------|
| LDRA-B1 | Product analytics LI (`analytics_events`) | MEDIUM | NO | Document lightweight LIA: family UUID pseudonymisation, whitelist, delete on erasure, no marketing use |
| LDRA-B2 | Win-back emails | MEDIUM | NO | Treat as **service/re-engagement** with opt-out; child first name only when parent had account — monitor marketing classification |
| LDRA-B3 | Retention exceptions (`contact_message`, `admin_audit_log`) | LOW | NO | Disclosed in privacy notice; retain for security/support — statutory period TBD internally (7y common benchmark for audit — not legal advice) |
| LDRA-B4 | Professional share links | LOW | NO | Parent-initiated disclosure; recipient is independent once link shared — disclosed in privacy |
| LDRA-B5 | DPO appointment | LOW | NO | No mandatory DPO at current scale; founder handles privacy requests; revisit if processing scale increases |
| LDRA-B6 | Breach notification playbooks | MEDIUM | NO | 72h Art. 33 to lead SA; notify DPC when Irish users affected; templates in runbook — drill before launch |

---

## Operational items (former Priority C)

Tracked in runbooks; not launch blockers unless they become HIGH:

| ID | Topic | Owner |
|----|-------|-------|
| LDRA-C1 | DSAR identity verification | DSAR runbook |
| LDRA-C2 | DSAR internal log format | DSAR runbook |
| LDRA-C3 | Marketing copy (NPF/routines targeting) | Marketing assessment |
| LDRA-C4 | Child dashboard script audit (no ad pixels) | Verify before RC |
| LDRA-C5 | RevenueCat post-delete cleanup | Account deletion runbook |
| LDRA-C6 | Gamification / vulnerable children | POS + child assessment §6 |

---

## Decision log

| ID | Status | Accepted by | Date | Notes |
|----|--------|-------------|------|-------|
| A1 | Accepted | Internal | 2026-08-20 | Lawful basis register updated |
| A2 | Accepted | Internal | 2026-08-20 | MEDIUM risk retained |
| A3 | **Open** | — | — | Blocker until regions + DPAs filed |
| A4 | **Open** | — | — | Blocker until transfer mechanisms filed |
| A5 | Accepted | Internal | 2026-08-20 | Pending A3/A4 facts in public docs |
| A6 | Accepted | Internal | 2026-08-20 | Commercial track confirms paywall |
| C-A | Accepted | Internal | 2026-08-20 | |
| C-B | Accepted | Internal | 2026-08-20 | |

---

## When to buy external counsel

Not required for Ireland launch by default. Engage point counsel only if:

- A **HIGH** risk item opens with no reasonable internal answer
- Regulator inquiry or formal complaint
- Material processing change (health data platform, schools at scale, web payments)
- Transfer law shifts (Schrems III, DPF invalidation) without clear vendor path

---

## Related documents

- [`TRACK-1-SELF-SIGNOFF-REPORT.md`](./TRACK-1-SELF-SIGNOFF-REPORT.md) — current sign-off status
- [`implementation-baseline.md`](./implementation-baseline.md) — code facts
- [`internal/lawful-basis-register.md`](./internal/lawful-basis-register.md) — per-activity bases
