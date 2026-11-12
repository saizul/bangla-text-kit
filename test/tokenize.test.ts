import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { tokenize, wordCount, words } from '../src/index.js';

describe('tokenize', () => {
  it('splits Bangla words and keeps marks, conjuncts and joiners', () => {
    assert.deepEqual(words('আমি ক্ষমা চাই। র\u200D্যাব এসেছে!'), ['আমি', 'ক্ষমা', 'চাই', 'র\u200D্যাব', 'এসেছে']);
  });

  it('types, offsets and danda as punctuation', () => {
    const tokens = tokenize('দাম ১২,৫০০.৭৫ টাকা।');
    assert.deepEqual(
      tokens.map((t) => [t.type, t.text]),
      [
        ['word', 'দাম'],
        ['whitespace', ' '],
        ['number', '১২,৫০০.৭৫'],
        ['whitespace', ' '],
        ['word', 'টাকা'],
        ['punctuation', '।'],
      ],
    );
    for (const t of tokens) assert.equal('দাম ১২,৫০০.৭৫ টাকা।'.slice(t.start, t.end), t.text);
  });

  it('numbers with suffixes are words, list commas split', () => {
    assert.deepEqual(words('১০টা বই, ২টি খাতা'), ['১০টা', 'বই', '২টি', 'খাতা']);
    assert.deepEqual(words('1, 2, 3'), ['1', '2', '3']);
    assert.deepEqual(words('১০টা বই ৫', { numbers: false }), ['১০টা', 'বই']);
  });

  it('hyphens and apostrophes inside words', () => {
    assert.deepEqual(words('সাদা-কালো ছবি, don’t stop'), ['সাদা-কালো', 'ছবি', 'don’t', 'stop']);
    assert.deepEqual(words('সাদা-কালো', { splitHyphens: true }), ['সাদা', 'কালো']);
    assert.deepEqual(words('- আগে -পরে'), ['আগে', 'পরে']);
  });

  it('mixed scripts, emoji, symbols', () => {
    const tokens = tokenize('Facebook-এ ৳৫০০ 👍🏽 #ঢাকা');
    assert.deepEqual(
      tokens.filter((t) => t.type !== 'whitespace').map((t) => [t.type, t.text]),
      [
        ['word', 'Facebook-এ'],
        ['symbol', '৳'],
        ['number', '৫০০'],
        ['symbol', '👍🏽'],
        ['punctuation', '#'],
        ['word', 'ঢাকা'],
      ],
    );
    assert.deepEqual(words('Hello WORLD', { lowercase: true }), ['hello', 'world']);
  });

  it('can normalize first', () => {
    assert.deepEqual(words('হ\u09DF দু:খ', { normalize: true }), ['হয\u09BC', 'দুঃখ']);
  });

  it('counts words', () => {
    assert.equal(wordCount('আমার সোনার বাংলা, আমি তোমায\u09BC ভালোবাসি। ১৯৭১'), 6);
    assert.equal(wordCount(''), 0);
    assert.deepEqual(tokenize(''), []);
  });
});
