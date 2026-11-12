import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatNumber, hasBanglaDigits, parseNumber, toBanglaDigits, toLatinDigits } from '../src/index.js';

describe('digits', () => {
  it('converts ASCII to Bangla digits', () => {
    assert.equal(toBanglaDigits('0123456789'), '০১২৩৪৫৬৭৮৯');
    assert.equal(toBanglaDigits(2026), '২০২৬');
    assert.equal(toBanglaDigits(-12.5), '-১২.৫');
    assert.equal(toBanglaDigits(12345678901234567890n), '১২৩৪৫৬৭৮৯০১২৩৪৫৬৭৮৯০');
    assert.equal(toBanglaDigits('Tel: 01712-345678'), 'Tel: ০১৭১২-৩৪৫৬৭৮');
  });

  it('converts Bangla to ASCII digits', () => {
    assert.equal(toLatinDigits('০১২৩৪৫৬৭৮৯'), '0123456789');
    assert.equal(toLatinDigits('৳ ১,২৩৪.৫০'), '৳ 1,234.50');
  });

  it('round-trips', () => {
    for (const s of ['0', '42', '3.14159', 'x9y8z7', '']) assert.equal(toLatinDigits(toBanglaDigits(s)), s);
  });

  it('does not touch other digit systems or similar-looking letters', () => {
    // Devanagari digits and Bengali letters that resemble digits stay as they are
    assert.equal(toLatinDigits('०१'), '०१');
    assert.equal(toLatinDigits('৴৷'), '৴৷'); // currency numerators
    assert.equal(toLatinDigits('ঋ'), 'ঋ');
  });

  it('detects Bangla digits', () => {
    assert.ok(hasBanglaDigits('২০'));
    assert.ok(!hasBanglaDigits('20'));
  });
});

describe('formatNumber', () => {
  it('uses lakh/crore grouping by default', () => {
    assert.equal(formatNumber(1234567), '১২,৩৪,৫৬৭');
    assert.equal(formatNumber(123456789, { digits: 'latin' }), '12,34,56,789');
    assert.equal(formatNumber(1000, { digits: 'latin' }), '1,000');
    assert.equal(formatNumber(999, { digits: 'latin' }), '999');
    assert.equal(formatNumber(100000, { digits: 'latin' }), '1,00,000');
  });

  it('supports international grouping, none, decimals and negatives', () => {
    assert.equal(formatNumber(1234567.891, { digits: 'latin', grouping: 'international' }), '1,234,567.891');
    assert.equal(formatNumber(1234567, { digits: 'latin', grouping: 'none' }), '1234567');
    assert.equal(formatNumber(1500, { digits: 'latin', fractionDigits: 2 }), '1,500.00');
    assert.equal(formatNumber(-2500000, { digits: 'latin' }), '-25,00,000');
    assert.equal(
      formatNumber(1e21, { digits: 'latin', grouping: 'international' }),
      '1,000,000,000,000,000,000,000',
    );
    assert.equal(formatNumber(12345n, { digits: 'latin', separator: ' ' }), '12 345');
  });

  it('accepts numeric strings in either digit system', () => {
    assert.equal(formatNumber('১২৩৪৫৬'), '১,২৩,৪৫৬');
    assert.equal(formatNumber('1,23,456.5', { digits: 'latin', grouping: 'international' }), '123,456.5');
    assert.throws(() => formatNumber('abc'), RangeError);
    assert.throws(() => formatNumber(Number.NaN), RangeError);
  });

  it('parses numbers', () => {
    assert.equal(parseNumber('১২,৩৪,৫৬৭.৫০'), 1234567.5);
    assert.equal(parseNumber(' -42 '), -42);
    assert.equal(parseNumber('−৫'), -5);
    assert.equal(parseNumber('.5'), 0.5);
    assert.ok(Number.isNaN(parseNumber('১২a')));
    assert.ok(Number.isNaN(parseNumber('')));
  });
});
