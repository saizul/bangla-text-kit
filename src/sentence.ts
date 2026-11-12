/**
 * Sentence splitter for Bangla and mixed text.
 *
 * Sentences end at দাঁড়ি (।, U+0964), double danda (॥, U+0965), `?`, `!`
 * and `.`. A full stop does not end a sentence when it is a decimal point
 * (৩.৫), follows a known abbreviation (ড., মো., ডা., Dr., etc.) or follows a
 * single letter used as an initial (এ. কে. এম.). Closing quotes and
 * brackets after the terminator belong to the sentence.
 */

import { graphemes } from './grapheme.js';

export const DEFAULT_ABBREVIATIONS: readonly string[] = [
  // Bangla titles and common abbreviations
  '\u09A1',
  '\u09A1\u09BE',
  '\u09A1\u0983',
  '\u09AE\u09CB',
  '\u09AE\u09CB\u0983',
  '\u09AE\u09CB\u09B8\u09BE',
  '\u09AE\u09CB\u099B\u09BE',
  '\u09AE\u09CB\u09B8\u09BE\u09AE\u09CD\u09AE\u09CE',
  '\u09AE\u09BF',
  '\u09AE\u09BF\u09B8',
  '\u09AE\u09BF\u09B8\u09C7\u09B8',
  '\u099C\u09A8\u09BE\u09AC',
  '\u0985\u09A7\u09CD\u09AF\u09BE',
  '\u09AA\u09CD\u09B0\u09AB',
  '\u0985\u09CD\u09AF\u09BE\u09A1',
  '\u098F\u09A1',
  '\u09B8\u09BE',
  '\u09B0\u09BE',
  '\u0986',
  '\u09B0\u09B9',
  '\u09B2\u09BF',
  '\u0995\u09CB',
  '\u09AA\u09CD\u09B0\u09BE',
  '\u09A8\u0982',
  '\u09AA\u09C3',
  '\u0996\u09CD\u09B0\u09BF',
  '\u0996\u09CD\u09B0\u09BF\u0983',
  '\u0996\u09CD\u09B0\u09C0',
  '\u09AC\u09BF',
  '\u09A6\u09CD\u09B0',
  '\u09AC\u09BF\u0983',
  '\u09A6\u09CD\u09B0\u0983',
  '\u0987\u0982',
  '\u09B8\u0982',
  '\u09AE\u09BF\u0983',
  '\u0995\u09BF\u09AE\u09BF',
  '\u09AE\u09BF\u09AE\u09BF',
  '\u09B8\u09C7\u09AE\u09BF',
  '\u0995\u09C7\u099C\u09BF',
  '\u0997\u09CD\u09B0\u09BE',
  // English
  'mr',
  'mrs',
  'ms',
  'dr',
  'prof',
  'sr',
  'jr',
  'st',
  'vs',
  'etc',
  'e.g',
  'i.e',
  'no',
  'ltd',
  'inc',
  'co',
  'corp',
  'dept',
  'govt',
  'approx',
  'fig',
  'p',
  'pp',
  'vol',
  'jan',
  'feb',
  'mar',
  'apr',
  'jun',
  'jul',
  'aug',
  'sep',
  'sept',
  'oct',
  'nov',
  'dec',
  'md',
];

export interface SentenceOptions {
  /** Replace the default abbreviation list. Compared without the trailing dot, case-insensitive. */
  abbreviations?: readonly string[];
  /** Extra abbreviations added to the default list. */
  extraAbbreviations?: readonly string[];
  /** Treat a single line break as a sentence boundary. Default false (blank lines always are). */
  splitOnNewline?: boolean;
}

export interface SentenceSpan {
  text: string;
  start: number;
  end: number;
}

const ALWAYS_END = new Set(['\u0964', '\u0965']);
const MAYBE_END = new Set(['?', '!', '\u203C', '\u2047', '\u2048', '\u2049', '.']);
const CLOSERS = new Set(['"', "'", '\u201D', '\u2019', '\u00BB', ')', ']', '}', '\u203A']);
const DIGIT = /\p{Nd}/u;
const LETTER = /[\p{L}\p{M}]/u;

function wordBefore(text: string, index: number): string {
  let j = index;
  while (j > 0 && (LETTER.test(text[j - 1] as string) || text[j - 1] === '.' || text[j - 1] === '\u0983')) {
    j--;
  }
  return text.slice(j, index);
}

/** A single grapheme used as an initial, e.g. এ, কে, A. */
function isInitial(word: string): boolean {
  return word !== '' && !word.includes('.') && graphemes(word, { engine: 'builtin' }).length === 1;
}

/** The word right after `index` if it is followed by a dot ("কে." in "এ. কে. এম."). */
function nextWord(text: string, index: number): string {
  const m = /^[ \t]+([\p{L}\p{M}]+)\./u.exec(text.slice(index));
  return m ? (m[1] as string) : '';
}

/** The dotted word before `index` ("এ." before "কে."). */
function previousInitial(text: string, index: number): string {
  const m = /([\p{L}\p{M}]+)\.[ \t]+$/u.exec(text.slice(0, index));
  return m ? (m[1] as string) : '';
}

/** Splits text into sentences with their offsets. Empty sentences are dropped. */
export function sentenceSpans(text: string, options: SentenceOptions = {}): SentenceSpan[] {
  const abbreviations = new Set(
    [...(options.abbreviations ?? DEFAULT_ABBREVIATIONS), ...(options.extraAbbreviations ?? [])].map((a) =>
      a.replace(/\.$/, '').toLowerCase().normalize('NFC'),
    ),
  );
  const spans: SentenceSpan[] = [];
  let start = 0;

  const push = (end: number) => {
    const raw = text.slice(start, end);
    const lead = raw.length - raw.trimStart().length;
    const trimmed = raw.trim();
    if (trimmed) spans.push({ text: trimmed, start: start + lead, end: start + lead + trimmed.length });
    start = end;
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i] as string;

    if (ch === '\n') {
      const blank = /^\n[ \t]*\n/.test(text.slice(i));
      if (blank || options.splitOnNewline) push(i);
      continue;
    }
    if (!ALWAYS_END.has(ch) && !MAYBE_END.has(ch)) continue;

    if (ch === '.') {
      const prev = text[i - 1] ?? '';
      const next = text[i + 1] ?? '';
      if (DIGIT.test(prev) && DIGIT.test(next)) continue; // 3.5
      if (next === '.') continue; // part of "..." -- decide at the last dot
      const word = wordBefore(text, i);
      const bare = word.replace(/\.$/, '');
      const key = bare.toLowerCase().normalize('NFC');
      if (key && (abbreviations.has(key) || abbreviations.has(key.split('.').pop() ?? ''))) continue;
      if (
        isInitial(bare) &&
        (isInitial(nextWord(text, i + 1)) ||
          isInitial(previousInitial(text, i - word.length)) ||
          /^[A-Z]$/.test(bare))
      ) {
        continue; // এ. কে. এম. / A. K.
      }
      if (/[\p{L}\p{N}]/u.test(next)) continue; // example.com, ড.ইউনূস without space
    }

    // swallow repeated terminators and closing quotes/brackets
    let end = i + 1;
    while (end < text.length && (ALWAYS_END.has(text[end] as string) || MAYBE_END.has(text[end] as string))) {
      end++;
    }
    while (end < text.length && CLOSERS.has(text[end] as string)) end++;

    const after = text[end];
    if (!ALWAYS_END.has(ch) && after !== undefined && !/\s/u.test(after)) {
      // "?" or "!" glued to the next word only ends a sentence before Bangla letters
      if (!(ch !== '.' && /[\u0980-\u09FF]/u.test(after))) {
        i = end - 1;
        continue;
      }
    }
    push(end);
    i = end - 1;
  }
  push(text.length);
  return spans;
}

/** Splits text into sentences: `splitSentences('আমি যাব। তুমি?')` -> `['আমি যাব।', 'তুমি?']`. */
export function splitSentences(text: string, options: SentenceOptions = {}): string[] {
  return sentenceSpans(text, options).map((s) => s.text);
}
