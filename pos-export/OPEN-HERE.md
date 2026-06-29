# POS — så öppnar du dokumenten

Filerna ligger **bara i Cloud Agent-miljön** tills de pushas till GitHub.

## Om mega-filen inte öppnas

Prova i denna ordning:

### 1. Mindre delar (rekommenderat)

Öppna via **Cmd+P** / **Ctrl+P** och skriv:

- `POS-PART-1` → README + 00–03 (~35 KB)
- `POS-PART-2` → 04–06 (~31 KB)
- `POS-PART-3` → 07–11 (~28 KB)
- `POS-PART-4` → 12–14 (~25 KB)

### 2. Ett dokument i taget

Mappen `pos-export/individual/` — varje fil är 5–10 KB:

- `00_PROJECT_CONSTITUTION.md` — börja här
- `README.md` — översikt

### 3. File Explorer

I sidopanelen: **pos-export/** → dubbelklicka en fil.

---

## Om inget händer alls

Du kanske sitter **lokalt på Mac** medan filerna bara finns i **Cloud Agent**.

**Lösning:** Be agenten **committa och pusha** branchen `cursor/product-operating-system-5889`, kör sedan lokalt:

```bash
git fetch origin
git checkout cursor/product-operating-system-5889
open pos-export/individual/00_PROJECT_CONSTITUTION.md
```

---

## Innehåll

16 dokument: README + 00–14 (Product Operating System v1.0)
