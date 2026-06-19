/**
 * Pictogram library for de sju frågorna (~40 keys, E7).
 */

const PICTOGRAMS = [
  { key: 'bathroom', label: 'Badrum', emoji: '🚿' },
  { key: 'kitchen', label: 'Kök', emoji: '🍳' },
  { key: 'bedroom', label: 'Sovrum', emoji: '🛏️' },
  { key: 'school', label: 'Skola', emoji: '🏫' },
  { key: 'playground', label: 'Lekplats', emoji: '🛝' },
  { key: 'car', label: 'Bil', emoji: '🚗' },
  { key: 'walk', label: 'Gå', emoji: '🚶' },
  { key: 'brush_teeth', label: 'Borsta tänder', emoji: '🪥' },
  { key: 'eat', label: 'Äta', emoji: '🍽️' },
  { key: 'drink', label: 'Dricka', emoji: '🥤' },
  { key: 'wash_hands', label: 'Tvätta händer', emoji: '🧼' },
  { key: 'dress', label: 'Klä på sig', emoji: '👕' },
  { key: 'shoes', label: 'Skor', emoji: '👟' },
  { key: 'coat', label: 'Jacka', emoji: '🧥' },
  { key: 'backpack', label: 'Ryggsäck', emoji: '🎒' },
  { key: 'book', label: 'Bok', emoji: '📚' },
  { key: 'pencil', label: 'Penna', emoji: '✏️' },
  { key: 'music', label: 'Musik', emoji: '🎵' },
  { key: 'quiet', label: 'Tyst', emoji: '🤫' },
  { key: 'wait', label: 'Vänta', emoji: '⏳' },
  { key: 'timer_5', label: '5 min', emoji: '⏱️' },
  { key: 'timer_10', label: '10 min', emoji: '⏱️' },
  { key: 'timer_15', label: '15 min', emoji: '⏱️' },
  { key: 'mom', label: 'Mamma', emoji: '👩' },
  { key: 'dad', label: 'Pappa', emoji: '👨' },
  { key: 'teacher', label: 'Lärare', emoji: '👩‍🏫' },
  { key: 'friend', label: 'Kompis', emoji: '🧒' },
  { key: 'alone', label: 'Själv', emoji: '🙋' },
  { key: 'group', label: 'Grupp', emoji: '👥' },
  { key: 'happy', label: 'Glad', emoji: '😊' },
  { key: 'calm', label: 'Lugn', emoji: '😌' },
  { key: 'breakfast', label: 'Frukost', emoji: '🥣' },
  { key: 'lunch', label: 'Lunch', emoji: '🍱' },
  { key: 'snack', label: 'Mellanmål', emoji: '🍎' },
  { key: 'outside', label: 'Utomhus', emoji: '🌳' },
  { key: 'inside', label: 'Inomhus', emoji: '🏠' },
  { key: 'therapy', label: 'Terapi', emoji: '💬' },
  { key: 'star', label: 'Stjärna', emoji: '⭐' },
  { key: 'toy', label: 'Leksak', emoji: '🧸' },
  { key: 'screen', label: 'Skärm', emoji: '📱' },
];

function getPictogram(key) {
  return PICTOGRAMS.find((p) => p.key === key) || null;
}

module.exports = { PICTOGRAMS, getPictogram };
