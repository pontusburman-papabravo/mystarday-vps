# Arkiverat: MyStarday-Polsia / Polsia-deploy

**Status (juni 2026):** Polsia-hosting och det gamla personliga Polsia-repot är **avvecklat**.

| Tidigare | Nu |
|----------|-----|
| `pontusburman-papabravo/MyStarday-Polsia` | Omdöpt till [`mystarday-vps`](https://github.com/pontusburman-papabravo/mystarday-vps) (samma repo, GitHub redirect) |
| Deploy via Polsia / Render / `stjarndag.polsia.app` | Produktion på **egen VPS** → https://mystarday.se |
| Polsia e-post-, R2- och Stripe-proxy | Resend, R2 (eller lokal disk) och Stripe direkt på servern |

## Kanonisk källa

All utveckling och deploy sker från:

**https://github.com/pontusburman-papabravo/mystarday-vps** (`main`)

```bash
git remote set-url origin https://github.com/pontusburman-papabravo/mystarday-vps.git
git pull origin main
```

Deploy på VPS: se [`VPS-ANDROID-ENV.md`](VPS-ANDROID-ENV.md).

## Historiska Polsia-dokument

Filer under `docs/polsia-*` och `docs/polsia-release-os/` är **arkiverad referens** från Polsia-eran. Använd dem inte för ny deploy eller handoff — de finns kvar för historik och diff.

## Git-remote

Om du fortfarande har en remote som heter `polsia` eller pekar på `MyStarday-Polsia`, är det samma repo som `origin` → `mystarday-vps`. Ta bort dubbel-remote om du vill:

```bash
git remote remove polsia   # valfritt
```
