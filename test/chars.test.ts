import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CH,
  CP,
  describeCodePoints,
  isAssignedBengali,
  isBanglaDigit,
  isConsonant,
  isIndependentVowel,
  isPreBaseVowelSign,
  isVowelSign,
} from '../src/index.js';

// Code points checked against the Unicode Bengali chart (U+0980..U+09FF).
describe('Bengali block code points', () => {
  it('match the Unicode chart', () => {
    assert.equal(CP.CANDRABINDU, 0x0981);
    assert.equal(CP.VISARGA, 0x0983);
    assert.equal(CP.NUKTA, 0x09bc);
    assert.equal(CP.VIRAMA, 0x09cd);
    assert.equal(CP.KHANDA_TA, 0x09ce);
    assert.equal(CP.AU_LENGTH_MARK, 0x09d7);
    assert.equal(CP.RRA, 0x09dc);
    assert.equal(CP.RHA, 0x09dd);
    assert.equal(CP.YYA, 0x09df);
    assert.equal(CP.SIGN_O, 0x09cb);
    assert.equal(CP.SIGN_AU, 0x09cc);
    assert.equal(CP.DIGIT_ZERO, 0x09e6);
    assert.equal(CP.DIGIT_NINE, 0x09ef);
    assert.equal(CP.RUPEE_SIGN, 0x09f3);
    assert.equal(CP.SANDHI_MARK, 0x09fe);
    assert.equal(CP.DANDA, 0x0964);
    assert.equal(CP.DOUBLE_DANDA, 0x0965);
    assert.equal(CH.KHANDA_TA, 'ৎ');
  });

  it('RRA, RHA and YYA are composition exclusions: NFC decomposes them', () => {
    assert.equal('\u09DC'.normalize('NFC'), 'ড\u09BC');
    assert.equal('\u09DD'.normalize('NFC'), 'ঢ\u09BC');
    assert.equal('\u09DF'.normalize('NFC'), 'য\u09BC');
    // and the decomposed form does not recompose
    assert.equal('য\u09BC'.normalize('NFC'), 'য\u09BC');
  });

  it('O and AU signs compose under NFC', () => {
    assert.equal('ো'.normalize('NFC'), 'ো');
    assert.equal('ে\u09D7'.normalize('NFC'), 'ৌ');
    assert.equal('ো'.normalize('NFD'), 'ো');
  });

  it('khanda ta has no decomposition', () => {
    assert.equal('ৎ'.normalize('NFD'), 'ৎ');
  });

  it('knows which code points are assigned', () => {
    for (const cp of [
      0x0984, 0x098d, 0x098e, 0x0991, 0x0992, 0x09a9, 0x09b1, 0x09b3, 0x09b4, 0x09b5, 0x09ba, 0x09bb, 0x09c5,
      0x09c6, 0x09c9, 0x09ca, 0x09cf, 0x09d8, 0x09de, 0x09e4, 0x09e5, 0x09ff,
    ]) {
      assert.equal(isAssignedBengali(cp), false, cp.toString(16));
    }
    for (const cp of [0x0980, 0x0985, 0x09b2, 0x09bc, 0x09ce, 0x09d7, 0x09df, 0x09fe]) {
      assert.equal(isAssignedBengali(cp), true, cp.toString(16));
    }
  });

  it('classifies letters and signs', () => {
    assert.ok(isConsonant(0x0995)); // KA
    assert.ok(isConsonant(0x09b9)); // HA
    assert.ok(isConsonant(CP.YYA));
    assert.ok(isConsonant(CP.KHANDA_TA));
    assert.ok(!isConsonant(0x09b1)); // unassigned
    assert.ok(!isConsonant(CP.NUKTA));
    assert.ok(isIndependentVowel(0x0985));
    assert.ok(isIndependentVowel(CP.VOCALIC_RR));
    assert.ok(!isIndependentVowel(0x0995));
    assert.ok(isVowelSign(CP.SIGN_AA));
    assert.ok(isVowelSign(CP.AU_LENGTH_MARK));
    assert.ok(!isVowelSign(CP.VIRAMA));
    assert.ok(
      isPreBaseVowelSign(CP.SIGN_I) && isPreBaseVowelSign(CP.SIGN_E) && isPreBaseVowelSign(CP.SIGN_AI),
    );
    assert.ok(!isPreBaseVowelSign(CP.SIGN_O));
    assert.ok(isBanglaDigit(0x09ea) && !isBanglaDigit(0x34));
  });

  it('describes code points', () => {
    assert.equal(describeCodePoints('ক্ষ'), 'U+0995 U+09CD U+09B7');
    assert.equal(describeCodePoints('\u{1F600}'), 'U+1F600');
  });
});
