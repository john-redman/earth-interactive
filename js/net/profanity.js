// Display-name rules shared by the browser and the API Worker (server/src/profanity.js re-exports this file).
// Pure functions, no DOM, no Node APIs, so it runs in both. Keep it that way.
//
// How the filter works:
//  1. normalise: Unicode NFKD, drop accents and invisible characters, lower-case, map look-alike letters
//     from other scripts (Cyrillic а, Greek ο …) and leetspeak (0→o, 1→i or l, 3→e, 4→a, 5→s, @→a, $→s …).
//  2. split on separators (space, _, -, . …) into tokens; a run of tiny tokens ("f u c k", "fu.ck") is
//     also checked joined together.
//  3. STRONG words match anywhere inside a token ("xXfuckXx"), after ALLOW words are blanked out
//     ("Scunthorpe", "therapist"). Short words that hide inside innocent ones ("ass" in "class") are in
//     WHOLE and only match a whole token (plus a plural s / es).
//  4. every letter may repeat ("fuuuuck"), so repeated characters don't get past it.
// It is a speed bump, not a guarantee — moderation (docs/backend.md) handles the rest.

export const NAME_MIN = 3;
export const NAME_MAX = 20;

// Match anywhere inside a token. Only words that are (almost) never part of an innocent word.
const STRONG = [
  'fuck', 'shit', 'cunt', 'bitch', 'whore', 'slut', 'skank', 'wank', 'twat', 'bollock', 'bastard', 'bugger',
  'piss', 'dildo', 'jizz', 'cumshot', 'blowjob', 'handjob', 'rimjob', 'porn', 'hentai', 'milf', 'boob', 'penis',
  'vagina', 'pussy', 'asshole', 'arsehole', 'dickhead', 'dumbass', 'jackass', 'asshat', 'asswipe', 'cocksucker',
  'nigger', 'nigga', 'faggot', 'tranny', 'shemale', 'retard', 'spastic', 'wetback', 'towelhead', 'raghead',
  'darkie', 'golliwog', 'rapist', 'raping', 'molest', 'incest', 'paedo', 'pedophile', 'hitler', 'kkk',
];

// Match only as a whole token (optionally plural): these hide inside ordinary words and place names.
const WHOLE = [
  'ass', 'arse', 'cum', 'tit', 'titty', 'titties', 'dick', 'cock', 'prick', 'fag', 'sex', 'anal', 'anus',
  'semen', 'rape', 'raped', 'shag', 'crap', 'hoe', 'thot', 'nonce', 'pedo', 'nazi', 'heil', 'negro', 'nig',
  'coon', 'spic', 'spick', 'kike', 'chink', 'gook', 'paki', 'jap', 'wop', 'dyke', 'homo', 'tard', 'spaz',
];

// Innocent words that contain a STRONG word. Blanked out before the STRONG check.
const ALLOW = [
  'scunthorpe', 'peniston', 'therapist', 'matsushita', 'shitake', 'pissarro', 'swank', 'snigger',
  'retardant', 'pussycat', 'pussywillow', 'class', 'essex', 'sussex', 'assassin', 'passion', 'bassist',
];

// Names nobody should be able to claim.
const RESERVED = ['admin', 'administrator', 'moderator', 'mod', 'earthinteractive', 'system', 'anonymous', 'null', 'undefined'];

// Letters that survive NFKD unchanged but read as Latin letters.
const FOLD = {
  'ß': 'ss', 'æ': 'ae', 'œ': 'oe', 'ø': 'o', 'đ': 'd', 'ð': 'd', 'ł': 'l', 'ı': 'i', 'þ': 'th', 'ħ': 'h',
  // Cyrillic look-alikes
  'а': 'a', 'в': 'b', 'е': 'e', 'ё': 'e', 'к': 'k', 'м': 'm', 'н': 'h', 'о': 'o', 'р': 'p', 'с': 'c', 'т': 't',
  'у': 'y', 'х': 'x', 'ѕ': 's', 'і': 'i', 'ї': 'i', 'ј': 'j', 'ԁ': 'd', 'ɡ': 'g', 'ս': 'u',
  // Greek look-alikes
  'α': 'a', 'β': 'b', 'ε': 'e', 'η': 'n', 'ι': 'i', 'κ': 'k', 'ν': 'v', 'ο': 'o', 'ρ': 'p', 'τ': 't', 'υ': 'u', 'χ': 'x',
};
// Leetspeak. 1 | ! are ambiguous (i or l): both readings are checked.
const LEET = { '0': 'o', '3': 'e', '4': 'a', '5': 's', '6': 'g', '7': 't', '8': 'b', '9': 'g', '@': 'a', '$': 's', '+': 't', '€': 'e', '¢': 'c', '£': 'l' };
const AMBIGUOUS = /[1|!]/g;

// "fuck" → /f+u+c+k+/ so any letter may repeat
const loose = w => [...w].map(c => c + '+').join('');
const STRONG_RE = new RegExp(STRONG.map(loose).join('|'));
const WHOLE_RE = new RegExp(`^(?:${WHOLE.map(loose).join('|')})(?:e?s+)?$`);

/** Lower-case, accent-free, look-alikes folded; leetspeak not yet applied. */
export function fold(str) {
  return String(str ?? '')
    .normalize('NFKD')
    .replace(/[\p{M}\p{Cf}]/gu, '')      // accents, zero-width joiners, direction marks
    .toLowerCase()
    .replace(/[^\x00-\x7f]/g, c => FOLD[c] ?? c);
}

/** Token lists to check: one per reading of the ambiguous leet characters. */
export function skeletons(str) {
  const base = fold(str);
  return ['i', 'l'].map(amb => base
    .replace(AMBIGUOUS, amb)
    .replace(/[0-9@$+€¢£]/g, c => LEET[c] ?? ' ')
    .split(/[^a-z]+/)
    .filter(Boolean));
}

/** Tokens plus each run of tiny tokens joined ("f u c k" → "fuck"). */
function candidates(tokens) {
  const out = [...tokens];
  let run = [];
  for (const t of [...tokens, '']) {
    if (t && t.length <= 2) { run.push(t); continue; }
    if (run.length > 1) out.push(run.join(''));
    run = [];
  }
  return out;
}

function tokenIsProfane(tok) {
  if (WHOLE_RE.test(tok)) return true;
  let t = tok;
  for (const a of ALLOW) t = t.split(a).join('#');
  return STRONG_RE.test(t);
}

/** True when the text contains an obscenity or slur (after normalisation). */
export function isProfane(str) {
  return skeletons(str).some(tokens => candidates(tokens).some(tokenIsProfane));
}

/** Trim and collapse whitespace; NFC so the same name is stored the same way. */
export function cleanName(name) {
  return String(name ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
}

/** Case/accent/separator-insensitive key: "John_R" and "john r" can't both be claimed. */
export function nameKey(name) {
  return fold(cleanName(name)).replace(/[\s_-]+/g, '');
}

const NAME_CHARS = /^[\p{Script=Latin}0-9 _-]+$/u;

/**
 * Why a display name is not acceptable, or null if it is fine.
 * Codes: 'short' | 'long' | 'chars' | 'profane' | 'reserved'
 */
export function nameProblem(name) {
  const n = cleanName(name);
  const len = [...n].length;
  if (len < NAME_MIN) return 'short';
  if (len > NAME_MAX) return 'long';
  if (!NAME_CHARS.test(n) || !/\p{L}/u.test(n)) return 'chars';
  if (isProfane(n)) return 'profane';
  const key = nameKey(n);
  if (RESERVED.some(r => key === r || key.startsWith(r) && /^\d*$/.test(key.slice(r.length)))) return 'reserved';
  return null;
}

/** Short UI copy for each problem code (also used for server errors). */
export const NAME_MESSAGES = {
  short: `Use at least ${NAME_MIN} characters.`,
  long: `Use at most ${NAME_MAX} characters.`,
  chars: 'Use letters, numbers, spaces, _ or - only.',
  profane: 'Pick a different name.',
  reserved: 'That name is reserved. Pick another.',
  taken: 'Someone already has that name. Try another.',
};
