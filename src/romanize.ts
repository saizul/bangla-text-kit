/**
 * Bangla to Latin script.
 *
 * Two schemes:
 *
 * - `simple` (default): plain ASCII the way Bangladeshis write Bangla in
 *   Latin letters, for slugs, URLs, usernames and search keys.
 *   `romanize('আমার সোনার বাংলা')` -> `amar sonar bangla`. The inherent vowel
 *   is written `o` and dropped at the end of a word.
 * - `iso`: ISO 15919 style transliteration with diacritics, reversible in
 *   principle and suited to libraries and linguistics: `বাংলা` -> `bāṁlā`.
 *   The inherent vowel is always written `a`.
 */

import { normalize } from './normalize.js';

export type RomanizeScheme = 'simple' | 'iso';

export interface RomanizeOptions {
  scheme?: RomanizeScheme;
  /** `simple` only: drop the inherent vowel at the end of a word. Default true. */
  dropFinalVowel?: boolean;
}

type Table = Record<string, string>;

const SIMPLE_CONSONANTS: Table = {
  ক: 'k',
  খ: 'kh',
  গ: 'g',
  ঘ: 'gh',
  ঙ: 'ng',
  চ: 'ch',
  ছ: 'chh',
  জ: 'j',
  ঝ: 'jh',
  ঞ: 'n',
  ট: 't',
  ঠ: 'th',
  ড: 'd',
  ঢ: 'dh',
  ণ: 'n',
  ত: 't',
  থ: 'th',
  দ: 'd',
  ধ: 'dh',
  ন: 'n',
  প: 'p',
  ফ: 'f',
  ব: 'b',
  ভ: 'bh',
  ম: 'm',
  য: 'j',
  র: 'r',
  ল: 'l',
  শ: 'sh',
  ষ: 'sh',
  স: 's',
  হ: 'h',
  ড\u09BC: 'r',
  ঢ\u09BC: 'rh',
  য\u09BC: 'y',
  ৎ: 't',
  ৰ: 'r',
  ৱ: 'w',
};

const ISO_CONSONANTS: Table = {
  ক: 'k',
  খ: 'kh',
  গ: 'g',
  ঘ: 'gh',
  ঙ: 'ṅ',
  চ: 'c',
  ছ: 'ch',
  জ: 'j',
  ঝ: 'jh',
  ঞ: 'ñ',
  ট: 'ṭ',
  ঠ: 'ṭh',
  ড: 'ḍ',
  ঢ: 'ḍh',
  ণ: 'ṇ',
  ত: 't',
  থ: 'th',
  দ: 'd',
  ধ: 'dh',
  ন: 'n',
  প: 'p',
  ফ: 'ph',
  ব: 'b',
  ভ: 'bh',
  ম: 'm',
  য: 'y',
  র: 'r',
  ল: 'l',
  শ: 'ś',
  ষ: 'ṣ',
  স: 's',
  হ: 'h',
  ড\u09BC: 'ṛ',
  ঢ\u09BC: 'ṛh',
  য\u09BC: 'ẏ',
  ৎ: 't',
  ৰ: 'r',
  ৱ: 'v',
};

const SIMPLE_VOWELS: Table = {
  অ: 'o',
  আ: 'a',
  ই: 'i',
  ঈ: 'i',
  উ: 'u',
  ঊ: 'u',
  ঋ: 'ri',
  ৠ: 'ri',
  ঌ: 'li',
  ৡ: 'li',
  এ: 'e',
  ঐ: 'oi',
  ও: 'o',
  ঔ: 'ou',
};
const ISO_VOWELS: Table = {
  অ: 'a',
  আ: 'ā',
  ই: 'i',
  ঈ: 'ī',
  উ: 'u',
  ঊ: 'ū',
  ঋ: 'r̥',
  ৠ: 'r̥̄',
  ঌ: 'l̥',
  ৡ: 'l̥̄',
  এ: 'ē',
  ঐ: 'ai',
  ও: 'ō',
  ঔ: 'au',
};
const SIMPLE_SIGNS: Table = {
  'া': 'a',
  'ি': 'i',
  'ী': 'i',
  'ু': 'u',
  'ূ': 'u',
  'ৃ': 'ri',
  'ৄ': 'ri',
  'ে': 'e',
  'ৈ': 'oi',
  'ো': 'o',
  'ৌ': 'ou',
  'ৢ': 'li',
  'ৣ': 'li',
  '\u09D7': 'ou',
};
const ISO_SIGNS: Table = {
  'া': 'ā',
  'ি': 'i',
  'ী': 'ī',
  'ু': 'u',
  'ূ': 'ū',
  'ৃ': 'r̥',
  'ৄ': 'r̥̄',
  'ে': 'ē',
  'ৈ': 'ai',
  'ো': 'ō',
  'ৌ': 'au',
  'ৢ': 'l̥',
  'ৣ': 'l̥̄',
  '\u09D7': 'au',
};
const SIMPLE_MARKS: Table = { 'ং': 'ng', 'ঃ': 'h', 'ঁ': '', ঽ: '' };
const ISO_MARKS: Table = { 'ং': 'ṁ', 'ঃ': 'ḥ', 'ঁ': 'm̐', ঽ: "'" };
const PUNCT: Table = { '।': '.', '॥': '.', '৳': 'Tk' };

const VIRAMA = '্';
const NUKTA = '\u09BC';
const DIGITS = '০১২৩৪৫৬৭৮৯';

function isLetter(ch: string | undefined): boolean {
  return ch !== undefined && /[ঀ-৿]/u.test(ch) && !DIGITS.includes(ch);
}

/** Converts Bangla script to Latin. Non-Bangla characters pass through. */
export function romanize(text: string, options: RomanizeOptions = {}): string {
  const scheme = options.scheme ?? 'simple';
  const dropFinal = scheme === 'simple' && (options.dropFinalVowel ?? true);
  const consonants = scheme === 'iso' ? ISO_CONSONANTS : SIMPLE_CONSONANTS;
  const vowels = scheme === 'iso' ? ISO_VOWELS : SIMPLE_VOWELS;
  const signs = scheme === 'iso' ? ISO_SIGNS : SIMPLE_SIGNS;
  const marks = scheme === 'iso' ? ISO_MARKS : SIMPLE_MARKS;
  const inherent = scheme === 'iso' ? 'a' : 'o';

  // nukta letters as single units, joiners dropped
  const chars = Array.from(normalize(text, { joiners: 'remove' }));
  let out = '';
  let afterVirama = false; // the consonant being read is the second part of a conjunct
  for (let i = 0; i < chars.length; i++) {
    let ch = chars[i] as string;
    if (chars[i + 1] === NUKTA && consonants[ch + NUKTA] !== undefined) {
      ch += NUKTA;
      i++;
    }
    const cons = consonants[ch];
    if (cons !== undefined) {
      const inConjunct = afterVirama;
      afterVirama = false;
      out += cons;
      if (ch === 'ৎ') continue; // khanda ta never carries a vowel
      const next = chars[i + 1];
      if (next === VIRAMA) {
        i++;
        // ya-phala and ba-phala in the simple scheme read better as y / w
        const after = chars[i + 1];
        if (scheme === 'simple' && after === 'য' && chars[i + 2] !== NUKTA) {
          out += 'y';
          i++;
          addVowelAfter(i, true);
        } else if (scheme === 'simple' && after === 'ব') {
          out += 'w';
          i++;
          addVowelAfter(i, true);
        } else {
          afterVirama = true;
        }
        continue;
      }
      addVowelAfter(i, inConjunct);
      continue;
    }
    afterVirama = false;
    if (vowels[ch] !== undefined) {
      out += vowels[ch];
      continue;
    }
    if (marks[ch] !== undefined) {
      out += marks[ch];
      continue;
    }
    if (DIGITS.includes(ch)) {
      out += String(DIGITS.indexOf(ch));
      continue;
    }
    if (PUNCT[ch] !== undefined) {
      out += PUNCT[ch];
      continue;
    }
    if (ch === VIRAMA || ch === NUKTA) continue;
    out += ch;
  }
  return scheme === 'simple' ? out.replace(/([a-z])\1{2,}/g, '$1$1') : out;

  // Appends the vowel that follows the consonant ending at index `at`: its
  // vowel sign, or the inherent vowel. In the simple scheme the inherent
  // vowel is silent at the end of a word, except after a conjunct (সত্য is
  // "sotyo", not "soty").
  function addVowelAfter(at: number, conjunct: boolean): void {
    const next = chars[at + 1];
    if (next !== undefined && signs[next] !== undefined) {
      out += signs[next];
      chars.splice(at + 1, 1); // marks after the sign are handled by the main loop
      return;
    }
    if (dropFinal && !conjunct && !isLetter(next)) return;
    out += inherent;
  }
}

/**
 * A URL slug from Bangla (or mixed) text: `slugify('ঢাকা শহরের খবর')` ->
 * `dhaka shohorer khobor` -> `dhaka-shohorer-khobor`.
 */
export function slugify(text: string, separator = '-'): string {
  return romanize(text)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, separator)
    .replace(new RegExp(`^${escapeRegExp(separator)}+|${escapeRegExp(separator)}+$`, 'g'), '');
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
