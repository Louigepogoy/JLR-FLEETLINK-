// Chat policy: blocks profanity and slurs in English, Tagalog and Cebuano.
// Words that are also ordinary Cebu vocabulary are deliberately left out to avoid blocking normal
// messages, e.g. "bogo" (Bogo City), "leche" (leche flan), "atay" (liver), "buang".
const BLOCKED_WORDS = [
  // English
  'fuck', 'fck', 'fuk', 'fuq', 'motherfucker', 'shit', 'bullshit', 'bitch', 'asshole', 'bastard',
  'dick', 'dickhead', 'pussy', 'cunt', 'slut', 'whore', 'nigger', 'nigga', 'faggot', 'retard', 'jackass',
  // Tagalog
  'putangina', 'tangina', 'putanginamo', 'tanginamo', 'putang ina', 'tang ina', 'puta', 'gago', 'gaga', 'ulol', 'olol', 'tarantado',
  'tarantada', 'bobo', 'tanga', 'pakyu', 'pakshet', 'kupal', 'burat', 'tite', 'titi', 'puke', 'kantot',
  'jakol', 'hinayupak', 'punyeta', 'inutil',
  // Cebuano
  'yawa', 'pisti', 'piste', 'giatay', 'bilat', 'oten', 'iyot', 'bayot', 'libog', 'animal ka', 'pesteng yawa',
];

// Common suffixes so "fucking", "bitches", "shitty" are caught without listing every form.
const SUFFIXES = '(?:s|es|ed|er|ers|ing|in|y|a)?';

const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', '@': 'a', $: 's', '!': 'i', '|': 'i', v: 'u' };

const normalize = (text) =>
  String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[01345678@$!|v]/g, (ch) => LEET[ch] ?? ch)
    .replace(/\*/g, '');

// Each letter may repeat ("yawaaa", "fuuuck"); multi-word phrases allow any spacing between words.
const toPattern = (word) =>
  word
    .split(' ')
    .map((part) => part.split('').map((ch) => `${ch}+`).join(''))
    .join('[^a-z]*');

const WORD_REGEX = new RegExp(`(^|[^a-z])(?:${BLOCKED_WORDS.map(toPattern).join('|')})${SUFFIXES}(?=$|[^a-z])`, 'i');
// Catches spaced-out spellings like "p u t a" or "f.u.c.k": single letters separated by spaces/punctuation.
const SPACED_LETTERS = /(?:^|[^a-z])((?:[a-z][^a-z0-9]){2,}[a-z])(?=$|[^a-z])/g;

const containsProfanity = (text) => {
  if (!text) return false;
  const normalized = normalize(text);
  if (WORD_REGEX.test(normalized)) return true;
  for (const match of normalized.matchAll(SPACED_LETTERS)) {
    const joined = match[1].replace(/[^a-z]/g, '');
    if (WORD_REGEX.test(joined)) return true;
  }
  return false;
};

module.exports = { containsProfanity };
