/**
 * Shared pictogram library (bildstöd v1) — emoji facade until illustrations land in public/resurser/bilder/.
 */

const PICTOGRAM_IMAGE_BASE = '/resurser/bilder';

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

function pictogramImagePath(key) {
  return `${PICTOGRAM_IMAGE_BASE}/${key}.png`;
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
  }));
}

function enrichPictogramFields(row) {
  if (!row || row.image_url) return row;
  if (!row.icon_key) return row;
  const pic = getPictogram(row.icon_key);
  if (!pic) return row;
  return Object.assign({}, row, {
    pictogram_emoji: pic.emoji,
    pictogram_url: pic.imagePath || pictogramImagePath(pic.key),
  });
}

function enrichPictogramFieldsMany(rows) {
  return rows.map((row) => enrichPictogramFields(row));
}

module.exports = {
  PICTOGRAMS,
  PICTOGRAM_IMAGE_BASE,
  getPictogram,
  isValidPictogramKey,
  validatePictogramKey,
  pictogramImagePath,
  listPictogramsForApi,
  enrichPictogramFields,
  enrichPictogramFieldsMany,
};
