/**
 * The Bangla calendar (বঙ্গাব্দ) as used officially in Bangladesh, plus Bangla
 * names for Gregorian months and weekdays.
 *
 * This follows the revised Bangladesh calendar (2019 revision of the Bangla
 * Academy calendar): the year starts on 14 April, the first six months have
 * 31 days, কার্তিক to মাঘ and চৈত্র have 30, and ফাল্গুন has 29 days, or 30
 * when the February it overlaps is in a Gregorian leap year. With these rules
 * 21 February is always ৮ ফাল্গুন, 26 March ১২ চৈত্র and 16 December ১ পৌষ.
 *
 * The rules are applied to every year, so dates before the revisions do not
 * match what printed calendars of the time said. The West Bengal (Indian)
 * calendar, which follows the sidereal solar year, is not supported.
 */

import { toBanglaDigits, toLatinDigits } from './digits.js';
import { fold } from './fold.js';

const nfc = (names: string[]): readonly string[] => Object.freeze(names.map((s) => s.normalize('NFC')));

/** Bangla calendar month names, বৈশাখ first. */
export const BANGLA_MONTHS: readonly string[] = nfc([
  'বৈশাখ',
  'জ্যৈষ্ঠ',
  'আষাঢ়',
  'শ্রাবণ',
  'ভাদ্র',
  'আশ্বিন',
  'কার্তিক',
  'অগ্রহায়ণ',
  'পৌষ',
  'মাঘ',
  'ফাল্গুন',
  'চৈত্র',
]);

/** Gregorian month names in Bangla, জানুয়ারি first. */
export const GREGORIAN_MONTHS_BN: readonly string[] = nfc([
  'জানুয়ারি',
  'ফেব্রুয়ারি',
  'মার্চ',
  'এপ্রিল',
  'মে',
  'জুন',
  'জুলাই',
  'আগস্ট',
  'সেপ্টেম্বর',
  'অক্টোবর',
  'নভেম্বর',
  'ডিসেম্বর',
]);

/** Weekday names, রবিবার (Sunday) first, matching `Date#getDay()`. */
export const BANGLA_WEEKDAYS: readonly string[] = nfc([
  'রবিবার',
  'সোমবার',
  'মঙ্গলবার',
  'বুধবার',
  'বৃহস্পতিবার',
  'শুক্রবার',
  'শনিবার',
]);

/** The six seasons (ঋতু), two Bangla months each, গ্রীষ্ম first. */
export const BANGLA_SEASONS: readonly string[] = nfc(['গ্রীষ্ম', 'বর্ষা', 'শরৎ', 'হেমন্ত', 'শীত', 'বসন্ত']);

/** A calendar date without a time or time zone. Months are 1-based. */
export interface PlainDate {
  year: number;
  month: number;
  day: number;
}

/** A date in the Bangla calendar, with names filled in. */
export interface BanglaDate extends PlainDate {
  /** Month name, for example `বৈশাখ`. */
  monthName: string;
  /** 0 = রবিবার (Sunday) ... 6 = শনিবার. */
  weekday: number;
  weekdayName: string;
  /** 0 = গ্রীষ্ম ... 5 = বসন্ত. */
  season: number;
  seasonName: string;
  /** Day of the Bangla year, 1 = ১ বৈশাখ. */
  dayOfYear: number;
}

/**
 * A `Date`, an ISO `YYYY-MM-DD` string (a longer ISO timestamp is cut to its
 * date part) or a `{ year, month, day }` object in the Gregorian calendar.
 */
export type DateInput = Date | string | PlainDate;

export interface DateInputOptions {
  /**
   * How a `Date` is turned into a calendar day: `local` (default) uses the
   * runtime's time zone, `UTC` uses UTC, and any IANA name such as
   * `Asia/Dhaka` uses that zone. Strings and plain objects are not affected.
   */
  timeZone?: string;
}

const DAY_MS = 86_400_000;
/** Gregorian year minus this is the Bangla year from ১ বৈশাখ onwards. */
const YEAR_OFFSET = 593;

function isGregorianLeap(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Days since 1970-01-01 for a Gregorian date. Works for years below 100 too. */
function epochDay(year: number, month: number, day: number): number {
  const d = new Date(0);
  d.setUTCFullYear(year, month - 1, day);
  return Math.floor(d.getTime() / DAY_MS);
}

function fromEpochDay(days: number): PlainDate {
  const d = new Date(days * DAY_MS);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

function gregorianMonthLength(year: number, month: number): number {
  return [31, isGregorianLeap(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]!;
}

function assertInteger(name: string, value: number): void {
  if (!Number.isInteger(value)) throw new RangeError(`${name} must be an integer, got ${value}`);
}

function checkGregorian(date: PlainDate): PlainDate {
  const { year, month, day } = date;
  assertInteger('year', year);
  assertInteger('month', month);
  assertInteger('day', day);
  if (month < 1 || month > 12) throw new RangeError(`month must be 1..12, got ${month}`);
  const max = gregorianMonthLength(year, month);
  if (day < 1 || day > max) throw new RangeError(`day must be 1..${max} for ${year}-${month}, got ${day}`);
  return { year, month, day };
}

function zonedParts(date: Date, timeZone: string): PlainDate {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    era: 'short',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  let year = Number(get('year'));
  if (/^B/i.test(get('era'))) year = 1 - year;
  return { year, month: Number(get('month')), day: Number(get('day')) };
}

/** Turns any {@link DateInput} into a validated Gregorian `{ year, month, day }`. */
export function toPlainDate(input: DateInput, options: DateInputOptions = {}): PlainDate {
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) throw new RangeError('invalid Date');
    const tz = options.timeZone ?? 'local';
    if (tz === 'local')
      return { year: input.getFullYear(), month: input.getMonth() + 1, day: input.getDate() };
    if (tz.toUpperCase() === 'UTC') {
      return { year: input.getUTCFullYear(), month: input.getUTCMonth() + 1, day: input.getUTCDate() };
    }
    return zonedParts(input, tz);
  }
  if (typeof input === 'string') {
    const m = /^\s*([+-]?\d{4,6})-(\d{1,2})-(\d{1,2})(?:$|[T\s])/.exec(toLatinDigits(input));
    if (!m) throw new RangeError(`expected a YYYY-MM-DD date, got ${JSON.stringify(input)}`);
    return checkGregorian({ year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) });
  }
  return checkGregorian(input);
}

/** True when ফাল্গুন of this Bangla year has 30 days. */
export function isBanglaLeapYear(year: number): boolean {
  assertInteger('year', year);
  return isGregorianLeap(year + YEAR_OFFSET + 1);
}

/** Number of days in a Bangla month (`month` is 1 for বৈশাখ ... 12 for চৈত্র). */
export function banglaMonthLength(year: number, month: number): number {
  assertInteger('month', month);
  if (month < 1 || month > 12) throw new RangeError(`month must be 1..12, got ${month}`);
  if (month <= 6) return 31;
  if (month === 11) return isBanglaLeapYear(year) ? 30 : 29;
  return 30;
}

function seasonOf(month: number): number {
  return Math.floor((month - 1) / 2);
}

/**
 * Converts a Gregorian date to the Bangla calendar.
 *
 * `toBanglaDate('2026-04-14')` -> `{ year: 1433, month: 1, day: 1, monthName: 'বৈশাখ', ... }`
 */
export function toBanglaDate(input: DateInput, options: DateInputOptions = {}): BanglaDate {
  const g = toPlainDate(input, options);
  const afterNewYear = g.month > 4 || (g.month === 4 && g.day >= 14);
  const year = g.year - YEAR_OFFSET - (afterNewYear ? 0 : 1);
  const today = epochDay(g.year, g.month, g.day);
  let offset = today - epochDay(year + YEAR_OFFSET, 4, 14);
  const dayOfYear = offset + 1;
  let month = 1;
  for (;;) {
    const len = banglaMonthLength(year, month);
    if (offset < len) break;
    offset -= len;
    month += 1;
  }
  const weekday = (((today + 4) % 7) + 7) % 7; // 1970-01-01 was a Thursday
  const season = seasonOf(month);
  return {
    year,
    month,
    day: offset + 1,
    monthName: BANGLA_MONTHS[month - 1]!,
    weekday,
    weekdayName: BANGLA_WEEKDAYS[weekday]!,
    season,
    seasonName: BANGLA_SEASONS[season]!,
    dayOfYear,
  };
}

/**
 * Converts a Bangla calendar date to a Gregorian `{ year, month, day }`.
 * Throws a `RangeError` for days that do not exist, such as ৩০ ফাল্গুন in a
 * non-leap year.
 *
 * `fromBanglaDate({ year: 1433, month: 1, day: 1 })` -> `{ year: 2026, month: 4, day: 14 }`
 */
export function fromBanglaDate(date: PlainDate): PlainDate {
  const { year, month, day } = date;
  assertInteger('year', year);
  assertInteger('day', day);
  const max = banglaMonthLength(year, month);
  if (day < 1 || day > max) {
    throw new RangeError(`day must be 1..${max} for ${BANGLA_MONTHS[month - 1]} ${year}, got ${day}`);
  }
  let offset = day - 1;
  for (let m = 1; m < month; m++) offset += banglaMonthLength(year, m);
  return fromEpochDay(epochDay(year + YEAR_OFFSET, 4, 14) + offset);
}

export interface FormatBanglaDateOptions extends DateInputOptions {
  /** `bangla` (default) for বঙ্গাব্দ, `gregorian` for Gregorian dates with Bangla names. */
  calendar?: 'bangla' | 'gregorian';
  /**
   * Pattern, default `d MMMM y`. Tokens: `d` / `dd` day, `M` / `MM` month
   * number, `MMMM` month name, `y` year, `EEEE` weekday name, `r` season
   * (ঋতু). Text in single quotes is copied as is (`''` is a quote); any other
   * character, including all Bangla text, is copied unchanged.
   */
  pattern?: string;
  /** `bn` (default) for Bangla digits, `latin` for ASCII digits. */
  digits?: 'bn' | 'latin';
}

const TOKEN = /'(?:[^']|'')*'|EEEE|MMMM|MM|M|dd|d|y+|r/g;

/**
 * Formats a date in Bangla.
 *
 * ```js
 * formatBanglaDate('2026-04-14');                                  // '১ বৈশাখ ১৪৩৩'
 * formatBanglaDate('2026-04-14', { pattern: 'EEEE, d MMMM y বঙ্গাব্দ' }); // 'মঙ্গলবার, ১ বৈশাখ ১৪৩৩ বঙ্গাব্দ'
 * formatBanglaDate('2026-12-16', { calendar: 'gregorian' });       // '১৬ ডিসেম্বর ২০২৬'
 * ```
 */
export function formatBanglaDate(input: DateInput, options: FormatBanglaDateOptions = {}): string {
  const { calendar = 'bangla', pattern = 'd MMMM y', digits = 'bn' } = options;
  const bangla = toBanglaDate(input, options);
  const shown: PlainDate = calendar === 'gregorian' ? toPlainDate(input, options) : bangla;
  const monthName =
    calendar === 'gregorian' ? GREGORIAN_MONTHS_BN[shown.month - 1]! : BANGLA_MONTHS[shown.month - 1]!;
  const num = (n: number, width = 1) => {
    const text = String(Math.abs(n)).padStart(width, '0');
    const signed = n < 0 ? `-${text}` : text;
    return digits === 'bn' ? toBanglaDigits(signed) : signed;
  };
  return pattern.replace(TOKEN, (token) => {
    if (token.startsWith("'")) return token.length === 2 ? "'" : token.slice(1, -1).replace(/''/g, "'");
    switch (token) {
      case 'd':
        return num(shown.day);
      case 'dd':
        return num(shown.day, 2);
      case 'M':
        return num(shown.month);
      case 'MM':
        return num(shown.month, 2);
      case 'MMMM':
        return monthName;
      case 'EEEE':
        return bangla.weekdayName;
      case 'r':
        return bangla.seasonName;
      default:
        return num(shown.year, token.length);
    }
  });
}

/** Folded month name -> 1-based month number. Built lazily. */
let monthIndex: Map<string, number> | undefined;

function monthKey(name: string): string {
  return fold(name, { ja: true, ra: true, candrabindu: true });
}

function lookupMonth(name: string): number | undefined {
  if (!monthIndex) {
    const index = new Map<string, number>();
    for (const [i, m] of BANGLA_MONTHS.entries()) index.set(monthKey(m), i + 1);
    // common alternative spellings
    const variants: Array<[string, number]> = [
      ['জৈষ্ঠ', 2],
      ['জ্যৈষ্ঠ্য', 2],
      ['আষাঢ', 3],
      ['শ্রাবন', 4],
      ['আশিন', 6],
      ['কার্ত্তিক', 7],
      ['অঘ্রাণ', 8],
      ['অগ্রহায়ন', 8],
      ['ফাগুন', 11],
      ['চৈতৃ', 12],
    ];
    for (const [v, i] of variants) index.set(monthKey(v.normalize('NFC')), i);
    monthIndex = index;
  }
  return monthIndex.get(monthKey(name));
}

/**
 * Parses a Bangla calendar date written as day, month name and year, such as
 * `১ বৈশাখ ১৪৩৩`, `১লা বৈশাখ, ১৪৩৩ বঙ্গাব্দ` or `8 ফাল্গুন 1432 সন`. Month names are matched loosely (spelling variants
 * such as শ্রাবন or অঘ্রাণ are accepted). Returns `null` when the text is
 * not a valid date.
 */
export function parseBanglaDate(text: string): PlainDate | null {
  const cleaned = toLatinDigits(text.normalize('NFC'))
    .replace(/[,।]/g, ' ')
    .replace(/(বঙ্গাব্দ|বঙ্গাব্দে|সন|সাল|খ্রিস্টাব্দ)\s*$/u, '')
    .trim();
  const m = /^(\d{1,2})\s*(?:লা|রা|ঠা|ই|শে)?\s+(\S+)\s+(\d{1,5})$/u.exec(cleaned);
  if (!m) return null;
  const month = lookupMonth(m[2]!);
  if (month === undefined) return null;
  const date = { year: Number(m[3]), month, day: Number(m[1]) };
  if (date.day < 1 || date.day > banglaMonthLength(date.year, month)) return null;
  return date;
}
