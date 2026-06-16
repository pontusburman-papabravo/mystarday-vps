/**
 * Default copy for admin-editable email_templates rows.
 * Used by migrations and as API fallback when a type has no saved row yet.
 */

const EMAIL_TEMPLATE_DEFAULTS = [
  {
    template_type: 'undersokning',
    label: 'Undersökningsmail',
    subject: 'Din åsikt betyder mycket — {{presentkort_belopp}} i potten! ⭐',
    body_text: `Hej {{foralderns_namn}}!

Vi jobbar ständigt med att göra appen bättre för familjer som er. Därför vill vi gärna höra hur det fungerar i er vardag.

Svara på vår korta undersökning — det tar bara några minuter:

{{tyck_lank}}

Som tack för din tid kan du vara med och vinna ett presentkort på {{presentkort_belopp}}.

Tack för att du hjälper oss att förbättra appen!`,
  },
  {
    template_type: 'valkomstmail',
    label: 'Välkomstmail',
    subject: 'Välkommen! 🌟',
    body_text: `Hej {{foralderns_namn}}!

Vad kul att ni är med! Ni har tagit det första steget mot en tydligare vardag för {{barnets_namn}}.

**Så här kommer ni igång:**
1. Öppna schemat och kolla dagens aktiviteter
2. Låt barnet bocka av och samla stjärnor
3. Lös in belöningar i Skattkammaren

Allt är redan på plats — ni behöver bara börja använda det.

Vi hoppas att appen gör vardagen lite enklare för er familj!`,
  },
  {
    template_type: 'nyhetsbrev',
    label: 'Nyhetsbrev',
    subject: 'Nyheter från oss ⭐',
    body_text: `Hej {{foralderns_namn}}!

Här kommer lite nyheter och tips från oss.

**Det här är nytt:**
- [Skriv ditt första stycke här]

**Tips för vardagen:**
- [Skriv ditt andra stycke här]

Läs mer och öppna appen här:
{{tyck_lank}}

Tack för att du följer oss!`,
  },
  {
    template_type: 'win-back',
    label: 'Återaktivering',
    subject: '{{barnets_namn}}s schema väntar — en snabb koll? ⭐',
    body_text: `Hej {{foralderns_namn}}! 👋

Det var ett tag sedan du var här inne — {{barnets_namn}}s schema väntar på dig.

⭐ **Det tar bara en minut att kolla av schemat**

Barnet har stjärnor att tjäna och belöningar att lösa in. Så fort du öppnar appen är allt på plats.

Öppna schemat via knappen i mailet.

Du kan stänga av dessa mejl under **Inställningar → Aviseringar** i appen.`,
  },
];

function getDefaultEmailTemplate(templateType) {
  return EMAIL_TEMPLATE_DEFAULTS.find((t) => t.template_type === templateType) || null;
}

function mergeWithEmailTemplateDefaults(dbRows) {
  const byType = Object.fromEntries((dbRows || []).map((row) => [row.template_type, row]));
  return EMAIL_TEMPLATE_DEFAULTS.map((defaults) => {
    const saved = byType[defaults.template_type];
    if (!saved || !saved.subject?.trim() || !saved.body_text?.trim()) {
      return { ...defaults, id: saved?.id ?? null, updated_at: saved?.updated_at ?? null };
    }
    return saved;
  });
}

module.exports = {
  EMAIL_TEMPLATE_DEFAULTS,
  getDefaultEmailTemplate,
  mergeWithEmailTemplateDefaults,
};
