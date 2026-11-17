import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  BANGLA_MONTHS,
  BANGLA_SEASONS,
  BANGLA_WEEKDAYS,
  banglaMonthLength,
  formatBanglaDate,
  fromBanglaDate,
  GREGORIAN_MONTHS_BN,
  isBanglaLeapYear,
  isNormalized,
  parseBanglaDate,
  toBanglaDate,
  toPlainDate,
} from '../src/index.js';

// Nukta letters are written as escapes so the code points under test are visible.
const ASHAR = 'আষাঢ়';

describe('toBanglaDate', () => {
  it('starts the year on 14 April', () => {
    const d = toBanglaDate('2026-04-14');
    assert.deepEqual(
      { year: d.year, month: d.month, day: d.day, monthName: d.monthName, dayOfYear: d.dayOfYear },
      { year: 1433, month: 1, day: 1, monthName: 'বৈশাখ', dayOfYear: 1 },
    );
    const eve = toBanglaDate('2026-04-13');
    assert.deepEqual([eve.year, eve.month, eve.day, eve.monthName], [1432, 12, 30, 'চৈত্র']);
    assert.equal(eve.dayOfYear, 365);
  });

  it('puts the national days on their fixed Bangla dates', () => {
    for (const year of [2019, 2020, 2023, 2024, 2025, 2026, 2028, 2100]) {
      const ekushe = toBanglaDate({ year, month: 2, day: 21 });
      assert.deepEqual([ekushe.month, ekushe.day], [11, 8], `21 Feb ${year}`);
      const independence = toBanglaDate({ year, month: 3, day: 26 });
      assert.deepEqual([independence.month, independence.day], [12, 12], `26 Mar ${year}`);
      const victory = toBanglaDate({ year, month: 12, day: 16 });
      assert.deepEqual([victory.month, victory.day], [9, 1], `16 Dec ${year}`);
    }
  });

  it('gives ফাল্গুন 30 days only when it overlaps a Gregorian leap February', () => {
    // ফাল্গুন 1430 runs through February 2024 (leap)
    assert.equal(isBanglaLeapYear(1430), true);
    assert.equal(banglaMonthLength(1430, 11), 30);
    assert.deepEqual([toBanglaDate('2024-03-14').month, toBanglaDate('2024-03-14').day], [11, 30]);
    assert.equal(toBanglaDate('2024-04-13').dayOfYear, 366);
    // ফাল্গুন 1431 runs through February 2025
    assert.equal(isBanglaLeapYear(1431), false);
    assert.equal(banglaMonthLength(1431, 11), 29);
    assert.deepEqual([toBanglaDate('2025-03-14').month, toBanglaDate('2025-03-14').day], [11, 29]);
    assert.deepEqual([toBanglaDate('2025-03-15').month, toBanglaDate('2025-03-15').day], [12, 1]);
    // century rules: 2100 is not a leap year, 2000 is
    assert.equal(isBanglaLeapYear(2100 - 594), false);
    assert.equal(isBanglaLeapYear(2000 - 594), true);
  });

  it('has the expected month lengths', () => {
    const lengths = Array.from({ length: 12 }, (_, i) => banglaMonthLength(1433, i + 1));
    assert.deepEqual(lengths, [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 29, 30]);
    assert.throws(() => banglaMonthLength(1433, 13), RangeError);
    assert.throws(() => banglaMonthLength(1433, 0), RangeError);
  });

  it('reports weekday and season', () => {
    const d = toBanglaDate('2026-04-14'); // a Tuesday
    assert.equal(d.weekday, 2);
    assert.equal(d.weekdayName, 'মঙ্গলবার');
    assert.equal(d.seasonName, 'গ্রীষ্ম');
    assert.equal(toBanglaDate('2026-07-01').seasonName, 'বর্ষা'); // ১৭ আষাঢ়
    assert.equal(toBanglaDate('2026-12-16').seasonName, 'শীত'); // ১ পৌষ
    assert.equal(toBanglaDate('2027-03-01').seasonName, 'বসন্ত'); // ফাল্গুন
    assert.equal(toBanglaDate('1970-01-01').weekdayName, 'বৃহস্পতিবার');
    assert.equal(toBanglaDate('1969-12-31').weekdayName, 'বুধবার');
  });

  it('accepts Date objects with a time zone', () => {
    // 20:00 UTC on 13 April is already 14 April in Dhaka (UTC+6)
    const instant = new Date(Date.UTC(2026, 3, 13, 20, 0));
    assert.equal(toBanglaDate(instant, { timeZone: 'UTC' }).year, 1432);
    const dhaka = toBanglaDate(instant, { timeZone: 'Asia/Dhaka' });
    assert.deepEqual([dhaka.year, dhaka.month, dhaka.day], [1433, 1, 1]);
    const local = new Date(2026, 3, 14, 12);
    assert.equal(toBanglaDate(local).day, 1);
  });

  it('accepts ISO strings, also with Bangla digits or a time part', () => {
    assert.deepEqual(toPlainDate('২০২৬-০৪-১৪'), { year: 2026, month: 4, day: 14 });
    assert.deepEqual(toPlainDate('2026-04-14T23:59:00+06:00'), { year: 2026, month: 4, day: 14 });
  });

  it('rejects impossible dates', () => {
    assert.throws(() => toBanglaDate('2025-02-29'), RangeError);
    assert.throws(() => toBanglaDate('2026-13-01'), RangeError);
    assert.throws(() => toBanglaDate('14/04/2026'), RangeError);
    assert.throws(() => toBanglaDate(new Date(Number.NaN)), RangeError);
    assert.throws(() => toBanglaDate({ year: 2026, month: 4, day: 1.5 }), RangeError);
  });
});

describe('fromBanglaDate', () => {
  it('converts back to Gregorian', () => {
    assert.deepEqual(fromBanglaDate({ year: 1433, month: 1, day: 1 }), { year: 2026, month: 4, day: 14 });
    assert.deepEqual(fromBanglaDate({ year: 1432, month: 11, day: 8 }), { year: 2026, month: 2, day: 21 });
    assert.deepEqual(fromBanglaDate({ year: 1430, month: 11, day: 30 }), { year: 2024, month: 3, day: 14 });
  });

  it('round-trips every day over several years', () => {
    let checked = 0;
    for (let t = Date.UTC(2019, 0, 1); t <= Date.UTC(2029, 11, 31); t += 86_400_000) {
      const d = new Date(t);
      const g = { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
      assert.deepEqual(fromBanglaDate(toBanglaDate(g)), g);
      checked++;
    }
    assert.equal(checked, 4018);
  });

  it('handles early years without the two-digit year trap of Date.UTC', () => {
    assert.deepEqual(fromBanglaDate({ year: 1, month: 1, day: 1 }), { year: 594, month: 4, day: 14 });
    assert.equal(toBanglaDate({ year: 650, month: 4, day: 14 }).year, 57);
  });

  it('rejects days that do not exist', () => {
    assert.throws(() => fromBanglaDate({ year: 1431, month: 11, day: 30 }), RangeError);
    assert.throws(() => fromBanglaDate({ year: 1433, month: 7, day: 31 }), RangeError);
    assert.throws(() => fromBanglaDate({ year: 1433, month: 0, day: 1 }), RangeError);
  });
});

describe('formatBanglaDate', () => {
  it('formats with the default pattern', () => {
    assert.equal(formatBanglaDate('2026-04-14'), '১ বৈশাখ ১৪৩৩');
    assert.equal(formatBanglaDate('2026-07-01'), `১৭ ${ASHAR} ১৪৩৩`);
  });

  it('supports every token, quoted text and Bangla literals', () => {
    assert.equal(
      formatBanglaDate('2026-04-14', { pattern: 'EEEE, d MMMM y বঙ্গাব্দ (r)' }),
      'মঙ্গলবার, ১ বৈশাখ ১৪৩৩ বঙ্গাব্দ (গ্রীষ্ম)',
    );
    assert.equal(formatBanglaDate('2026-04-14', { pattern: 'dd/MM/y', digits: 'latin' }), '01/01/1433');
    assert.equal(
      formatBanglaDate('2026-04-14', { pattern: "'day' d 'of' M, ''y''", digits: 'latin' }),
      "day 1 of 1, '1433'",
    );
    assert.equal(formatBanglaDate('2026-04-14', { pattern: 'yyyyyy', digits: 'latin' }), '001433');
  });

  it('formats Gregorian dates with Bangla names', () => {
    assert.equal(formatBanglaDate('2026-12-16', { calendar: 'gregorian' }), '১৬ ডিসেম্বর ২০২৬');
    assert.equal(
      formatBanglaDate('2026-02-21', { calendar: 'gregorian', pattern: 'EEEE, d MMMM y' }),
      'শনিবার, ২১ ফেব্রুয়ারি ২০২৬',
    );
  });
});

describe('parseBanglaDate', () => {
  it('parses common written forms', () => {
    assert.deepEqual(parseBanglaDate('১ বৈশাখ ১৪৩৩'), { year: 1433, month: 1, day: 1 });
    assert.deepEqual(parseBanglaDate('১লা বৈশাখ, ১৪৩৩ বঙ্গাব্দ'), { year: 1433, month: 1, day: 1 });
    assert.deepEqual(parseBanglaDate('8 ফাল্গুন 1432 সন'), { year: 1432, month: 11, day: 8 });
    assert.deepEqual(parseBanglaDate('২৫শে বৈশাখ ১৪৩৩'), { year: 1433, month: 1, day: 25 });
  });

  it('accepts spelling variants and both nukta forms', () => {
    assert.equal(parseBanglaDate('১০ শ্রাবন ১৪৩৩')?.month, 4);
    assert.equal(parseBanglaDate('১০ অঘ্রাণ ১৪৩৩')?.month, 8);
    assert.equal(parseBanglaDate('১০ ফাগুন ১৪৩৩')?.month, 11);
    assert.equal(parseBanglaDate('৫ আষাঢ় ১৪৩৩')?.month, 3); // precomposed ঢ়
    assert.equal(parseBanglaDate(`৫ ${ASHAR} ১৪৩৩`)?.month, 3);
  });

  it('returns null for invalid text or days', () => {
    assert.equal(parseBanglaDate('৩০ ফাল্গুন ১৪৩১'), null);
    assert.deepEqual(parseBanglaDate('৩০ ফাল্গুন ১৪৩০'), { year: 1430, month: 11, day: 30 });
    assert.equal(parseBanglaDate('১ জানুয়ারি ২০২৬'), null);
    assert.equal(parseBanglaDate('hello'), null);
    assert.equal(parseBanglaDate(''), null);
  });

  it('round-trips with formatBanglaDate', () => {
    for (const iso of ['2026-04-14', '2026-07-01', '2026-11-17', '2027-03-14']) {
      const parsed = parseBanglaDate(formatBanglaDate(iso));
      assert.ok(parsed);
      assert.deepEqual(fromBanglaDate(parsed), toPlainDate(iso));
    }
  });
});

describe('name tables', () => {
  it('have the right sizes and are normalized', () => {
    assert.equal(BANGLA_MONTHS.length, 12);
    assert.equal(GREGORIAN_MONTHS_BN.length, 12);
    assert.equal(BANGLA_WEEKDAYS.length, 7);
    assert.equal(BANGLA_SEASONS.length, 6);
    for (const name of [...BANGLA_MONTHS, ...GREGORIAN_MONTHS_BN, ...BANGLA_WEEKDAYS, ...BANGLA_SEASONS]) {
      assert.ok(isNormalized(name), name);
    }
    assert.ok(Object.isFrozen(BANGLA_MONTHS));
  });
});
