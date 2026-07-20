/**
 * Shared pictogram library (bildstöd v1).
 * Visuals: Nordic Calm Design Kit v1 (`public/assets/min-stjarndag-design-kit/`).
 * Fallback: emoji when no kit mapping exists.
 */

const PICTOGRAM_IMAGE_BASE = '/resurser/bilder';
const DESIGN_KIT_ICON_BASE = '/assets/min-stjarndag-design-kit/icons/svg';
const DESIGN_KIT_THEME_DEFAULT = 'light';

/**
 * icon_key → design-kit SVG basename (icons/svg/{theme}/{name}.svg).
 * Only keys with a usable kit asset are listed; others stay emoji-only.
 */
const DESIGN_KIT_BY_KEY = {
  // Morgon
  wake_up: 'vakna',
  toilet: 'toalett',
  wash_hands: 'tval',
  brush_teeth: 'borsta-tanderna',
  dress: 'kla-pa-sig',
  breakfast: 'frukost',
  pack_bag: 'packa-vaska',
  school: 'skola',
  shoes: 'skor',
  coat: 'jacka',
  backpack: 'skolvaska',
  bus: 'buss',
  car: 'bil',
  walk: 'promenad',
  morning_routine: 'morgon',

  // Kväll
  dinner: 'middag',
  shower: 'duscha',
  pajamas: 'pyjamas',
  read_book: 'lasa',
  sleep: 'sova',
  bath: 'badkar',
  bedroom: 'sang',
  evening_routine: 'kvall',
  book: 'bok',
  quiet: 'lugn',

  // Skola
  recess: 'rast',
  pe: 'fotboll',
  math: 'matematik',
  swedish: 'sprak',
  cafeteria: 'lunch',
  library_room: 'bibliotek',
  pencil: 'penna',
  homework: 'laxa',
  teacher: 'larare',
  group: 'tillsammans',
  listen: 'lyssna',
  art: 'pyssel',
  music: 'musik',
  computer: 'dator',
  playground: 'leka',

  // Hygien
  hair_brush: 'borsta-haret',
  nails: 'klippa-naglar',
  medicine: 'ta-medicin',
  bathroom: 'toalett',
  dentist: 'tandlakare',

  // Övergångar
  soon: 'senare',
  five_minutes: 'timer',
  now: 'nu',
  done: 'fardig',
  wait: 'vanta',
  timer_5: 'timer',
  timer_10: 'timer',
  timer_15: 'timer',
  timer_1: 'timer',

  // TEACCH-inspirerat
  first: 'checklista',
  then: 'nasta',
  finished: 'fardig',
  pause: 'ta-paus',
  work: 'uppgift',
  rest: 'vila',
  help: 'hjalp',
  alone: 'ensam',
  all_done: 'fardig',
  think: 'fokus',

  // Känslor
  happy: 'glad',
  angry: 'arg',
  sad: 'ledsen',
  tired: 'trott',
  worried: 'orolig',
  proud: 'stolt',
  scared: 'nervos',
  stressed: 'orolig',
  calm: 'lugn',

  // Platser
  kitchen: 'spis',
  inside: 'hemma',
  outside: 'utflykt',
  therapy: 'prata',
  doctor: 'lakare',

  // Mat & dryck
  eat: 'tallrik',
  drink: 'dricka-vatten',
  lunch: 'lunch',
  snack: 'mellanmal',

  // Lek & fritid
  toy: 'leka',
  screen: 'surfplatta',
  bike: 'cykel',
  swing: 'leka',
  sandbox: 'leka',
  star: 'tacksam',
  celebrate: 'glad',

  // Familj & socialt
  mom: 'familj',
  dad: 'familj',
  friend: 'vanskap',
  grandma: 'familj',
  grandpa: 'familj',
  sibling: 'tillsammans',
  pet: 'trygg',
};

const PICTOGRAMS = [
  // ── Morgon ──────────────────────────────────────────────
  { key: 'wake_up', label: 'Vakna', emoji: '☀️', category: 'morgon' },
  { key: 'toilet', label: 'Toalett', emoji: '🚽', category: 'morgon' },
  { key: 'wash_hands', label: 'Tvätta händer', emoji: '🧼', category: 'morgon' },
  { key: 'brush_teeth', label: 'Borsta tänder', emoji: '🪥', category: 'morgon' },
  { key: 'dress', label: 'Klä på sig', emoji: '👕', category: 'morgon' },
  { key: 'breakfast', label: 'Frukost', emoji: '🥣', category: 'morgon' },
  { key: 'pack_bag', label: 'Packa väskan', emoji: '🎒', category: 'morgon' },
  { key: 'school', label: 'Skola', emoji: '🏫', category: 'morgon' },
  { key: 'shoes', label: 'Skor', emoji: '👟', category: 'morgon' },
  { key: 'coat', label: 'Jacka', emoji: '🧥', category: 'morgon' },
  { key: 'backpack', label: 'Ryggsäck', emoji: '🎒', category: 'morgon' },
  { key: 'bus', label: 'Buss', emoji: '🚌', category: 'morgon' },
  { key: 'car', label: 'Bil', emoji: '🚗', category: 'morgon' },
  { key: 'walk', label: 'Gå', emoji: '🚶', category: 'morgon' },
  { key: 'morning_routine', label: 'Morgonrutin', emoji: '🌅', category: 'morgon' },

  // ── Kväll ───────────────────────────────────────────────
  { key: 'dinner', label: 'Middag', emoji: '🍽️', category: 'kvall' },
  { key: 'shower', label: 'Duscha', emoji: '🚿', category: 'kvall' },
  { key: 'pajamas', label: 'Pyjamas', emoji: '🩳', category: 'kvall' },
  { key: 'read_book', label: 'Läsa bok', emoji: '📖', category: 'kvall' },
  { key: 'sleep', label: 'Sova', emoji: '😴', category: 'kvall' },
  { key: 'bath', label: 'Bada', emoji: '🛁', category: 'kvall' },
  { key: 'bedroom', label: 'Sovrum', emoji: '🛏️', category: 'kvall' },
  { key: 'evening_routine', label: 'Kvällsrutin', emoji: '🌙', category: 'kvall' },
  { key: 'book', label: 'Bok', emoji: '📚', category: 'kvall' },
  { key: 'quiet', label: 'Tyst', emoji: '🤫', category: 'kvall' },

  // ── Skola ───────────────────────────────────────────────
  { key: 'recess', label: 'Rast', emoji: '🛝', category: 'skola' },
  { key: 'pe', label: 'Idrott', emoji: '⚽', category: 'skola' },
  { key: 'math', label: 'Matematik', emoji: '🔢', category: 'skola' },
  { key: 'swedish', label: 'Svenska', emoji: '📝', category: 'skola' },
  { key: 'cafeteria', label: 'Matsal', emoji: '🍱', category: 'skola' },
  { key: 'library_room', label: 'Bibliotek', emoji: '📚', category: 'skola' },
  { key: 'pencil', label: 'Penna', emoji: '✏️', category: 'skola' },
  { key: 'homework', label: 'Läxa', emoji: '📓', category: 'skola' },
  { key: 'teacher', label: 'Lärare', emoji: '👩‍🏫', category: 'skola' },
  { key: 'group', label: 'Grupp', emoji: '👥', category: 'skola' },
  { key: 'listen', label: 'Lyssna', emoji: '👂', category: 'skola' },
  { key: 'art', label: 'Bild', emoji: '🎨', category: 'skola' },
  { key: 'music', label: 'Musik', emoji: '🎵', category: 'skola' },
  { key: 'computer', label: 'Dator', emoji: '💻', category: 'skola' },
  { key: 'playground', label: 'Lekplats', emoji: '🛝', category: 'skola' },

  // ── Hygien ──────────────────────────────────────────────
  { key: 'hair_brush', label: 'Hårborstning', emoji: '💇', category: 'hygien' },
  { key: 'nails', label: 'Naglar', emoji: '💅', category: 'hygien' },
  { key: 'medicine', label: 'Medicin', emoji: '💊', category: 'hygien' },
  { key: 'bathroom', label: 'Badrum', emoji: '🚿', category: 'hygien' },
  { key: 'dentist', label: 'Tandläkare', emoji: '🦷', category: 'hygien' },

  // ── Övergångar ──────────────────────────────────────────
  { key: 'soon', label: 'Snart', emoji: '⏰', category: 'overgang' },
  { key: 'five_minutes', label: 'Om fem minuter', emoji: '⏱️', category: 'overgang' },
  { key: 'now', label: 'Nu', emoji: '▶️', category: 'overgang' },
  { key: 'done', label: 'Färdig', emoji: '✅', category: 'overgang' },
  { key: 'wait', label: 'Vänta', emoji: '⏳', category: 'overgang' },
  { key: 'timer_5', label: '5 min', emoji: '⏱️', category: 'overgang' },
  { key: 'timer_10', label: '10 min', emoji: '⏱️', category: 'overgang' },
  { key: 'timer_15', label: '15 min', emoji: '⏱️', category: 'overgang' },
  { key: 'timer_1', label: '1 min', emoji: '⏱️', category: 'overgang' },

  // ── TEACCH-inspirerat ───────────────────────────────────
  { key: 'first', label: 'Först', emoji: '1️⃣', category: 'teacch' },
  { key: 'then', label: 'Sedan', emoji: '➡️', category: 'teacch' },
  { key: 'finished', label: 'Klar', emoji: '✔️', category: 'teacch' },
  { key: 'pause', label: 'Paus', emoji: '⏸️', category: 'teacch' },
  { key: 'work', label: 'Arbeta', emoji: '📝', category: 'teacch' },
  { key: 'rest', label: 'Vila', emoji: '🛋️', category: 'teacch' },
  { key: 'help', label: 'Hjälp', emoji: '🙋', category: 'teacch' },
  { key: 'alone', label: 'Själv', emoji: '🙋', category: 'teacch' },
  { key: 'all_done', label: 'Allt klart', emoji: '🏁', category: 'teacch' },
  { key: 'think', label: 'Tänk', emoji: '🤔', category: 'teacch' },

  // ── Känslor (8 fasta) ───────────────────────────────────
  { key: 'happy', label: 'Glad', emoji: '😊', category: 'kansla' },
  { key: 'angry', label: 'Arg', emoji: '😠', category: 'kansla' },
  { key: 'sad', label: 'Ledsen', emoji: '😢', category: 'kansla' },
  { key: 'tired', label: 'Trött', emoji: '😴', category: 'kansla' },
  { key: 'worried', label: 'Orolig', emoji: '😟', category: 'kansla' },
  { key: 'proud', label: 'Stolt', emoji: '😌', category: 'kansla' },
  { key: 'scared', label: 'Rädd', emoji: '😨', category: 'kansla' },
  { key: 'stressed', label: 'Stressad', emoji: '😰', category: 'kansla' },
  { key: 'calm', label: 'Lugn', emoji: '😌', category: 'kansla' },

  // ── Platser ─────────────────────────────────────────────
  { key: 'kitchen', label: 'Kök', emoji: '🍳', category: 'plats' },
  { key: 'inside', label: 'Inomhus', emoji: '🏠', category: 'plats' },
  { key: 'outside', label: 'Utomhus', emoji: '🌳', category: 'plats' },
  { key: 'therapy', label: 'Terapi', emoji: '💬', category: 'plats' },
  { key: 'doctor', label: 'Läkare', emoji: '👨‍⚕️', category: 'plats' },

  // ── Mat & dryck ─────────────────────────────────────────
  { key: 'eat', label: 'Äta', emoji: '🍽️', category: 'mat' },
  { key: 'drink', label: 'Dricka', emoji: '🥤', category: 'mat' },
  { key: 'lunch', label: 'Lunch', emoji: '🍱', category: 'mat' },
  { key: 'snack', label: 'Mellanmål', emoji: '🍎', category: 'mat' },

  // ── Lek & fritid ────────────────────────────────────────
  { key: 'toy', label: 'Leksak', emoji: '🧸', category: 'lek' },
  { key: 'screen', label: 'Skärm', emoji: '📱', category: 'lek' },
  { key: 'bike', label: 'Cykel', emoji: '🚲', category: 'lek' },
  { key: 'swing', label: 'Gunga', emoji: '🪀', category: 'lek' },
  { key: 'sandbox', label: 'Sandlåda', emoji: '🏖️', category: 'lek' },
  { key: 'star', label: 'Stjärna', emoji: '⭐', category: 'lek' },
  { key: 'celebrate', label: 'Fira', emoji: '🎉', category: 'lek' },

  // ── Familj & socialt ────────────────────────────────────
  { key: 'mom', label: 'Mamma', emoji: '👩', category: 'familj' },
  { key: 'dad', label: 'Pappa', emoji: '👨', category: 'familj' },
  { key: 'friend', label: 'Kompis', emoji: '🧒', category: 'familj' },
  { key: 'grandma', label: 'Mormor/farmor', emoji: '👵', category: 'familj' },
  { key: 'grandpa', label: 'Morfar/farfar', emoji: '👴', category: 'familj' },
  { key: 'sibling', label: 'Syskon', emoji: '👫', category: 'familj' },
  { key: 'pet', label: 'Husdjur', emoji: '🐾', category: 'familj' },
];

const VALID_KEYS = new Set(PICTOGRAMS.map((p) => p.key));

/** Schedule names that may not match pictogram label exactly (longest first). */
const EXTRA_NAME_TO_KEY = [
  ['plocka undan leksaker', 'toy'],
  ['gå ut och leka', 'playground'],
  ['ta på ytterkläder', 'coat'],
  ['borsta tänderna', 'brush_teeth'],
  ['tvätta händerna', 'wash_hands'],
  ['tvätta ansiktet', 'wash_hands'],
  ['ta på pyjamas', 'pajamas'],
  ['packa väskan', 'pack_bag'],
  ['gå hemifrån', 'walk'],
  ['dricka vatten', 'drink'],
  ['lugn stund', 'quiet'],
  ['klä på sig', 'dress'],
  ['kamma håret', 'hair_brush'],
  ['kvällsaktivitet', 'screen'],
  ['äta frukt', 'snack'],
  ['laga mat', 'kitchen'],
  ['åka bil', 'car'],
];

function normalizeActivityName(name) {
  return String(name || '')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .trim()
    .toLowerCase();
}

const NAME_MATCHERS = (function buildNameMatchers() {
  const rows = [];
  PICTOGRAMS.forEach((p) => rows.push([p.label.toLowerCase(), p.key]));
  EXTRA_NAME_TO_KEY.forEach(([name, key]) => {
    if (VALID_KEYS.has(key)) rows.push([name, key]);
  });
  rows.sort((a, b) => b[0].length - a[0].length);
  return rows;
}());

function inferPictogramKey(row) {
  if (!row) return null;
  if (row.icon_key && VALID_KEYS.has(row.icon_key)) return row.icon_key;
  const name = normalizeActivityName(row.name);
  if (name) {
    for (let i = 0; i < NAME_MATCHERS.length; i++) {
      const pattern = NAME_MATCHERS[i][0];
      const key = NAME_MATCHERS[i][1];
      if (name === pattern || name.includes(pattern)) return key;
    }
  }
  const icon = String(row.icon || '').trim();
  if (icon) {
    const matches = PICTOGRAMS.filter((p) => p.emoji === icon);
    if (matches.length === 1) return matches[0].key;
  }
  return null;
}

function designKitIconName(key) {
  return DESIGN_KIT_BY_KEY[key] || null;
}

function designKitIconPath(key, theme) {
  const name = designKitIconName(key);
  if (!name) return null;
  const t = theme === 'dark' ? 'dark' : DESIGN_KIT_THEME_DEFAULT;
  return `${DESIGN_KIT_ICON_BASE}/${t}/${name}.svg`;
}

function pictogramImagePath(key) {
  return designKitIconPath(key) || `${PICTOGRAM_IMAGE_BASE}/${key}.png`;
}

function getPictogram(key) {
  if (!key) return null;
  return PICTOGRAMS.find((p) => p.key === key) || null;
}

function isValidPictogramKey(key) {
  if (key == null || key === '') return true;
  return VALID_KEYS.has(key);
}

function validatePictogramKey(key) {
  if (isValidPictogramKey(key)) return null;
  return 'Okänd bildnyckel — välj en bild från biblioteket';
}

function listPictogramsForApi() {
  return PICTOGRAMS.map((p) => ({
    key: p.key,
    label: p.label,
    category: p.category,
    emoji: p.emoji,
    url: p.imagePath || pictogramImagePath(p.key),
    design_kit: designKitIconName(p.key) || undefined,
  }));
}

function enrichPictogramFields(row) {
  if (!row || row.image_url) return row;
  const key = (row.icon_key && VALID_KEYS.has(row.icon_key))
    ? row.icon_key
    : inferPictogramKey(row);
  if (!key) return row;
  const pic = getPictogram(key);
  if (!pic) return row;
  const url = designKitIconPath(key);
  if (!url) return row;
  return Object.assign({}, row, {
    pictogram_emoji: pic.emoji,
    pictogram_url: url,
  });
}

function enrichPictogramFieldsMany(rows) {
  return rows.map((row) => enrichPictogramFields(row));
}

module.exports = {
  PICTOGRAMS,
  PICTOGRAM_IMAGE_BASE,
  DESIGN_KIT_ICON_BASE,
  DESIGN_KIT_BY_KEY,
  inferPictogramKey,
  getPictogram,
  isValidPictogramKey,
  validatePictogramKey,
  designKitIconName,
  designKitIconPath,
  pictogramImagePath,
  listPictogramsForApi,
  enrichPictogramFields,
  enrichPictogramFieldsMany,
};
