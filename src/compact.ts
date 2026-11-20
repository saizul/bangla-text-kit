/**
 * Compact numbers with South Asian units: হাজার (thousand), লাখ (lakh,
 * 1,00,000) and কোটি (crore, 1,00,00,000), as used for prices, populations
 * and view counts in Bangladesh: `formatCompact(1250000)` -> `১২.৫ লাখ`.
 */

import { formatNumber, toLatinDigits } from './digits.js';

export interface FormatCompactOptions {
  /** `bn` (default) for Bangla digits, `latin` for ASCII digits. */
  digits?: 'bn' | 'latin';
  /** Unit words: `bn` (default) হাজার/লাখ/কোটি, `en` thousand/lakh/crore. */
  units?: 'bn' | 'en';
  /** Most fraction digits to keep (trailing zeros are dropped). Default 2. */
  maximumFractionDigits?: number;
  /** Use হাজার for 1,000 to 99,999. Default `true`; `false` keeps those numbers whole (৫০,০০০). */
  thousand?: boolean;
}

interface Unit {
  value: number;
  bn: string;
  en: string;
}

const CRORE: Unit = { value: 1e7, bn: 'কোটি', en: 'crore' };
const LAKH: Unit = { value: 1e5, bn: 'লাখ', en: 'lakh' };
const THOUSAND: Unit = { value: 1e3, bn: 'হাজার', en: 'thousand' };

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/**
 * `formatCompact(1250000)` -> `'১২.৫ লাখ'`, `formatCompact(35000000)` -> `'৩.৫ কোটি'`,
 * `formatCompact(4500, { digits: 'latin', units: 'en' })` -> `'4.5 thousand'`.
 * Values below 1,000 (or below 1,00,000 with `thousand: false`) are formatted
 * with `formatNumber()`. Amounts of 1,000 crore and more keep কোটি with lakh
 * grouping: `১,২০০ কোটি`.
 */
export function formatCompact(value: number, options: FormatCompactOptions = {}): string {
  const { digits = 'bn', units = 'bn', maximumFractionDigits = 2, thousand = true } = options;
  if (!Number.isFinite(value)) throw new RangeError(`cannot format ${value}`);
  if (!Number.isInteger(maximumFractionDigits) || maximumFractionDigits < 0 || maximumFractionDigits > 20) {
    throw new RangeError(
      `maximumFractionDigits must be an integer from 0 to 20, got ${maximumFractionDigits}`,
    );
  }
  const negative = value < 0;
  const abs = Math.abs(value);
  const ladder = thousand ? [CRORE, LAKH, THOUSAND] : [CRORE, LAKH];
  let text: string | undefined;
  for (let i = 0; i < ladder.length; i++) {
    const unit = ladder[i]!;
    if (abs < unit.value) continue;
    let scaled = round(abs / unit.value, maximumFractionDigits);
    let chosen = unit;
    // 99,999 rounds to 100 হাজার: say ১ লাখ instead (and 99.99 লাখ -> ১ কোটি).
    const bigger = ladder[i - 1];
    if (bigger && scaled * unit.value >= bigger.value) {
      chosen = bigger;
      scaled = round(abs / bigger.value, maximumFractionDigits);
    }
    text = `${formatNumber(scaled, { digits, grouping: 'indian' })} ${chosen[units]}`;
    break;
  }
  if (text === undefined) {
    const rounded = round(abs, maximumFractionDigits);
    // Rounding up to the first unit, e.g. 999.999 with 2 digits.
    const smallest = ladder[ladder.length - 1]!;
    text =
      rounded >= smallest.value
        ? `${formatNumber(1, { digits })} ${smallest[units]}`
        : formatNumber(rounded, { digits, grouping: 'indian' });
  }
  return negative && text !== formatNumber(0, { digits }) ? `-${text}` : text;
}

const UNIT_WORDS: Record<string, number> = {
  হাজার: 1e3,
  thousand: 1e3,
  k: 1e3,
  লাখ: 1e5,
  লক্ষ: 1e5,
  lakh: 1e5,
  lakhs: 1e5,
  lac: 1e5,
  lacs: 1e5,
  কোটি: 1e7,
  crore: 1e7,
  crores: 1e7,
  cr: 1e7,
};

/**
 * Parses compact numbers: `parseCompact('১২.৫ লাখ')` -> `1250000`,
 * `parseCompact('2 crore')` -> `20000000`, `parseCompact('৳ ৩ হাজার')` -> `3000`.
 * Several units add up (`'১ কোটি ২০ লাখ'` -> `12000000`). A leading `৳` or
 * `Tk`, grouping commas and a trailing `টাকা` are ignored. Returns `NaN` when
 * the text is not a compact number.
 */
export function parseCompact(text: string): number {
  let rest = toLatinDigits(text.trim())
    .replace(/^(?:৳|tk\.?|bdt)\s*/i, '')
    .replace(/\s*(?:টাকা|taka)$/i, '')
    .replace(/^−/, '-')
    .trim();
  let sign = 1;
  if (rest.startsWith('-')) {
    sign = -1;
    rest = rest.slice(1).trim();
  }
  if (rest === '') return Number.NaN;
  const part = /^(\d[\d,]*(?:\.\d+)?|\.\d+)\s*([^\s\d.,]+)?\s*/u;
  let total = 0;
  let lastUnit = Number.POSITIVE_INFINITY;
  while (rest !== '') {
    const match = part.exec(rest);
    if (!match) return Number.NaN;
    const amount = Number(match[1]!.replace(/,/g, ''));
    const word = match[2];
    let unit = 1;
    if (word !== undefined) {
      const found = UNIT_WORDS[word.toLowerCase()];
      if (found === undefined) return Number.NaN;
      unit = found;
    }
    // Units must get smaller: "১ কোটি ২০ লাখ", not "২০ লাখ ১ কোটি" or "৫ ৬".
    if (unit >= lastUnit) return Number.NaN;
    lastUnit = unit;
    total += amount * unit;
    rest = rest.slice(match[0].length);
  }
  // Avoid binary noise such as 1.1 * 1e5 = 110000.00000000001.
  return sign * Number(total.toPrecision(15));
}
