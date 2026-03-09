const nlp = require('compromise');
const crypto = require('crypto');

// Dummy extraction from server.ts
const textTitle =
  'Paris (AFP) - France strongly condemns the recent drone strikes hitting a rebel base in Iran.';
const textDesc =
  'The French president issued a statement from Paris today regarding the attacks in Iran.';

const titleDoc = nlp(textTitle);
const titlePlaces = titleDoc
  .places()
  .out('array')
  .map((p) => p.toLowerCase().trim());
const descDoc = nlp(textDesc);
const descPlaces = descDoc
  .places()
  .out('array')
  .map((p) => p.toLowerCase().trim());

const PUBLISHER_HUBS = [
  'paris',
  'france',
  'london',
  'uk',
  'united kingdom',
  'washington dc',
  'new york',
  'usa',
  'united states',
  'geneva',
  'brussels',
  'moscow',
  'russia',
  'beijing',
  'china',
  'dubai',
  'doha',
];

const keys = ['paris', 'france', 'iran', 'tehran', 'london'];
const locationScores = {};

for (const key of keys) {
  const regex = new RegExp(`\\b${key}\\b`, 'gi');
  regex.lastIndex = 0;
  const titleMatches = (textTitle.match(regex) || []).length;
  regex.lastIndex = 0;
  const descMatches = (textDesc.match(regex) || []).length;

  if (titleMatches > 0 || descMatches > 0) {
    let score = titleMatches * 5 + descMatches * 1;

    const isTitleEntity = titlePlaces.some((p) => p.includes(key) || key.includes(p));
    const isDescEntity = descPlaces.some((p) => p.includes(key) || key.includes(p));
    if (isTitleEntity) score += 30;
    else if (isDescEntity) score += 10;

    if (PUBLISHER_HUBS.includes(key)) score -= 15;

    locationScores[key] = score;
  }
}

let bestKey = null;
let bestScore = 0;
for (const [key, score] of Object.entries(locationScores)) {
  console.log(`- ${key}: ${score}`);
  if (score > bestScore) {
    bestScore = score;
    bestKey = key;
  }
}
console.log(`\nWINNER: ${bestKey} (${bestScore})`);
