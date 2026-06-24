'use strict';

const { chatJson } = require('./llm');
const { enforceActivityCount } = require('./select-template');

const SYSTEM_PROMPT = `Du är en hjälpsam assistent för Min Stjärndag, en svensk familjeapp för barnrutiner.
Anpassa EN befintlig aktivitetsmall — skapa INTE helt nya aktiviteter från scratch.
Svara ENDAST med giltig JSON enligt schema:
{
  "planTitle": "string",
  "introText": "string (max 200 tecken, uppmuntrande till förälder)",
  "tasks": [
    { "title": "string", "description": "string optional max 80 tecken" }
  ]
}
Regler:
- Svenska, enkel och konkret barnvänlig ton (inte infantil)
- tasks.length MÅSTE matcha antal aktiviteter i mallen
- Behåll samma ordning som mallen
- Varje title ska vara ett kort steg barnet kan förstå (verb + objekt)
- Inga medicinska eller terapeutiska råd
- Om fritext saknas eller är tom: hitta inte på känslig bakgrund
- Vid osäkerhet: minimal ändring av originaltitel`;

/**
 * @param {object} input
 * @param {string} input.childName
 * @param {string} input.ageBand
 * @param {string} input.routineType
 * @param {string[]} input.mainChallenges
 * @param {string} input.supportLevel
 * @param {string} input.desiredLength
 * @param {string} [input.freeText]
 * @param {Array<{name:string,icon?:string,section?:string}>} input.baseItems
 * @param {string} [input.scheduleName]
 */
async function generateStarterPlan(input) {
  const desiredLength = input.desiredLength || 'normal';
  const baseItems = enforceActivityCount(input.baseItems || [], desiredLength);

  if (baseItems.length === 0) {
    return buildFallback(input, baseItems, 'EMPTY_TEMPLATE');
  }

  try {
    const userPrompt = JSON.stringify({
      childName: input.childName || 'Barnet',
      ageBand: input.ageBand,
      routineType: input.routineType,
      mainChallenges: input.mainChallenges || [],
      supportLevel: input.supportLevel,
      desiredLength,
      freeText: input.freeText || '',
      scheduleName: input.scheduleName || '',
      templateTasks: baseItems.map((item) => ({
        title: item.name,
        icon: item.icon,
        section: item.section,
      })),
    });

    const parsed = await chatJson({ system: SYSTEM_PROMPT, user: userPrompt });
    const tasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];

    const items = baseItems.map((base, idx) => {
      const aiTask = tasks[idx];
      const title = sanitizeTitle(aiTask?.title) || personalizeFallbackTitle(base.name, input.childName);
      return {
        ...base,
        name: title,
        ai_description: aiTask?.description ? String(aiTask.description).slice(0, 80) : undefined,
      };
    });

    return {
      planTitle: sanitizeTitle(parsed.planTitle) || input.scheduleName || 'Ert schema',
      introText: parsed.introText ? String(parsed.introText).slice(0, 200) : undefined,
      items,
      used_ai: true,
      fallback_reason: null,
    };
  } catch (err) {
    const reason = err.code || err.message || 'UNKNOWN';
    return buildFallback(input, baseItems, reason);
  }
}

function buildFallback(input, baseItems, reason) {
  const childName = input.childName || 'Barnet';
  const items = baseItems.map((base) => ({
    ...base,
    name: personalizeFallbackTitle(base.name, childName),
  }));

  return {
    planTitle: input.scheduleName || 'Ert första schema',
    introText: `${childName} får ett tydligt schema att följa — ni kan alltid justera senare.`,
    items,
    used_ai: false,
    fallback_reason: reason,
  };
}

function sanitizeTitle(s) {
  if (!s || typeof s !== 'string') return null;
  const t = s.trim().replace(/\s+/g, ' ');
  return t.length > 0 && t.length <= 80 ? t : null;
}

function personalizeFallbackTitle(originalName, childName) {
  const name = childName || 'Barnet';
  if (!originalName) return `Steg med ${name}`;
  if (originalName.toLowerCase().includes(name.toLowerCase())) return originalName;
  return `${originalName} (${name})`;
}

module.exports = {
  generateStarterPlan,
  buildFallback,
  sanitizeTitle,
  personalizeFallbackTitle,
};
