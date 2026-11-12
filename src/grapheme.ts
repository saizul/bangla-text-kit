/**
 * Grapheme clusters (user-perceived characters).
 *
 * `কি` is two code points but one character on screen, and `ক্ষ` is three
 * code points that render as one conjunct. String `.length` and `.slice()`
 * cut these apart; the functions here do not.
 *
 * Two engines:
 * - `intl` uses `Intl.Segmenter`. Its result depends on the ICU version that
 *   ships with Node: since Unicode 15.1 (Node 22 and later) conjuncts such as
 *   ক্ষ are one cluster (rule GB9c); older versions split them after the
 *   virama.
 * - `builtin` is a small segmenter in this package that follows the extended
 *   grapheme cluster rules relevant to Bangla text, including GB9c, so the
 *   result is the same on every Node version. It also handles CRLF, emoji
 *   ZWJ sequences, skin tone modifiers and flags.
 *
 * `auto` (default) uses `intl` when available and `builtin` otherwise.
 */

import { CP, isFullConsonant } from './chars.js';

export type SegmenterEngine = 'auto' | 'intl' | 'builtin';

export interface GraphemeOptions {
  engine?: SegmenterEngine;
  /** Builtin engine only: keep virama conjuncts (ক্ষ) together. Default true. */
  conjuncts?: boolean;
}

interface IntlSegmenterLike {
  segment(input: string): Iterable<{ segment: string }>;
}

let cachedSegmenter: IntlSegmenterLike | null | undefined;

function intlSegmenter(): IntlSegmenterLike | null {
  if (cachedSegmenter !== undefined) return cachedSegmenter;
  const Segmenter = (Intl as unknown as { Segmenter?: new (l: string, o: object) => IntlSegmenterLike })
    .Segmenter;
  cachedSegmenter = typeof Segmenter === 'function' ? new Segmenter('bn', { granularity: 'grapheme' }) : null;
  return cachedSegmenter;
}

export function hasIntlSegmenter(): boolean {
  return intlSegmenter() !== null;
}

const MARK = /\p{M}/u;
const PICTOGRAPHIC = /\p{Extended_Pictographic}/u;

function isExtend(cp: number): boolean {
  if (cp === CP.ZWJ || cp === CP.ZWNJ) return true;
  if (cp >= 0xfe00 && cp <= 0xfe0f) return true; // variation selectors
  if (cp >= 0x1f3fb && cp <= 0x1f3ff) return true; // emoji skin tone modifiers
  if (cp >= 0xe0020 && cp <= 0xe007f) return true; // tag characters
  return MARK.test(String.fromCodePoint(cp));
}

function isRegionalIndicator(cp: number): boolean {
  return cp >= 0x1f1e6 && cp <= 0x1f1ff;
}

function isControl(cp: number): boolean {
  return cp === 0x0a || cp === 0x0d || (cp < 0x20 && cp !== 0x09) || cp === 0x7f;
}

/** The builtin segmenter. Exported for tests and for callers who want determinism. */
export function segmentGraphemesBuiltin(text: string, conjuncts = true): string[] {
  const out: string[] = [];
  const list: number[] = [];
  for (const ch of text) list.push(ch.codePointAt(0) as number);

  let current = '';
  let hasConsonant = false; // the cluster started with or contains a Bangla consonant
  let linker = false; // last relevant code point was a virama (optionally followed by ZWJ)
  let lastPictographic = false; // for emoji ZWJ sequences
  let riCount = 0;

  const flush = () => {
    if (current) out.push(current);
    current = '';
    hasConsonant = false;
    linker = false;
    lastPictographic = false;
    riCount = 0;
  };

  for (let i = 0; i < list.length; i++) {
    const cp = list[i] as number;
    const ch = String.fromCodePoint(cp);
    const prev = list[i - 1];

    if (current === '') {
      current = ch;
      hasConsonant = isFullConsonant(cp);
      lastPictographic = PICTOGRAPHIC.test(ch);
      riCount = isRegionalIndicator(cp) ? 1 : 0;
      if (isControl(cp) && !(cp === 0x0d && list[i + 1] === 0x0a)) flush();
      continue;
    }

    // GB3: CR x LF
    if (cp === 0x0a && prev === 0x0d) {
      current += ch;
      flush();
      continue;
    }
    // GB4/GB5: break around controls
    if (isControl(cp)) {
      flush();
      current = ch;
      if (!(cp === 0x0d && list[i + 1] === 0x0a)) flush();
      continue;
    }
    // GB9c: consonant + virama (+ ZWJ) x consonant
    if (conjuncts && linker && hasConsonant && isFullConsonant(cp)) {
      current += ch;
      linker = false;
      continue;
    }
    // GB11: emoji ZWJ sequences
    if (lastPictographic && prev === CP.ZWJ && PICTOGRAPHIC.test(ch)) {
      current += ch;
      continue;
    }
    // GB12/13: regional indicator pairs
    if (isRegionalIndicator(cp) && riCount % 2 === 1 && isRegionalIndicator(prev as number)) {
      current += ch;
      riCount++;
      continue;
    }
    // GB9/GB9a: extend and spacing marks attach to the previous cluster
    if (isExtend(cp)) {
      current += ch;
      if (cp === CP.VIRAMA) linker = true;
      else if (cp === CP.ZWJ) linker = linker && prev === CP.VIRAMA;
      else if (cp === CP.ZWNJ) linker = false;
      else if (cp !== CP.NUKTA) linker = false;
      if (PICTOGRAPHIC.test(ch)) lastPictographic = true;
      continue;
    }
    flush();
    current = ch;
    hasConsonant = isFullConsonant(cp);
    lastPictographic = PICTOGRAPHIC.test(ch);
    riCount = isRegionalIndicator(cp) ? 1 : 0;
  }
  flush();
  return out;
}

function resolveEngine(engine: SegmenterEngine = 'auto'): 'intl' | 'builtin' {
  if (engine === 'builtin') return 'builtin';
  if (engine === 'intl') {
    if (!hasIntlSegmenter()) throw new Error('Intl.Segmenter is not available in this runtime');
    return 'intl';
  }
  return hasIntlSegmenter() ? 'intl' : 'builtin';
}

/** Splits text into grapheme clusters. */
export function graphemes(text: string, options: GraphemeOptions = {}): string[] {
  if (text === '') return [];
  if (resolveEngine(options.engine) === 'builtin') {
    return segmentGraphemesBuiltin(text, options.conjuncts ?? true);
  }
  const segmenter = intlSegmenter() as IntlSegmenterLike;
  return Array.from(segmenter.segment(text), (s) => s.segment);
}

/** Number of grapheme clusters: `graphemeLength('বাংলা') === 3` with the builtin engine. */
export function graphemeLength(text: string, options: GraphemeOptions = {}): number {
  return graphemes(text, options).length;
}

/** Like `String.prototype.slice`, counted in grapheme clusters. Negative indexes count from the end. */
export function sliceGraphemes(
  text: string,
  start: number,
  end?: number,
  options: GraphemeOptions = {},
): string {
  return graphemes(text, options).slice(start, end).join('');
}

export interface TruncateOptions extends GraphemeOptions {
  /** Appended when the text is cut. Default "…". Counts towards `max`. */
  ellipsis?: string;
  /** Cut at the last whitespace before the limit when there is one. Default false. */
  wordBoundary?: boolean;
}

/**
 * Shortens `text` to at most `max` grapheme clusters, ellipsis included,
 * without splitting a character: `truncate('স্বাধীনতা দিবস', 4)` keeps the
 * three clusters স্বা, ধী and ন and adds `…`, where `.slice(0, 3)` would
 * leave a dangling virama.
 */
export function truncate(text: string, max: number, options: TruncateOptions = {}): string {
  if (!Number.isInteger(max) || max < 0) throw new RangeError('max must be a non-negative integer');
  const { ellipsis = '\u2026', wordBoundary = false } = options;
  const parts = graphemes(text, options);
  if (parts.length <= max) return text;
  const ellipsisLength = graphemes(ellipsis, options).length;
  if (max <= ellipsisLength) return graphemes(ellipsis, options).slice(0, max).join('');
  let kept = parts.slice(0, max - ellipsisLength);
  if (wordBoundary) {
    let lastSpace = -1;
    for (let i = kept.length - 1; i > 0; i--) {
      if (/^\s+$/u.test(kept[i] as string)) {
        lastSpace = i;
        break;
      }
    }
    if (lastSpace > 0) kept = kept.slice(0, lastSpace);
  }
  return kept.join('').replace(/\s+$/u, '') + ellipsis;
}

/** Reverses text by grapheme cluster, so marks stay on their letters. */
export function reverseGraphemes(text: string, options: GraphemeOptions = {}): string {
  return graphemes(text, options).reverse().join('');
}
