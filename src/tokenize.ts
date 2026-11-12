/**
 * Word tokenizer for Bangla and mixed Bangla/English text.
 *
 * A word is a run of letters, combining marks, digits and zero-width
 * joiners, so `কি`, `ক্ষমা`, `র\u200D্যাব` and `১০টা` stay whole. Hyphens and
 * apostrophes inside a word are kept (`সাদা-কালো`, `don't`) unless
 * `splitHyphens` is set. Numbers keep their decimal point and grouping
 * commas (`১২,৫০০.৭৫`).
 */

import { normalize, type NormalizeOptions } from './normalize.js';

export type TokenType = 'word' | 'number' | 'punctuation' | 'whitespace' | 'symbol';

export interface Token {
  text: string;
  type: TokenType;
  /** UTF-16 offset in the (normalized, if requested) input. */
  start: number;
  end: number;
}

export interface TokenizeOptions {
  /** Run `normalize()` first. Offsets then refer to the normalized text. Default false. */
  normalize?: boolean | NormalizeOptions;
  /** Split `সাদা-কালো` into two words. Default false. */
  splitHyphens?: boolean;
}

const WORD_CHAR = /[\p{L}\p{M}\p{N}\u200C\u200D]/u;
const DIGIT = /[\p{Nd}]/u;
const WHITESPACE = /\s/u;
const PUNCT = /[\p{P}\u0964\u0965]/u;
const INNER_JOINERS = new Set(['-', '\u2010', '\u2011', "'", '\u2019']);

function charAt(text: string, i: number): string {
  const cp = text.codePointAt(i);
  return cp === undefined ? '' : String.fromCodePoint(cp);
}

export function tokenize(input: string, options: TokenizeOptions = {}): Token[] {
  const text =
    options.normalize === undefined || options.normalize === false
      ? input
      : normalize(input, options.normalize === true ? {} : options.normalize);
  const tokens: Token[] = [];
  let i = 0;
  while (i < text.length) {
    const ch = charAt(text, i);
    const start = i;
    if (WORD_CHAR.test(ch)) {
      let j = i;
      for (;;) {
        const c = charAt(text, j);
        if (c && WORD_CHAR.test(c)) {
          j += c.length;
          continue;
        }
        const next = charAt(text, j + c.length);
        const prev = charAt(text, j - 1);
        // decimal point or grouping comma between digits
        if ((c === '.' || c === ',') && DIGIT.test(prev) && next && DIGIT.test(next)) {
          j += c.length;
          continue;
        }
        // hyphen or apostrophe inside a word
        if (!options.splitHyphens && INNER_JOINERS.has(c) && next && WORD_CHAR.test(next) && prev) {
          j += c.length;
          continue;
        }
        break;
      }
      const word = text.slice(i, j);
      const isNumber = /^[\p{Nd}.,]+$/u.test(word);
      tokens.push({ text: word, type: isNumber ? 'number' : 'word', start, end: j });
      i = j;
      continue;
    }
    if (WHITESPACE.test(ch)) {
      let j = i;
      while (j < text.length && WHITESPACE.test(charAt(text, j))) j += charAt(text, j).length;
      tokens.push({ text: text.slice(i, j), type: 'whitespace', start, end: j });
      i = j;
      continue;
    }
    const type: TokenType = PUNCT.test(ch) ? 'punctuation' : 'symbol';
    let j = i + ch.length;
    if (type === 'symbol') {
      // keep emoji modifiers, variation selectors and ZWJ sequences together
      while (j < text.length) {
        const c = charAt(text, j);
        if (/[\u200D\uFE0F\u{1F3FB}-\u{1F3FF}]/u.test(c)) {
          j += c.length;
          if (c === '\u200D' && j < text.length) j += charAt(text, j).length;
          continue;
        }
        break;
      }
    }
    tokens.push({ text: text.slice(i, j), type, start, end: j });
    i = j;
  }
  return tokens;
}

export interface WordsOptions extends TokenizeOptions {
  /** Include number tokens. Default true. */
  numbers?: boolean;
  /** Lower-case Latin letters. Default false. */
  lowercase?: boolean;
}

/** The words (and by default numbers) of a text, as strings. */
export function words(text: string, options: WordsOptions = {}): string[] {
  const { numbers = true, lowercase = false } = options;
  return tokenize(text, options)
    .filter((t) => t.type === 'word' || (numbers && t.type === 'number'))
    .map((t) => (lowercase ? t.text.toLowerCase() : t.text));
}

/** Number of words, not counting numbers or punctuation. */
export function wordCount(text: string): number {
  return tokenize(text).filter((t) => t.type === 'word').length;
}
