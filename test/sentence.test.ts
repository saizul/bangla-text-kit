import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sentenceSpans, splitSentences } from '../src/index.js';

describe('splitSentences', () => {
  it('splits on দাঁড\u09BCি, ? and !', () => {
    assert.deepEqual(splitSentences('আমি ভাত খাই। তুমি কী খাও? দারুণ!'), ['আমি ভাত খাই।', 'তুমি কী খাও?', 'দারুণ!']);
  });

  it('splits on danda even without a following space', () => {
    assert.deepEqual(splitSentences('আমি যাব।তুমি থাকো।'), ['আমি যাব।', 'তুমি থাকো।']);
  });

  it('double danda and repeated terminators', () => {
    assert.deepEqual(splitSentences('শ্লোক এক॥ শ্লোক দুই॥'), ['শ্লোক এক॥', 'শ্লোক দুই॥']);
    assert.deepEqual(splitSentences('কী!? সত্যি?? হ্যাঁ।'), ['কী!?', 'সত্যি??', 'হ্যাঁ।']);
  });

  it('keeps closing quotes and brackets with the sentence', () => {
    assert.deepEqual(splitSentences('সে বলল, "আমি যাব।" তারপর গেল।'), ['সে বলল, "আমি যাব।"', 'তারপর গেল।']);
    assert.deepEqual(splitSentences('(এটা ঠিক।) পরের কথা।'), ['(এটা ঠিক।)', 'পরের কথা।']);
  });

  it('does not split decimals, abbreviations or initials', () => {
    assert.deepEqual(splitSentences('দাম ৩.৫ টাকা। ঠিক আছে।'), ['দাম ৩.৫ টাকা।', 'ঠিক আছে।']);
    assert.deepEqual(splitSentences('ড. মুহাম্মদ ইউনূস এসেছেন। মো. করিম নেই।'), [
      'ড. মুহাম্মদ ইউনূস এসেছেন।',
      'মো. করিম নেই।',
    ]);
    assert.deepEqual(splitSentences('এ. কে. ফজলুল হক বক্তৃতা দেন।'), ['এ. কে. ফজলুল হক বক্তৃতা দেন।']);
    assert.deepEqual(splitSentences('Dr. Rahman met Mr. Khan. They talked.'), [
      'Dr. Rahman met Mr. Khan.',
      'They talked.',
    ]);
    assert.deepEqual(splitSentences('বি.দ্র. সভা বাতিল। ধন্যবাদ।'), ['বি.দ্র. সভা বাতিল।', 'ধন্যবাদ।']);
  });

  it('a one-letter word at the end of a sentence still ends it', () => {
    assert.deepEqual(splitSentences('আমি যাব না. তুমি যাও.'), ['আমি যাব না.', 'তুমি যাও.']);
  });

  it('URLs and ellipses', () => {
    assert.deepEqual(splitSentences('দেখুন example.com সাইটে। আচ্ছা... ঠিক আছে।'), [
      'দেখুন example.com সাইটে।',
      'আচ্ছা...',
      'ঠিক আছে।',
    ]);
  });

  it('paragraph breaks always split, single newlines only on request', () => {
    assert.deepEqual(splitSentences('প্রথম অনুচ্ছেদ\n\nদ্বিতীয\u09BC অনুচ্ছেদ'), [
      'প্রথম অনুচ্ছেদ',
      'দ্বিতীয\u09BC অনুচ্ছেদ',
    ]);
    assert.deepEqual(splitSentences('শিরোনাম\nলেখা'), ['শিরোনাম\nলেখা']);
    assert.deepEqual(splitSentences('শিরোনাম\nলেখা', { splitOnNewline: true }), ['শিরোনাম', 'লেখা']);
  });

  it('custom abbreviations', () => {
    assert.deepEqual(splitSentences('প্রকৌ. রহিম এলেন।'), ['প্রকৌ.', 'রহিম এলেন।']);
    assert.deepEqual(splitSentences('প্রকৌ. রহিম এলেন।', { extraAbbreviations: ['প্রকৌ.'] }), [
      'প্রকৌ. রহিম এলেন।',
    ]);
  });

  it('spans point into the original text', () => {
    const text = '  আমি যাব।   তুমি?  ';
    const spans = sentenceSpans(text);
    assert.equal(spans.length, 2);
    for (const s of spans) assert.equal(text.slice(s.start, s.end), s.text);
  });

  it('text without a terminator is one sentence; empty text none', () => {
    assert.deepEqual(splitSentences('শেষ নেই'), ['শেষ নেই']);
    assert.deepEqual(splitSentences('   '), []);
  });
});
