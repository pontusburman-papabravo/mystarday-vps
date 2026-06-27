'use strict';

/**
 * För dig outcome follow-up — survey definitions + email copy for §19.6 manual outreach.
 * Surveys: {APP_URL}/tyck/[slug] (2 questions, ~10 seconds).
 */

const config = require('./config');
const surveyDb = require('../../db/surveys');

const OUTCOME_OPTIONS = [
  { option_text: '😊 Mycket bättre' },
  { option_text: '🙂 Lite bättre' },
  { option_text: '😐 Ingen skillnad' },
  { option_text: 'Har inte testat än' },
];

function productName() {
  return config.email.fromName || 'appen';
}

/** Standard question pair — maps to for_dig outcome_score 4/3/2 when synced manually. */
function buildQuestions(outcomeQuestion) {
  return [
    {
      question_text: outcomeQuestion,
      question_type: 'radio',
      options: OUTCOME_OPTIONS,
    },
    {
      question_text: 'Vill du berätta något mer? (valfritt)',
      question_type: 'text_long',
      is_required: false,
    },
  ];
}

/** One survey per parent (not per barn×mål row). */
function buildFollowupSurveys() {
  const openAppCta = `Öppna ${productName()}`;
  return [
    {
      slug: 'utfall-sed-morgon',
      title: 'Hur har morgonrutinen gått?',
      description: 'Ni testade Bra morgnar för Sed — det tar bara några sekunder att svara.',
      target_tag: 'För dig uppföljning',
      thank_you_message: 'Tack! Ditt svar hjälper oss förstå vad som fungerar hemma.',
      thank_you_cta_text: openAppCta,
      thank_you_cta_url: '/for-dig',
      questions: buildQuestions('Hur har morgonrutinen gått för Sed?'),
    },
    {
      slug: 'utfall-jimmy-kvall',
      title: 'Hur har rutinerna gått?',
      description: 'Ni testade flera rutiner för Otto och Elma — det tar bara några sekunder.',
      target_tag: 'För dig uppföljning',
      thank_you_message: 'Tack! Ditt svar hjälper oss förstå vad som fungerar hemma.',
      thank_you_cta_text: openAppCta,
      thank_you_cta_url: '/for-dig',
      questions: buildQuestions('Hur har kvällar och morgnar gått för Otto och Elma?'),
    },
    {
      slug: 'utfall-kim-loke',
      title: 'Hur har det gått för Loke?',
      description: 'Ni testade Motivation och Samarbete hemma — det tar bara några sekunder.',
      target_tag: 'För dig uppföljning',
      thank_you_message: 'Tack! Ditt svar hjälper oss förstå vad som fungerar hemma.',
      thank_you_cta_text: openAppCta,
      thank_you_cta_url: '/for-dig',
      questions: buildQuestions('Hur har det gått hemma för Loke?'),
    },
    {
      slug: 'utfall-sandra-rutiner',
      title: 'Hur har rutinerna gått?',
      description: 'Ni testade flera utvecklingsmål för Cornelia och Benjamin.',
      target_tag: 'För dig uppföljning',
      thank_you_message: 'Tack! Ditt svar hjälper oss förstå vad som fungerar hemma.',
      thank_you_cta_text: openAppCta,
      thank_you_cta_url: '/for-dig',
      questions: buildQuestions('Vad har varit mest märkbart hemma — om något?'),
    },
    {
      slug: 'utfall-alexander-vardag',
      title: 'Hur har det gått hemma?',
      description: 'Ni har testat flera delar av vardagen — det tar bara några sekunder.',
      target_tag: 'För dig uppföljning',
      thank_you_message: 'Tack! Ditt svar hjälper oss förstå vad som fungerar hemma.',
      thank_you_cta_text: openAppCta,
      thank_you_cta_url: '/for-dig',
      questions: buildQuestions('Hur har det gått med rutinerna för Jamie och Penny?'),
    },
  ];
}

/**
 * Email campaign rows — one per parent. `send: false` skips (e.g. internal test account).
 */
function buildFollowupEmails() {
  const intro = `Jag heter Pontus och är en av dem som jobbar med ${productName()}.`;
  return [
    {
      key: 'wyhp',
      to: 'wyhp7z892b@privaterelay.appleid.com',
      surveySlug: 'utfall-sed-morgon',
      subject: 'Hur har morgonrutinen gått? ☀️',
      greeting: 'Hej!',
      body: `${intro}

För drygt en vecka sedan aktiverade ni Bra morgnar för Sed via För dig. Vi är nyfikna: hur har det gått? Har morgnarna känts lite lättare, ungefär likadana, eller har ni inte hunnit testa ordentligt än?`,
      send: true,
    },
    {
      key: 'jimmy',
      to: 'mafredas.jimmy@gmail.com',
      surveySlug: 'utfall-jimmy-kvall',
      subject: 'Hur har rutinerna gått för Otto och Elma? 🌙',
      greeting: 'Hej Jimmy!',
      body: `${intro}

För drygt en vecka sedan aktiverade ni flera rutiner för Otto och Elma — bland annat kvällar, morgnar och samarbete hemma. Vi är nyfikna: vad har varit lättare, om något? Eller känns det ungefär som innan?`,
      send: true,
    },
    {
      key: 'kim',
      to: 'kimandreasvensson@outlook.com',
      surveySlug: 'utfall-kim-loke',
      subject: 'Hur har det gått för Loke? ✨',
      greeting: 'Hej Kim!',
      body: `${intro}

För drygt en vecka sedan aktiverade ni Motivation och Samarbete hemma för Loke. Vi är nyfikna: om något har ändrats — vad märkte ni först?`,
      send: true,
    },
    {
      key: 'sandra',
      to: '93olssan@gmail.com',
      surveySlug: 'utfall-sandra-rutiner',
      subject: 'Hur har rutinerna funkat för Cornelia och Benjamin? 🌟',
      greeting: 'Hej Sandra!',
      body: `${intro}

För drygt en vecka sedan testade ni flera utvecklingsmål för Cornelia och Benjamin. Vi är nyfikna: vad har varit mest märkbart hemma — om något?`,
      send: true,
    },
    {
      key: 'pontus',
      to: 'pontus@burman.cc',
      surveySlug: 'utfall-sed-morgon',
      subject: '[TEST] Hur har morgonrutinen gått? ☀️',
      greeting: 'Hej Pontus!',
      body: 'Det här är ett testmejl — samma struktur som skickas till riktiga föräldrar.',
      send: false,
    },
    {
      key: 'alexander',
      to: 'stromberg8910@gmail.com',
      surveySlug: 'utfall-alexander-vardag',
      subject: 'Hur har För dig funkat för Jamie och Penny? 🌙',
      greeting: 'Hej Alexander!',
      body: `${intro}

För drygt en vecka sedan testade ni flera olika delar av vardagen för Jamie och Penny via För dig. Vi är nyfikna: hur har det gått hemma? Har något känts lite enklare, eller ungefär som innan?`,
      send: true,
    },
  ];
}

function buildEmailBody({ greeting, body, surveyUrl }) {
  return `${greeting}

${body}

Svara här (tar ~10 sekunder):
${surveyUrl}

Eller svara på det här mejlet om du vill skriva mer — ett kort svar räcker.

Tack för att ni testar!

Varma hälsningar,
Pontus
${productName()}`;
}

async function seedFollowupSurveys() {
  const seeded = [];
  const surveys = buildFollowupSurveys();

  for (const surveyData of surveys) {
    const existing = await surveyDb.getSurveyBySlug(surveyData.slug);
    if (existing) {
      if (existing.status !== 'active') {
        await surveyDb.updateSurvey(existing.id, { status: 'active' });
        seeded.push({ slug: surveyData.slug, action: 'activated', id: existing.id });
      } else {
        seeded.push({ slug: surveyData.slug, action: 'skipped', id: existing.id });
      }
      continue;
    }

    const survey = await surveyDb.createSurvey({
      slug: surveyData.slug,
      title: surveyData.title,
      description: surveyData.description,
      target_tag: surveyData.target_tag,
      thank_you_message: surveyData.thank_you_message,
      thank_you_cta_text: surveyData.thank_you_cta_text,
      thank_you_cta_url: surveyData.thank_you_cta_url,
    });

    for (let qi = 0; qi < surveyData.questions.length; qi++) {
      const qData = surveyData.questions[qi];
      const question = await surveyDb.createQuestion({
        survey_id: survey.id,
        sort_order: qi,
        question_text: qData.question_text,
        question_type: qData.question_type,
        is_required: qData.is_required !== false,
      });

      if (qData.options) {
        for (let oi = 0; oi < qData.options.length; oi++) {
          await surveyDb.createOption({
            question_id: question.id,
            sort_order: oi,
            option_text: qData.options[oi].option_text,
            allows_freetext: qData.options[oi].allows_freetext ?? false,
          });
        }
      }
    }

    await surveyDb.updateSurvey(survey.id, { status: 'active' });
    seeded.push({ slug: surveyData.slug, action: 'created', id: survey.id });
  }

  return seeded;
}

module.exports = {
  buildFollowupSurveys,
  buildFollowupEmails,
  OUTCOME_OPTIONS,
  buildEmailBody,
  seedFollowupSurveys,
};
