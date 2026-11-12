/**
 * A light, rule-based Bangla stemmer.
 *
 * It strips common inflections (plural markers, case endings, classifiers,
 * emphatic particles and, optionally, verb endings) from the end of a word.
 * It does not use a dictionary, so stems are not always real words; the goal
 * is that inflected forms of one word map to the same key for search and
 * counting: ছেলে, ছেলের, ছেলেরা and ছেলেদের all become ছেল.
 */

import { normalize } from './normalize.js';

// Nominal suffixes, longest first after sorting below.
const NOMINAL = [
  'গুলোকে',
  'গুলোতে',
  'গুলোর',
  'গুলোই',
  'গুলো',
  'গুলিকে',
  'গুলির',
  'গুলি',
  'গুলা',
  'দেরকে',
  'দেরও',
  'দেরই',
  'দের',
  'রাও',
  'রাই',
  'রা',
  'টিকে',
  'টাকে',
  'টির',
  'টার',
  'টাই',
  'টিই',
  'টাও',
  'টিও',
  'টিতে',
  'টাতে',
  'টা',
  'টি',
  'খানা',
  'খানি',
  'টুকু',
  'সমূহের',
  'সমূহ',
  'গণের',
  'গণ',
  'বৃন্দ',
  'মালা',
  'কেও',
  'কেই',
  'কে',
  'তেও',
  'তেই',
  'তে',
  'য\u09BCেরও',
  'য\u09BCের',
  'য\u09BCও',
  'য\u09BC',
  'েরও',
  'েরই',
  'ের',
  'েও',
  'েই',
  'ে',
  'র',
];

const VERBAL = [
  'েছিলাম',
  'েছিলেন',
  'েছিলে',
  'েছিল',
  'ছিলাম',
  'ছিলেন',
  'ছিলে',
  'ছিল',
  'চ্ছিলাম',
  'চ্ছিলেন',
  'চ্ছিল',
  'চ্ছেন',
  'চ্ছে',
  'চ্ছি',
  'েছেন',
  'েছে',
  'েছি',
  'ছেন',
  'ছে',
  'ছি',
  'লাম',
  'লেন',
  'বেন',
  'বে',
  'বো',
  'তাম',
  'তেন',
  'ুন',
  'েন',
];

function prepare(list: string[]): string[] {
  return [...new Set(list.map((s) => normalize(s)))].sort((a, b) => b.length - a.length);
}

const NOMINAL_SUFFIXES = prepare(NOMINAL);
const ALL_SUFFIXES = prepare([...NOMINAL, ...VERBAL]);

export interface StemOptions {
  /** Also strip verb endings (করেছিলাম -> কর). Default true. */
  verbs?: boolean;
  /** Shortest stem kept, in code points. Default 2. */
  minLength?: number;
  /** How many suffixes may be stripped one after another. Default 2. */
  maxPasses?: number;
}

function codePointLength(s: string): number {
  let n = 0;
  for (const _ of s) n++;
  return n;
}

export function stem(word: string, options: StemOptions = {}): string {
  const { verbs = true, minLength = 2, maxPasses = 2 } = options;
  const suffixes = verbs ? ALL_SUFFIXES : NOMINAL_SUFFIXES;
  let current = normalize(word.trim());
  if (!/[\u0980-\u09FF]/u.test(current)) return current;
  for (let pass = 0; pass < maxPasses; pass++) {
    let stripped = false;
    for (const suffix of suffixes) {
      if (!current.endsWith(suffix)) continue;
      const rest = current.slice(0, current.length - suffix.length);
      // never leave a dangling virama or nukta, and keep a minimum stem
      if (codePointLength(rest) < minLength || /[\u09CD\u09BC]$/u.test(rest)) continue;
      current = rest;
      stripped = true;
      break;
    }
    if (!stripped) break;
  }
  return current;
}

/** Stems every word of a list. */
export function stemAll(words: readonly string[], options: StemOptions = {}): string[] {
  return words.map((w) => stem(w, options));
}
