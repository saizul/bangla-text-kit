import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  graphemeLength,
  graphemes,
  hasIntlSegmenter,
  reverseGraphemes,
  segmentGraphemesBuiltin,
  sliceGraphemes,
  truncate,
} from '../src/index.js';

const B = { engine: 'builtin' } as const;

describe('builtin grapheme segmenter', () => {
  it('keeps vowel signs and marks on their consonant', () => {
    assert.deepEqual(graphemes('বাংলা', B), ['বাং', 'লা']);
    assert.deepEqual(graphemes('কোঁ', B), ['কোঁ']);
    assert.deepEqual(graphemes('আমি', B), ['আ', 'মি']);
    assert.deepEqual(graphemes('দুঃখ', B), ['দুঃ', 'খ']);
  });

  it('keeps conjuncts together (GB9c)', () => {
    assert.deepEqual(graphemes('ক্ষমা', B), ['ক্ষ', 'মা']);
    assert.deepEqual(graphemes('স্ত্রী', B), ['স্ত্রী']);
    assert.deepEqual(graphemes('বিশ্ববিদ্যালয\u09BC', B), ['বি', 'শ্ব', 'বি', 'দ্যা', 'ল', 'য\u09BC']);
  });

  it('ZWJ continues a conjunct, ZWNJ breaks it', () => {
    assert.deepEqual(graphemes('র\u200D্যাব', B), ['র\u200D্যা', 'ব']);
    assert.deepEqual(graphemes('ক্\u200Cষ', B), ['ক্\u200C', 'ষ']);
    assert.deepEqual(graphemes('ক্\u200Dষ', B), ['ক্\u200Dষ']);
  });

  it('nukta forms and khanda ta', () => {
    assert.deepEqual(graphemes('য\u09BC', B), ['য\u09BC']);
    assert.deepEqual(graphemes('য\u09BCে', B), ['য\u09BCে']);
    assert.deepEqual(graphemes('ৎস', B), ['ৎ', 'স']);
    assert.deepEqual(graphemes('উৎসব', B), ['উ', 'ৎ', 'স', 'ব']);
  });

  it('a final virama stays with its consonant', () => {
    assert.deepEqual(graphemes('ক্', B), ['ক্']);
    assert.deepEqual(graphemes('ক্ ক', B), ['ক্', ' ', 'ক']);
  });

  it('can split conjuncts when asked', () => {
    assert.deepEqual(segmentGraphemesBuiltin('ক্ষ', false), ['ক্', 'ষ']);
  });

  it('handles emoji, flags, CRLF and combining marks of other scripts', () => {
    assert.deepEqual(graphemes('👍🏽!', B), ['👍🏽', '!']);
    assert.deepEqual(graphemes('👨\u200D👩\u200D👧', B), ['👨\u200D👩\u200D👧']);
    assert.deepEqual(graphemes('🇧🇩🇧🇩', B), ['🇧🇩', '🇧🇩']);
    assert.deepEqual(graphemes('a\r\nb', B), ['a', '\r\n', 'b']);
    assert.deepEqual(graphemes('éx', B), ['é', 'x']);
    assert.deepEqual(graphemes('', B), []);
  });
});

describe('grapheme helpers', () => {
  it('length and slice', () => {
    assert.equal(graphemeLength('বাংলাদেশ', B), 4);
    assert.equal('বাংলাদেশ'.length, 8);
    assert.equal(sliceGraphemes('বাংলাদেশ', 2, undefined, B), 'দেশ');
    assert.equal(sliceGraphemes('বাংলাদেশ', -1, undefined, B), 'শ');
  });

  it('truncate never splits a cluster', () => {
    assert.equal(truncate('স্বাধীনতা দিবস', 4, B), 'স্বাধীন…');
    assert.equal(truncate('বাংলা', 5, B), 'বাংলা');
    assert.equal(truncate('বাংলাদেশ', 3, { ...B, ellipsis: '' }), 'বাংলাদে');
    assert.equal(truncate('আমার সোনার বাংলা', 8, { ...B, wordBoundary: true }), 'আমার…');
    assert.equal(truncate('বাংলাদেশ', 1, B), '…');
    assert.equal(truncate('বাংলাদেশ', 0, B), '');
    assert.throws(() => truncate('x', -1));
  });

  it('reverses by cluster', () => {
    assert.equal(reverseGraphemes('ক্ষমা', B), 'মাক্ষ');
  });
});

describe('Intl.Segmenter engine', { skip: !hasIntlSegmenter() }, () => {
  it('agrees with the builtin engine on simple clusters', () => {
    for (const word of ['বাংলা', 'কোঁ', 'আমি', 'য\u09BCে', 'দুঃখ']) {
      assert.deepEqual(graphemes(word, { engine: 'intl' }), graphemes(word, B), word);
    }
  });

  it('auto uses Intl when available', () => {
    assert.deepEqual(graphemes('আমি'), graphemes('আমি', { engine: 'intl' }));
  });

  it('never splits inside a vowel sign cluster, whatever the ICU version', () => {
    const parts = graphemes('স্ত্রী', { engine: 'intl' });
    assert.equal(parts.join(''), 'স্ত্রী');
    assert.ok(parts.every((p) => !/^[া-ৌ]/u.test(p)));
  });
});
