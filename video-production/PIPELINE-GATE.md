# Pipeline gate — Tomorrow Starts Here (film 1)

Validate the **full video pipeline** before generating films 2 and 3.

## Stop conditions (any = do not proceed)

- Family looks like different people between scenes
- Child's age varies noticeably
- Home style shifts between evening and morning
- Phone in app-glimpse looks wrong or draws focus
- Clips feel AI-generated rather than cinematic
- Emotional feeling is lost in editing/transitions

Better to discover at ~$2–3 on one film than on three.

## Parent test (5–10 småbarnsföräldrar, no intro)

1. Vad handlade filmen om?
2. Hur fick den dig att känna?
3. Vad tror du att produkten gör?

**Pass:** "en familj som fick lugnare morgnar" / lugn, hopp, igenkänning / "hjälper barn bli mer självständiga"

**Fail:** "en app med checklistor" / smart, snygg / feature list

## A/B endings (same footage, two renders)

| Export | Tagline | Command |
|--------|---------|---------|
| Version A | Logo only | `--tagline E --export-suffix version-a` |
| Version B | Morgnar kan kännas så här. | `--tagline A --export-suffix version-b` |
