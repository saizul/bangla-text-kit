/**
 * Code points of the Unicode Bengali block (U+0980..U+09FF) and helpers to
 * classify them. Names follow the Unicode character database.
 *
 * Checked against the Unicode Bengali code chart and UnicodeData.txt:
 * U+09DC RRA, U+09DD RHA and U+09DF YYA decompose to DDA/DDHA/YA + NUKTA and
 * are composition exclusions, so NFC keeps them decomposed. U+09CB (O) and
 * U+09CC (AU) decompose to E + AA and E + AU LENGTH MARK and do recompose.
 * Danda and double danda are shared with Devanagari (U+0964, U+0965).
 */

export const CP = {
  ANJI: 0x0980,
  CANDRABINDU: 0x0981,
  ANUSVARA: 0x0982,
  VISARGA: 0x0983,
  A: 0x0985,
  AA: 0x0986,
  I: 0x0987,
  II: 0x0988,
  U: 0x0989,
  UU: 0x098a,
  VOCALIC_R: 0x098b,
  VOCALIC_L: 0x098c,
  E: 0x098f,
  AI: 0x0990,
  O: 0x0993,
  AU: 0x0994,
  KA: 0x0995,
  DDA: 0x09a1,
  DDHA: 0x09a2,
  NNA: 0x09a3,
  TA: 0x09a4,
  NA: 0x09a8,
  YA: 0x09af,
  RA: 0x09b0,
  SHA: 0x09b6,
  SSA: 0x09b7,
  SA: 0x09b8,
  HA: 0x09b9,
  NUKTA: 0x09bc,
  AVAGRAHA: 0x09bd,
  SIGN_AA: 0x09be,
  SIGN_I: 0x09bf,
  SIGN_II: 0x09c0,
  SIGN_U: 0x09c1,
  SIGN_UU: 0x09c2,
  SIGN_VOCALIC_R: 0x09c3,
  SIGN_VOCALIC_RR: 0x09c4,
  SIGN_E: 0x09c7,
  SIGN_AI: 0x09c8,
  SIGN_O: 0x09cb,
  SIGN_AU: 0x09cc,
  VIRAMA: 0x09cd,
  KHANDA_TA: 0x09ce,
  AU_LENGTH_MARK: 0x09d7,
  RRA: 0x09dc,
  RHA: 0x09dd,
  YYA: 0x09df,
  VOCALIC_RR: 0x09e0,
  VOCALIC_LL: 0x09e1,
  SIGN_VOCALIC_L: 0x09e2,
  SIGN_VOCALIC_LL: 0x09e3,
  DIGIT_ZERO: 0x09e6,
  DIGIT_NINE: 0x09ef,
  RA_MIDDLE_DIAGONAL: 0x09f0,
  RA_LOWER_DIAGONAL: 0x09f1,
  RUPEE_MARK: 0x09f2,
  RUPEE_SIGN: 0x09f3,
  ISSHAR: 0x09fa,
  GANDA: 0x09fb,
  VEDIC_ANUSVARA: 0x09fc,
  ABBREVIATION_SIGN: 0x09fd,
  SANDHI_MARK: 0x09fe,
  DANDA: 0x0964,
  DOUBLE_DANDA: 0x0965,
  ZWNJ: 0x200c,
  ZWJ: 0x200d,
} as const;

/** The characters as strings, for readable string building. */
export const CH = Object.fromEntries(Object.entries(CP).map(([k, v]) => [k, String.fromCodePoint(v)])) as {
  readonly [K in keyof typeof CP]: string;
};

/** Code points assigned in the Bengali block (U+0980..U+09FF). */
const ASSIGNED: ReadonlyArray<readonly [number, number]> = [
  [0x0980, 0x0983],
  [0x0985, 0x098c],
  [0x098f, 0x0990],
  [0x0993, 0x09a8],
  [0x09aa, 0x09b0],
  [0x09b2, 0x09b2],
  [0x09b6, 0x09b9],
  [0x09bc, 0x09c4],
  [0x09c7, 0x09c8],
  [0x09cb, 0x09ce],
  [0x09d7, 0x09d7],
  [0x09dc, 0x09dd],
  [0x09df, 0x09e3],
  [0x09e6, 0x09fe],
];

export function isAssignedBengali(cp: number): boolean {
  for (const [lo, hi] of ASSIGNED) if (cp >= lo && cp <= hi) return true;
  return false;
}

/** Any code point in the Bengali block, assigned or not. */
export function inBengaliBlock(cp: number): boolean {
  return cp >= 0x0980 && cp <= 0x09ff;
}

/** Consonant letters, including the nukta forms, khanda ta and the Assamese ra forms. */
export function isConsonant(cp: number): boolean {
  return (
    (cp >= 0x0995 && cp <= 0x09b9 && isAssignedBengali(cp)) ||
    cp === CP.RRA ||
    cp === CP.RHA ||
    cp === CP.YYA ||
    cp === CP.KHANDA_TA ||
    cp === CP.RA_MIDDLE_DIAGONAL ||
    cp === CP.RA_LOWER_DIAGONAL
  );
}

/** Consonants that can carry a vowel sign or take part in a conjunct (not khanda ta). */
export function isFullConsonant(cp: number): boolean {
  return isConsonant(cp) && cp !== CP.KHANDA_TA;
}

export function isIndependentVowel(cp: number): boolean {
  return (
    (cp >= 0x0985 && cp <= 0x098c) ||
    cp === CP.E ||
    cp === CP.AI ||
    cp === CP.O ||
    cp === CP.AU ||
    cp === CP.VOCALIC_RR ||
    cp === CP.VOCALIC_LL
  );
}

/** Dependent vowel signs (kar), including the AU length mark. */
export function isVowelSign(cp: number): boolean {
  return (
    (cp >= 0x09be && cp <= 0x09c4) ||
    cp === CP.SIGN_E ||
    cp === CP.SIGN_AI ||
    cp === CP.SIGN_O ||
    cp === CP.SIGN_AU ||
    cp === CP.AU_LENGTH_MARK ||
    cp === CP.SIGN_VOCALIC_L ||
    cp === CP.SIGN_VOCALIC_LL
  );
}

/** Vowel signs drawn to the left of the consonant (pre-base matras). */
export function isPreBaseVowelSign(cp: number): boolean {
  return cp === CP.SIGN_I || cp === CP.SIGN_E || cp === CP.SIGN_AI;
}

/** Candrabindu, anusvara, visarga. */
export function isVariousSign(cp: number): boolean {
  return cp === CP.CANDRABINDU || cp === CP.ANUSVARA || cp === CP.VISARGA;
}

/** Characters that attach to the preceding base. */
export function isCombining(cp: number): boolean {
  return (
    isVowelSign(cp) ||
    cp === CP.CANDRABINDU ||
    cp === CP.ANUSVARA ||
    cp === CP.VISARGA ||
    cp === CP.NUKTA ||
    cp === CP.VIRAMA ||
    cp === CP.SANDHI_MARK ||
    cp === CP.ZWJ ||
    cp === CP.ZWNJ ||
    // generic combining marks from other scripts, variation selectors
    (cp >= 0x0300 && cp <= 0x036f) ||
    (cp >= 0xfe00 && cp <= 0xfe0f)
  );
}

export function isBanglaDigit(cp: number): boolean {
  return cp >= CP.DIGIT_ZERO && cp <= CP.DIGIT_NINE;
}

/** Letters, vowel signs and other signs, but not digits or currency/fraction symbols. */
export function isBanglaLetterOrMark(cp: number): boolean {
  if (!isAssignedBengali(cp)) return false;
  return !(isBanglaDigit(cp) || (cp >= 0x09f2 && cp <= 0x09fb) || cp === CP.ABBREVIATION_SIGN);
}

export function cps(text: string): number[] {
  const out: number[] = [];
  for (const ch of text) out.push(ch.codePointAt(0) as number);
  return out;
}

export function fromCps(list: readonly number[]): string {
  return String.fromCodePoint(...list);
}

/** `U+0995 U+09CD U+09B7`, handy in test failure messages and debugging. */
export function describeCodePoints(text: string): string {
  return cps(text)
    .map((cp) => `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`)
    .join(' ');
}
