/**
 * Conversion between Bangla digits (U+09E6..U+09EF) and ASCII digits, plus
 * number formatting with South Asian (lakh/crore) grouping.
 */

const BN_ZERO = 0x09e6;
const LATIN_TO_BN = /[0-9]/g;
const BN_TO_LATIN = /[\u09E6-\u09EF]/g;

/** `2026` or `"Tel 01712"` -> `২০২৬`, `"Tel ০১৭১২"`. Other characters are kept. */
export function toBanglaDigits(input: string | number | bigint): string {
  const text = typeof input === 'string' ? input : String(input);
  return text.replace(LATIN_TO_BN, (d) => String.fromCharCode(BN_ZERO + (d.charCodeAt(0) - 48)));
}

/** `"৳ ১,২৩৪.৫০"` -> `"৳ 1,234.50"`. Other characters are kept. */
export function toLatinDigits(text: string): string {
  return text.replace(BN_TO_LATIN, (d) => String.fromCharCode(48 + (d.charCodeAt(0) - BN_ZERO)));
}

export function hasBanglaDigits(text: string): boolean {
  return /[\u09E6-\u09EF]/.test(text);
}

export type Grouping = 'indian' | 'international' | 'none';

export interface FormatNumberOptions {
  /** `bn` (default) for Bangla digits, `latin` for ASCII digits. */
  digits?: 'bn' | 'latin';
  /** `indian` (default): 12,34,567. `international`: 1,234,567. */
  grouping?: Grouping;
  /** Fixed number of fraction digits; by default the number's own digits are kept. */
  fractionDigits?: number;
  /** Group separator, default ",". */
  separator?: string;
}

function groupInteger(intPart: string, grouping: Grouping, sep: string): string {
  if (grouping === 'none' || intPart.length <= 3) return intPart;
  if (grouping === 'international') return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  const last3 = intPart.slice(-3);
  const rest = intPart.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, sep);
  return `${rest}${sep}${last3}`;
}

/**
 * Formats a number for Bangladesh: `formatNumber(1234567.5)` -> `১২,৩৪,৫৬৭.৫`.
 * Accepts numbers, bigints and numeric strings (Bangla or ASCII digits).
 */
export function formatNumber(value: number | bigint | string, options: FormatNumberOptions = {}): string {
  const { digits = 'bn', grouping = 'indian', fractionDigits, separator = ',' } = options;
  let text: string;
  if (typeof value === 'bigint') {
    text = value.toString();
  } else if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new RangeError(`cannot format ${value}`);
    text = fractionDigits === undefined ? numberToPlainString(value) : value.toFixed(fractionDigits);
  } else {
    const parsed = toLatinDigits(value.trim()).replace(/,/g, '');
    if (!/^-?\d+(\.\d+)?$/.test(parsed)) throw new RangeError(`not a number: ${value}`);
    text = fractionDigits === undefined ? parsed : Number(parsed).toFixed(fractionDigits);
  }
  const negative = text.startsWith('-');
  if (negative) text = text.slice(1);
  const [intPart = '0', frac] = text.split('.');
  let out = groupInteger(intPart, grouping, separator);
  if (frac !== undefined && frac.length > 0) out += `.${frac}`;
  if (negative) out = `-${out}`;
  return digits === 'bn' ? toBanglaDigits(out) : out;
}

function numberToPlainString(n: number): string {
  const s = String(n);
  if (!/e/i.test(s)) return s;
  // avoid exponent notation for large or tiny numbers
  return n.toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 20 });
}

/**
 * Parses a number written with Bangla or ASCII digits and optional grouping
 * commas: `"১২,৩৪,৫৬৭.৫০"` -> `1234567.5`. Returns `NaN` when the text is not
 * a number.
 */
export function parseNumber(text: string): number {
  const cleaned = toLatinDigits(text.trim())
    .replace(/[,\s]/g, '')
    .replace(/^\u2212/, '-');
  if (!/^[-+]?(\d+(\.\d*)?|\.\d+)$/.test(cleaned)) return Number.NaN;
  return Number(cleaned);
}
