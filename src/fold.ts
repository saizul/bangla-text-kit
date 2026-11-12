/**
 * Search folding: map spelling variants that people mix up to one form, so
 * that a search for "শিক্ষক" also finds "সিক্ষক" or "শীক্ষক".
 *
 * Folding is lossy and meant for building search keys and comparing, never
 * for display.
 */

import { segmentGraphemesBuiltin } from './grapheme.js';
import { toLatinDigits } from './digits.js';
import { normalize } from './normalize.js';

export interface FoldOptions {
  /** ী -> ি and ঈ -> ই. Default true. */
  ii?: boolean;
  /** ূ -> ু and ঊ -> উ. Default true. */
  uu?: boolean;
  /** শ and ষ -> স. Default true. */
  sibilants?: boolean;
  /** ণ -> ন. Default true. */
  nasals?: boolean;
  /** য -> জ (the two sound the same in Bangla). Default false. */
  ja?: boolean;
  /** ড় and ঢ় -> র. Default false. */
  ra?: boolean;
  /** Remove candrabindu (ঁ). Default false. */
  candrabindu?: boolean;
  /** ৎ -> ত. Default true. */
  khandaTa?: boolean;
  /** ঋ / ৃ -> রি / ্রি (ঋষি and রিষি match). Default false. */
  vocalicR?: boolean;
  /** Remove ZWJ and ZWNJ. Default true. */
  joiners?: boolean;
  /** Bangla digits -> ASCII digits. Default true. */
  digits?: boolean;
  /** Lower-case Latin letters. Default true. */
  lowercase?: boolean;
  /** Collapse runs of whitespace into one space and trim. Default true. */
  whitespace?: boolean;
}

export const DEFAULT_FOLD_OPTIONS: Required<FoldOptions> = {
  ii: true,
  uu: true,
  sibilants: true,
  nasals: true,
  ja: false,
  ra: false,
  candrabindu: false,
  khandaTa: true,
  vocalicR: false,
  joiners: true,
  digits: true,
  lowercase: true,
  whitespace: true,
};

function buildTable(o: Required<FoldOptions>): Map<string, string> {
  const t = new Map<string, string>();
  if (o.ii) {
    t.set('\u09C0', '\u09BF'); // ী -> ি
    t.set('\u0988', '\u0987'); // ঈ -> ই
  }
  if (o.uu) {
    t.set('\u09C2', '\u09C1'); // ূ -> ু
    t.set('\u098A', '\u0989'); // ঊ -> উ
  }
  if (o.sibilants) {
    t.set('\u09B6', '\u09B8'); // শ -> স
    t.set('\u09B7', '\u09B8'); // ষ -> স
  }
  if (o.nasals) t.set('\u09A3', '\u09A8'); // ণ -> ন
  if (o.candrabindu) t.set('\u0981', '');
  if (o.khandaTa) t.set('\u09CE', '\u09A4'); // ৎ -> ত
  if (o.vocalicR) {
    t.set('\u098B', '\u09B0\u09BF'); // ঋ -> রি
    t.set('\u09C3', '\u09CD\u09B0\u09BF'); // ৃ -> ্রি
  }
  if (o.joiners) {
    t.set('\u200C', '');
    t.set('\u200D', '');
  }
  return t;
}

function foldNormalized(text: string, o: Required<FoldOptions>, table: Map<string, string>): string {
  let s = text;
  if (o.ra) s = s.replace(/[\u09A1\u09A2]\u09BC/gu, '\u09B0');
  // য -> জ, but য় (YA + NUKTA) is a different letter and stays
  if (o.ja) s = s.replace(/\u09AF(?!\u09BC)/gu, '\u099C');
  let out = '';
  for (const ch of s) out += table.get(ch) ?? ch;
  if (o.digits) out = toLatinDigits(out);
  if (o.lowercase) out = out.toLowerCase();
  if (o.whitespace) out = out.replace(/\s+/gu, ' ').trim();
  return out;
}

/**
 * Builds a search key: normalizes, then folds the configured variants.
 * `fold('শিক্ষক') === fold('সিক্ষক')`.
 */
export function fold(text: string, options: FoldOptions = {}): string {
  const o = { ...DEFAULT_FOLD_OPTIONS, ...options };
  return foldNormalized(normalize(text, { joiners: o.joiners ? 'remove' : 'clean' }), o, buildTable(o));
}

/** True when the two strings are equal after folding. */
export function foldedEquals(a: string, b: string, options: FoldOptions = {}): boolean {
  return fold(a, options) === fold(b, options);
}

export interface FoldedText {
  /** The folded text. */
  text: string;
  /** For every UTF-16 unit of `text`, the offset in the original where its cluster starts. */
  offsets: number[];
  /** For every UTF-16 unit of `text`, the offset in the original where its cluster ends. */
  ends: number[];
  /** The original text. */
  source: string;
}

/**
 * Folds `text` and keeps a map back to the original, so search hits in the
 * folded text can be highlighted in the original. Folding is done per
 * grapheme cluster; whitespace is collapsed but not trimmed.
 */
export function foldWithOffsets(text: string, options: FoldOptions = {}): FoldedText {
  const o = { ...DEFAULT_FOLD_OPTIONS, ...options, whitespace: false };
  const table = buildTable(o);
  let out = '';
  const offsets: number[] = [];
  const ends: number[] = [];
  let pos = 0;
  let lastWasSpace = false;
  for (const cluster of segmentGraphemesBuiltin(text)) {
    const isSpace = /^\s+$/u.test(cluster);
    if (isSpace && options.whitespace !== false) {
      if (!lastWasSpace) {
        out += ' ';
        offsets.push(pos);
        ends.push(pos + cluster.length);
      }
      lastWasSpace = true;
      pos += cluster.length;
      continue;
    }
    lastWasSpace = false;
    const folded = foldNormalized(
      normalize(cluster, { joiners: o.joiners ? 'remove' : 'clean', vowelSigns: false }),
      o,
      table,
    );
    for (let k = 0; k < folded.length; k++) {
      offsets.push(pos);
      ends.push(pos + cluster.length);
    }
    out += folded;
    pos += cluster.length;
  }
  return { text: out, offsets, ends, source: text };
}

export interface Match {
  /** Offsets in the original text. */
  start: number;
  end: number;
  /** The matched part of the original text. */
  text: string;
}

/**
 * Finds every occurrence of `query` in `text` after folding both, and
 * returns the positions in the original text:
 * `findAll('সে শিক্ষক, তিনি সিক্ষক', 'শিক্ষক')` finds both words.
 */
export function findAll(text: string, query: string, options: FoldOptions = {}): Match[] {
  const needle = fold(query, options);
  if (!needle) return [];
  const hay = foldWithOffsets(text, options);
  const matches: Match[] = [];
  let from = 0;
  for (;;) {
    const at = hay.text.indexOf(needle, from);
    if (at < 0) break;
    const start = hay.offsets[at] as number;
    // a match that ends inside a cluster is widened to the whole cluster
    const end = hay.ends[at + needle.length - 1] as number;
    matches.push({ start, end, text: text.slice(start, end) });
    from = at + Math.max(needle.length, 1);
  }
  return matches;
}

/** True when the folded `text` contains the folded `query`. */
export function includesFolded(text: string, query: string, options: FoldOptions = {}): boolean {
  const needle = fold(query, options);
  return needle === '' || fold(text, options).includes(needle);
}

/**
 * Returns a predicate for filtering lists, folding the query once:
 * `items.filter(createMatcher('ঢাকা'))`.
 */
export function createMatcher(query: string, options: FoldOptions = {}): (candidate: string) => boolean {
  const needle = fold(query, options);
  return (candidate) => needle === '' || fold(candidate, options).includes(needle);
}
