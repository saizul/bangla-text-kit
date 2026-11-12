/**
 * Bangla-aware Unicode normalization.
 *
 * `normalize()` applies NFC plus a set of fixes for problems that NFC does
 * not touch but that are common in real Bangla text: legacy khanda ta
 * sequences, stray zero-width joiners, vowel signs typed in visual order,
 * misplaced candrabindu or nukta, repeated marks, and an ASCII colon typed
 * instead of visarga.
 */

import {
  CP,
  cps,
  fromCps,
  inBengaliBlock,
  isCombining,
  isConsonant,
  isFullConsonant,
  isPreBaseVowelSign,
  isVowelSign,
} from './chars.js';

export type NuktaForm = 'decomposed' | 'composed';
export type JoinerMode = 'clean' | 'keep' | 'remove';

export interface NormalizeOptions {
  /**
   * Output form of য় ড় ঢ়. `decomposed` (default) is what NFC produces:
   * U+09DF, U+09DC and U+09DD are composition exclusions, so NFC turns
   * them into YA/DDA/DDHA + NUKTA. `composed` produces the single code
   * points, which some older systems and fonts expect. Note that the result
   * is then not in NFC.
   */
  nukta?: NuktaForm;
  /** Replace the pre-Unicode-4.1 sequence TA + VIRAMA + ZWJ with U+09CE KHANDA TA. Default true. */
  khandaTa?: boolean;
  /**
   * Zero-width joiner and non-joiner handling, only next to Bangla letters
   * (emoji ZWJ sequences and other scripts are never touched):
   * `clean` (default) removes the ones that cannot change rendering (any
   * joiner not next to a virama) and collapses repeats; `remove` removes all
   * of them; `keep` leaves them alone.
   */
  joiners?: JoinerMode;
  /**
   * Fix vowel sign order: pre-base signs (ি ে ৈ) typed before their
   * consonant, ে + া / ে + ৗ typed after a moved sign, nukta typed after a
   * vowel sign, candrabindu typed before a vowel sign, and অ + া written for
   * আ. Default true.
   */
  vowelSigns?: boolean;
  /** Collapse an identical vowel sign or mark typed twice (কাা to কা). Default true. */
  duplicateMarks?: boolean;
  /** An ASCII colon between Bangla letters becomes visarga (দু:খ to দুঃখ). Default true. */
  colonToVisarga?: boolean;
  /**
   * A visarga followed by optional spaces and a digit or the end of the line
   * becomes a colon (সময়ঃ ১০টা to সময়: ১০টা). Default false: words such as
   * পুনঃ legitimately end in visarga.
   */
  visargaToColon?: boolean;
  /** A `|` after a Bangla word at the end of a sentence becomes দাঁড়ি (।). Default false. */
  pipeToDanda?: boolean;
  /** Two dandas (।।) become a double danda (॥). Default false. */
  doubleDanda?: boolean;
}

export const DEFAULT_NORMALIZE_OPTIONS: Required<NormalizeOptions> = {
  nukta: 'decomposed',
  khandaTa: true,
  joiners: 'clean',
  vowelSigns: true,
  duplicateMarks: true,
  colonToVisarga: true,
  visargaToColon: false,
  pipeToDanda: false,
  doubleDanda: false,
};

const COMPOSED_NUKTA: ReadonlyArray<readonly [string, string]> = [
  ['\u09A1\u09BC', '\u09DC'], // ড় RRA
  ['\u09A2\u09BC', '\u09DD'], // ঢ় RHA
  ['\u09AF\u09BC', '\u09DF'], // য় YYA
];

/** TA + VIRAMA + ZWJ (and the occasional TA + ZWJ + VIRAMA). */
const LEGACY_KHANDA_TA = /\u09A4(?:\u09CD\u200D|\u200D\u09CD)/g;

/** Composes য় ড় ঢ় into single code points. The result is not NFC. */
export function composeNukta(text: string): string {
  let out = text;
  for (const [decomposed, composed] of COMPOSED_NUKTA) out = out.split(decomposed).join(composed);
  return out;
}

/** Splits য় ড় ঢ় into base + nukta (the NFC form). */
export function decomposeNukta(text: string): string {
  let out = text;
  for (const [decomposed, composed] of COMPOSED_NUKTA) out = out.split(composed).join(decomposed);
  return out;
}

export function fixKhandaTa(text: string): string {
  return text.replace(LEGACY_KHANDA_TA, '\u09CE');
}

function isJoiner(cp: number | undefined): boolean {
  return cp === CP.ZWJ || cp === CP.ZWNJ;
}

/**
 * Removes zero-width joiners that cannot affect Bangla rendering.
 *
 * A joiner is meaningful in Bangla only next to a virama: ক্\u200Cষ (ZWNJ after
 * the virama shows an explicit hasanta), র\u200D্য (ZWJ between RA and the virama
 * gives ra + ya-phala instead of reph). Anything else next to Bangla text is
 * invisible noise that breaks search and comparison.
 */
export function cleanJoiners(text: string, mode: JoinerMode = 'clean'): string {
  if (mode === 'keep') return text;
  const list = cps(text);
  const out: number[] = [];
  for (let i = 0; i < list.length; i++) {
    const cp = list[i] as number;
    if (!isJoiner(cp)) {
      out.push(cp);
      continue;
    }
    // find the neighbours, skipping over a run of joiners
    let j = i;
    while (j + 1 < list.length && isJoiner(list[j + 1])) j++;
    const prev = out[out.length - 1];
    const next = list[j + 1];
    const bengaliContext =
      (prev !== undefined && inBengaliBlock(prev)) || (next !== undefined && inBengaliBlock(next));
    if (!bengaliContext) {
      for (let k = i; k <= j; k++) out.push(list[k] as number);
      i = j;
      continue;
    }
    if (mode === 'clean' && (prev === CP.VIRAMA || next === CP.VIRAMA)) {
      out.push(cp); // keep the first joiner of the run
    }
    i = j;
  }
  return fromCps(out);
}

/** Length of the consonant cluster starting at `i` (consonant, nukta, virama + consonant ...). */
function clusterEnd(list: readonly number[], i: number): number {
  let j = i;
  if (!isFullConsonant(list[j] as number)) return i;
  j++;
  for (;;) {
    if (list[j] === CP.NUKTA) {
      j++;
      continue;
    }
    if (
      list[j] === CP.VIRAMA &&
      (isFullConsonant(list[j + 1] as number) ||
        (isJoiner(list[j + 1]) && isFullConsonant(list[j + 2] as number)))
    ) {
      j += isJoiner(list[j + 1]) ? 3 : 2;
      continue;
    }
    if (isJoiner(list[j]) && list[j + 1] === CP.VIRAMA && isFullConsonant(list[j + 2] as number)) {
      j += 3;
      continue;
    }
    return j;
  }
}

/** True if a dependent sign at position `i` has nothing to attach to. */
function isOrphanPosition(list: readonly number[], i: number): boolean {
  const prev = list[i - 1];
  if (prev === undefined) return true;
  return !(isConsonant(prev) || isCombining(prev));
}

/**
 * Reorders vowel signs that were typed in visual order or in the wrong
 * position. Works on code points; run NFC afterwards so ে + া becomes ো.
 */
export function fixVowelSigns(text: string): string {
  let list = cps(text);

  // অ + া -> আ, অ + ো -> ও, অ + ৌ -> ঔ (old typewriter habit)
  const merged: number[] = [];
  for (let i = 0; i < list.length; i++) {
    const cp = list[i] as number;
    const next = list[i + 1];
    if (cp === CP.A && next === CP.SIGN_AA) {
      merged.push(CP.AA);
      i++;
    } else if (cp === CP.A && next === CP.SIGN_O) {
      merged.push(CP.O);
      i++;
    } else if (cp === CP.A && next === CP.SIGN_AU) {
      merged.push(CP.AU);
      i++;
    } else if (cp === CP.A && next === CP.SIGN_E && list[i + 2] === CP.SIGN_AA) {
      merged.push(CP.O);
      i += 2;
    } else {
      merged.push(cp);
    }
  }
  list = merged;

  // pre-base vowel sign typed before its consonant: ে + ক (+ া) -> ক + ে (+ া)
  const moved: number[] = [];
  for (let i = 0; i < list.length; i++) {
    const cp = list[i] as number;
    if (isPreBaseVowelSign(cp) && isOrphanPosition(list, i) && isFullConsonant(list[i + 1] as number)) {
      const end = clusterEnd(list, i + 1);
      for (let k = i + 1; k < end; k++) moved.push(list[k] as number);
      moved.push(cp);
      i = end - 1;
      continue;
    }
    moved.push(cp);
  }
  list = moved;

  // nukta typed after a vowel sign: য + ি + ় -> য + ় + ি
  // candrabindu typed before a vowel sign: চ + ঁ + া -> চ + া + ঁ
  for (let i = 0; i < list.length; i++) {
    const cp = list[i] as number;
    if (cp === CP.NUKTA && i > 0) {
      let j = i;
      while (j > 0 && isVowelSign(list[j - 1] as number)) j--;
      if (j < i && isConsonant(list[j - 1] as number)) {
        list.splice(i, 1);
        list.splice(j, 0, CP.NUKTA);
      }
    } else if (cp === CP.CANDRABINDU && isVowelSign(list[i + 1] as number)) {
      let j = i + 1;
      while (isVowelSign(list[j + 1] as number)) j++;
      list.splice(i, 1);
      list.splice(j, 0, CP.CANDRABINDU);
      i = j;
    }
  }
  return fromCps(list);
}

const DUPLICABLE = new Set<number>([
  CP.CANDRABINDU,
  CP.ANUSVARA,
  CP.VISARGA,
  CP.NUKTA,
  CP.VIRAMA,
  0x09be,
  0x09bf,
  0x09c0,
  0x09c1,
  0x09c2,
  0x09c3,
  0x09c4,
  CP.SIGN_E,
  CP.SIGN_AI,
  CP.SIGN_O,
  CP.SIGN_AU,
  CP.AU_LENGTH_MARK,
]);

export function removeDuplicateMarks(text: string): string {
  const list = cps(text);
  const out: number[] = [];
  for (const cp of list) {
    if (DUPLICABLE.has(cp) && out[out.length - 1] === cp) continue;
    out.push(cp);
  }
  return fromCps(out);
}

/** ASCII colon between Bangla letters: দু:খ -> দুঃখ. */
const COLON_IN_WORD = /(?<=[\u0981-\u09E3])[:\uFF1A](?=[\u0985-\u09B9\u09CE\u09DC-\u09E1])/gu;
const VISARGA_AS_COLON = /\u0983(?=[ \t]*(?:[0-9\u09E6-\u09EF]|$))/gmu;
const PIPE_AS_DANDA = /([\u0981-\u09E3\u09E6-\u09EF])[ \t]?\|(?=\s|$)/gmu;

export function colonToVisarga(text: string): string {
  return text.replace(COLON_IN_WORD, '\u0983');
}

export function visargaToColon(text: string): string {
  return text.replace(VISARGA_AS_COLON, ':');
}

export function pipeToDanda(text: string): string {
  return text.replace(PIPE_AS_DANDA, '$1\u0964');
}

export function doubleDanda(text: string): string {
  return text.replace(/\u0964[ \t]?\u0964/g, '\u0965');
}

/**
 * Normalizes Bangla text. Safe to run on mixed-script text: the fixes only
 * apply next to Bangla characters.
 */
export function normalize(text: string, options: NormalizeOptions = {}): string {
  const o = { ...DEFAULT_NORMALIZE_OPTIONS, ...options };
  let out = text.normalize('NFC');
  if (o.khandaTa) out = fixKhandaTa(out);
  out = cleanJoiners(out, o.joiners);
  if (o.vowelSigns) out = fixVowelSigns(out).normalize('NFC');
  if (o.duplicateMarks) out = removeDuplicateMarks(out);
  if (o.colonToVisarga) out = colonToVisarga(out);
  if (o.visargaToColon) out = visargaToColon(out);
  if (o.pipeToDanda) out = pipeToDanda(out);
  if (o.doubleDanda) out = doubleDanda(out);
  out = out.normalize('NFC');
  if (o.nukta === 'composed') out = composeNukta(out);
  return out;
}

export function isNormalized(text: string, options: NormalizeOptions = {}): boolean {
  return normalize(text, options) === text;
}

export type NormalizationIssue =
  | 'not-nfc'
  | 'precomposed-nukta'
  | 'legacy-khanda-ta'
  | 'stray-joiner'
  | 'vowel-sign-order'
  | 'duplicate-mark'
  | 'colon-for-visarga';

/** Lists which kinds of problem `normalize()` (default options) would fix in `text`. */
export function findIssues(text: string): NormalizationIssue[] {
  const issues: NormalizationIssue[] = [];
  const nfc = text.normalize('NFC');
  if (nfc !== text) {
    issues.push(/[\u09DC\u09DD\u09DF]/.test(text) ? 'precomposed-nukta' : 'not-nfc');
    if (/[\u09DC\u09DD\u09DF]/.test(text) && nfc !== decomposeNukta(text)) issues.push('not-nfc');
  }
  if (fixKhandaTa(nfc) !== nfc) issues.push('legacy-khanda-ta');
  const k = fixKhandaTa(nfc);
  if (cleanJoiners(k) !== k) issues.push('stray-joiner');
  const j = cleanJoiners(k);
  if (fixVowelSigns(j).normalize('NFC') !== j) issues.push('vowel-sign-order');
  const v = fixVowelSigns(j).normalize('NFC');
  if (removeDuplicateMarks(v) !== v) issues.push('duplicate-mark');
  if (colonToVisarga(v) !== v) issues.push('colon-for-visarga');
  return issues;
}
