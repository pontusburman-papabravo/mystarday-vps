#!/usr/bin/env node
/**
 * Build sv→en display-name map for family content (activities + rewards).
 * Sources: default-content locale pairs, vacation schedules, onboarding weekend preview.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'config/family-content-locale/sv-to-en.json');

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

function activityKey(row) {
  return [row.icon, row.schema_type, row.category, row.sort_order, row.star_value].join('|');
}

function buildDefaultContentPairs() {
  const svActs = readJson('config/default-content/sv-SE/activities.json');
  const enActs = readJson('config/default-content/en-GB/activities.json');
  const svRewards = readJson('config/default-content/sv-SE/rewards.json');
  const enRewards = readJson('config/default-content/en-GB/rewards.json');

  const activities = {};
  const activityByKey = {};
  for (let i = 0; i < svActs.length; i++) {
    const sv = svActs[i];
    const en = enActs[i];
    if (!sv || !en) continue;
    activities[sv.name] = en.name;
    activityByKey[activityKey(sv)] = en.name;
  }

  const rewards = {};
  const rewardByKey = {};
  for (let i = 0; i < svRewards.length; i++) {
    const sv = svRewards[i];
    const en = enRewards[i];
    if (!sv || !en) continue;
    rewards[sv.name] = en.name;
    rewardByKey[`${sv.icon}|${sv.star_cost}`] = en.name;
  }

  return { activities, activityByKey, rewards, rewardByKey };
}

/** Vacation / helg / admin-library names not in registration JSON. */
const EXTENDED_ACTIVITIES = {
  'Sova ut': 'Sleep in',
  'Frukost i lugn & ro': 'Breakfast in peace',
  'Frukost i lugn och ro': 'Breakfast in peace',
  'Utflykt / Park': 'Day out / park',
  'Utflykt': 'Day out',
  'Leka fritt': 'Free play',
  'Familjeaktivitet': 'Family activity',
  'Familjaktivitet': 'Family activity',
  'Städa rummet': 'Tidy room',
  'Städa rumm...': 'Tidy room',
  'Lunch': 'Lunch',
  'Pyssel eller spel': 'Crafts or games',
  'Bad eller lek vid vatten': 'Swim or water play',
  'Glass eller fika': 'Ice cream or snack',
  'Kvällsaktivitet': 'Evening activity',
  'Julpyssel': 'Christmas crafts',
  'Julmys & fika': 'Christmas cosy time',
  'Vakna & klä på sig': 'Wake up & get dressed',
  'Äta frukost': 'Eat breakfast',
  'Äta middag': 'Eat dinner',
  'Hjälpa till att duka': 'Help set the table',
  'Duka bord': 'Set the table',
  'Duka av': 'Clear the table',
  'Gå upp ur sängen': 'Get out of bed',
  'Ta på kläder': 'Get dressed',
  'Bädda sängen': 'Make the bed',
  'Packa väska': 'Pack a bag',
  'Åk iväg': 'Head out',
  'Lek & upptäck': 'Play & explore',
  'Packa badkläder': 'Pack swimwear',
  'Bada eller leka': 'Swim or play',
  'Duscha och torka': 'Shower and dry off',
  'Hem igen': 'Head home',
  'Ta på pyjamas': 'Put on pyjamas',
  'Tvätta ansiktet': 'Wash face',
  'Välj pyssel': 'Choose a craft',
  'Gör klart': 'Finish up',
  'Städa undan': 'Tidy up',
  'Välj aktivitet tillsammans': 'Choose an activity together',
  'Gör aktiviteten': 'Do the activity',
  'Hämta post': 'Collect the mail',
  'Hjälpa till': 'Help out',
  'Sätta på skor': 'Put on shoes',
  'Placera tallrikar': 'Put plates down',
  'Torka bordet': 'Wipe the table',
  'Gå till brevlådan': 'Go to the mailbox',
  'Lägg posten på plats': 'Put mail away',
  'Fråga vad som behövs': 'Ask what is needed',
  'Gör uppgiften': 'Do the task',
  'Skola/Förskola': 'Preschool/School',
  'Skola': 'School',
  'Förskola/Skola': 'Preschool/School',
  'Rast & lek': 'Break & play',
  'Rast': 'Break',
  'Fritidsaktivitet': 'After-school activity',
  'Läxor': 'Homework',
  'Läsa': 'Reading',
  'Packa skolväska': 'Pack school bag',
  'Frukost': 'Breakfast',
  'Mellanmål': 'Snack',
  'Middag': 'Dinner',
  'Godnattsaga': 'Bedtime story',
  'Pyjamas': 'Pyjamas',
  'Sova': 'Sleep',
  'Vakna': 'Wake up',
  'Leka ute': 'Play outside',
  'Pyssel': 'Crafts',
  'Träning/Aktivitet': 'Exercise/Activity',
  'Klä på sig': 'Get dressed',
  'Borsta tänderna (kväll)': 'Brush teeth (evening)',
  'Borsta tänderna (morgon)': 'Brush teeth (morning)',
  'Borsta tänderna': 'Brush teeth',
};

const EXTENDED_REWARDS = {
  'Extra skärmtid': 'Extra screen time',
  'Välja middag': 'Choose dinner',
  'Liten present': 'Small gift',
  'Glass': 'Ice cream',
  'Skärmtid': 'Screen time',
  'Senare läggdags': 'Later bedtime',
  'Välja film': 'Choose a film',
  'Utflykt': 'Day out',
  'Lekpark': 'Playground trip',
};

const pairs = buildDefaultContentPairs();
const out = {
  version: 1,
  activities: { ...pairs.activities, ...EXTENDED_ACTIVITIES },
  activityByKey: pairs.activityByKey,
  rewards: { ...pairs.rewards, ...EXTENDED_REWARDS },
  rewardByKey: pairs.rewardByKey,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`✓ ${OUT} — ${Object.keys(out.activities).length} activities, ${Object.keys(out.rewards).length} rewards`);
