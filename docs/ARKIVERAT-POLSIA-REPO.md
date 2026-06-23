# Arkiverat: MyStarday-Polsia / Polsia-deploy

**Status (juni 2026):** Polsia-hosting och det gamla personliga Polsia-repot är **avvecklat**.

| Tidigare | Nu |
|----------|-----|
| `pontusburman-papabravo/MyStarday-Polsia` | Omdöpt till [`mystarday-vps`](https://github.com/pontusburman-papabravo/mystarday-vps) (samma repo, GitHub redirect) |
| Deploy via Polsia / Render / `stjarndag.polsia.app` | Produktion på **egen VPS** → https://mystarday.se |
| Polsia e-post-, R2- och Stripe-proxy | Resend, R2 (eller lokal disk) på VPS; Stripe **borttaget** (se [`ARKIVERAT-STRIPE.md`](ARKIVERAT-STRIPE.md)) |

## Kanonisk källa

All utveckling och deploy sker från:

**https://github.com/pontusburman-papabravo/mystarday-vps** (`main`)

```bash
git remote set-url origin https://github.com/pontusburman-papabravo/mystarday-vps.git
git pull origin main
```

Deploy på VPS: se [`VPS-ANDROID-ENV.md`](VPS-ANDROID-ENV.md).

## Historiska Polsia-dokument

All Polsia-relaterad dokumentation ligger under **`docs/archive/polsia/`** (inkl. `release-os/`). Det är **arkiverad referens** från Polsia-eran — använd inte för ny deploy eller handoff.

## Git-remote

Om du fortfarande har en remote som heter `polsia` eller pekar på `MyStarday-Polsia`, är det samma repo som `origin` → `mystarday-vps`. Ta bort dubbel-remote om du vill:

```bash
git remote remove polsia   # valfritt
```
