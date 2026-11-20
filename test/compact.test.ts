import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatCompact, parseCompact } from '../src/index.js';

describe('formatCompact', () => {
  it('uses হাজার, লাখ and কোটি', () => {
    assert.equal(formatCompact(950), '৯৫০');
    assert.equal(formatCompact(1000), '১ হাজার');
    assert.equal(formatCompact(4500), '৪.৫ হাজার');
    assert.equal(formatCompact(1250000), '১২.৫ লাখ');
    assert.equal(formatCompact(100000), '১ লাখ');
    assert.equal(formatCompact(35000000), '৩.৫ কোটি');
    assert.equal(formatCompact(12000000000), '১,২০০ কোটি');
    assert.equal(formatCompact(1e12), '১,০০,০০০ কোটি');
  });

  it('rounds to the fraction digits and moves up a unit when rounding reaches it', () => {
    assert.equal(formatCompact(1234567), '১২.৩৫ লাখ');
    assert.equal(formatCompact(1234567, { maximumFractionDigits: 0 }), '১২ লাখ');
    assert.equal(formatCompact(1234567, { maximumFractionDigits: 4 }), '১২.৩৪৫৭ লাখ');
    assert.equal(formatCompact(99999), '১ লাখ');
    assert.equal(formatCompact(9999999), '১ কোটি');
    assert.equal(formatCompact(999.999), '১ হাজার');
    assert.equal(formatCompact(12.345), '১২.৩৫');
  });

  it('supports Latin digits, English units and no হাজার', () => {
    assert.equal(formatCompact(4500, { digits: 'latin', units: 'en' }), '4.5 thousand');
    assert.equal(formatCompact(2500000, { digits: 'latin', units: 'en' }), '25 lakh');
    assert.equal(formatCompact(50000, { thousand: false }), '৫০,০০০');
    assert.equal(formatCompact(99999.9, { thousand: false, digits: 'latin' }), '99,999.9');
    assert.equal(formatCompact(250000, { thousand: false }), '২.৫ লাখ');
  });

  it('handles negative numbers and zero', () => {
    assert.equal(formatCompact(-1250000), '-১২.৫ লাখ');
    assert.equal(formatCompact(0), '০');
    assert.equal(formatCompact(-0.001), '০');
  });

  it('rejects bad input', () => {
    assert.throws(() => formatCompact(Number.NaN), RangeError);
    assert.throws(() => formatCompact(Number.POSITIVE_INFINITY), RangeError);
    assert.throws(() => formatCompact(1, { maximumFractionDigits: -1 }), RangeError);
    assert.throws(() => formatCompact(1, { maximumFractionDigits: 1.5 }), RangeError);
  });
});

describe('parseCompact', () => {
  it('parses Bangla and English units', () => {
    assert.equal(parseCompact('১২.৫ লাখ'), 1250000);
    assert.equal(parseCompact('১২.৫লাখ'), 1250000);
    assert.equal(parseCompact('৩.৫ কোটি'), 35000000);
    assert.equal(parseCompact('৫ হাজার'), 5000);
    assert.equal(parseCompact('২ লক্ষ'), 200000);
    assert.equal(parseCompact('2 crore'), 20000000);
    assert.equal(parseCompact('1.1 Lakh'), 110000);
    assert.equal(parseCompact('15 lacs'), 1500000);
    assert.equal(parseCompact('12.5k'), 12500);
    assert.equal(parseCompact('১,২০০ কোটি'), 12000000000);
  });

  it('adds several units and plain numbers', () => {
    assert.equal(parseCompact('১ কোটি ২০ লাখ'), 12000000);
    assert.equal(parseCompact('২ লাখ ৫০ হাজার ৫০০'), 250500);
    assert.equal(parseCompact('১২,৩৪৫'), 12345);
  });

  it('ignores currency signs and words', () => {
    assert.equal(parseCompact('৳ ৩ হাজার'), 3000);
    assert.equal(parseCompact('Tk. 2.5 lakh'), 250000);
    assert.equal(parseCompact('৫০ লাখ টাকা'), 5000000);
    assert.equal(parseCompact('-২ কোটি'), -20000000);
  });

  it('returns NaN for text that is not a compact number', () => {
    for (const text of ['', 'লাখ', 'অনেক টাকা', '১২ মিলিয়ন', '২০ লাখ ১ কোটি', '৫ ৬', '১ লাখ লাখ']) {
      assert.ok(Number.isNaN(parseCompact(text)), text);
    }
  });

  it('round-trips with formatCompact', () => {
    for (const n of [1000, 4500, 1250000, 35000000, 12000000000]) {
      assert.equal(parseCompact(formatCompact(n)), n);
      assert.equal(parseCompact(formatCompact(n, { digits: 'latin', units: 'en' })), n);
    }
  });
});
