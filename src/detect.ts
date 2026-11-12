/**
 * Script detection: how much of a text is written in Bangla script.
 */

import { isBanglaLetterOrMark } from './chars.js';

export interface ScriptStats {
  /** Bangla letters and signs (digits excluded unless `countDigits`). */
  bangla: number;
  /** Latin letters. */
  latin: number;
  /** Letters of any other script. */
  other: number;
  /** Bangla digits. */
  banglaDigits: number;
  /** The sum the ratio is computed over. */
  total: number;
  /** bangla / total, 0 when total is 0. */
  banglaRatio: number;
}

export interface DetectOptions {
  /** Count Bangla digits as Bangla and ASCII digits as Latin. Default false. */
  countDigits?: boolean;
}

const LETTER = /[\p{L}\p{M}]/u;
const LATIN = /\p{Script=Latin}/u;

/** Counts characters per script. Whitespace, punctuation and symbols are ignored. */
export function scriptStats(text: string, options: DetectOptions = {}): ScriptStats {
  const { countDigits = false } = options;
  let bangla = 0;
  let latin = 0;
  let other = 0;
  let banglaDigits = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0) as number;
    if (cp >= 0x09e6 && cp <= 0x09ef) {
      banglaDigits++;
      if (countDigits) bangla++;
      continue;
    }
    if (isBanglaLetterOrMark(cp)) {
      bangla++;
      continue;
    }
    if (cp === 0x200c || cp === 0x200d) continue;
    if (countDigits && cp >= 0x30 && cp <= 0x39) {
      latin++;
      continue;
    }
    if (!LETTER.test(ch)) continue;
    if (LATIN.test(ch)) latin++;
    else other++;
  }
  const total = bangla + latin + other;
  return { bangla, latin, other, banglaDigits, total, banglaRatio: total === 0 ? 0 : bangla / total };
}

/** Share of letters that are Bangla, from 0 to 1. */
export function banglaRatio(text: string, options: DetectOptions = {}): number {
  return scriptStats(text, options).banglaRatio;
}

export interface IsBanglaOptions extends DetectOptions {
  /** Minimum ratio. Default 0.5. */
  threshold?: number;
  /** Minimum number of counted letters before deciding. Default 1. */
  minLetters?: number;
}

/** True when at least `threshold` of the letters are Bangla. */
export function isBangla(text: string, options: IsBanglaOptions = {}): boolean {
  const { threshold = 0.5, minLetters = 1 } = options;
  const stats = scriptStats(text, options);
  return stats.total >= minLetters && stats.banglaRatio >= threshold;
}

export type DominantScript = 'bangla' | 'latin' | 'other' | 'none';

/** The script with the most letters, `mixed` situations resolved by count. */
export function dominantScript(text: string): DominantScript {
  const s = scriptStats(text);
  if (s.total === 0) return 'none';
  if (s.bangla >= s.latin && s.bangla >= s.other) return 'bangla';
  return s.latin >= s.other ? 'latin' : 'other';
}

/** True when the text contains at least one Bangla letter. */
export function containsBangla(text: string): boolean {
  for (const ch of text) if (isBanglaLetterOrMark(ch.codePointAt(0) as number)) return true;
  return false;
}
