import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { banglaRatio, containsBangla, dominantScript, isBangla, scriptStats } from '../src/index.js';

describe('script detection', () => {
  it('pure Bangla, pure English, empty', () => {
    assert.equal(banglaRatio('আমার সোনার বাংলা'), 1);
    assert.equal(banglaRatio('Hello world'), 0);
    assert.equal(banglaRatio(''), 0);
    assert.equal(banglaRatio('123 !!! ...'), 0);
  });

  it('counts letters and marks, ignores spaces and punctuation', () => {
    const s = scriptStats('কি? ok');
    assert.equal(s.bangla, 2); // ক + ি
    assert.equal(s.latin, 2);
    assert.equal(s.total, 4);
    assert.equal(s.banglaRatio, 0.5);
  });

  it('digits are ignored unless asked', () => {
    assert.equal(scriptStats('১২৩').total, 0);
    assert.equal(scriptStats('১২৩').banglaDigits, 3);
    assert.equal(banglaRatio('১২৩ abc', { countDigits: true }), 0.5);
  });

  it('joiners and nukta letters', () => {
    const s = scriptStats('র\u200D্যাব \u09DF');
    assert.equal(s.bangla, 6);
    assert.equal(s.total, 6);
  });

  it('other scripts', () => {
    const s = scriptStats('বাংলা हिन्दी');
    assert.ok(s.other > 0);
    assert.equal(dominantScript('हिन्दी भाषा'), 'other');
  });

  it('isBangla with threshold and minimum length', () => {
    assert.ok(isBangla('আমি Facebook ব্যবহার করি'));
    assert.ok(!isBangla('I use ফেসবুক every day'));
    assert.ok(isBangla('I use ফেসবুক every day', { threshold: 0.2 }));
    assert.ok(!isBangla('ক', { minLetters: 3 }));
    assert.ok(!isBangla(''));
  });

  it('dominant script and containsBangla', () => {
    assert.equal(dominantScript('বাংলা text'), 'bangla');
    assert.equal(dominantScript('English text বা'), 'latin');
    assert.equal(dominantScript('...'), 'none');
    assert.ok(containsBangla('hello ক'));
    assert.ok(!containsBangla('hello ১২৩'));
  });
});
