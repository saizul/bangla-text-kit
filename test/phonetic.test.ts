import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalize, phonetic } from '../src/index.js';

const cases: Array<[string, string]> = [
  ['ami', 'আমি'],
  ['ami banglay gan gai', 'আমি বাংলায\u09BC গান গাই'],
  ['amar sOnar bangla', 'আমার সোনার বাংলা'],
  ['bangladesh', 'বাংলাদেশ'],
  ['kolom', 'কলম'],
  ['dorokar', 'দরকার'],
  ['shikkhok', 'শিক্ষক'],
  ['kSh', 'ক্ষ'],
  ['biggan', 'বিজ্ঞান'],
  ['rongin', 'রঙিন'],
  ['ratri', 'রাত্রি'],
  ['bidyaloy', 'বিদ্যালয\u09BC'],
  ['prrithibi', 'পৃথিবি'],
  ['rrishi', 'ঋশি'],
  ['du:kh', 'দুঃখ'],
  ['ca^d', 'চাঁদ'],
  ['cha^d', 'ছাঁদ'],
  ['hoThat``', 'হঠাৎ'],
  ['kOthay', 'কোথায\u09BC'],
  ['bhai.', 'ভাই।'],
  ['ek..dui', 'এক.দুই'],
  ['20 Taka $', '২০ টাকা ৳'],
  ['korzo', 'কর্য'],
  ['shOndhya', 'শোন্ধ্যা'],
  ['bishw', 'বিশ্ব'],
  ['oi', 'ঐ'],
  ['koi', 'কৈ'],
  ['bou', 'বৌ'],
  ['wa', 'ওয\u09BCা'],
  ['w', 'ও'],
  ['ki`k', 'কিক'],
  ['k`t', 'কত'],
  ['kt', 'ক্ত'],
  ['sTeshon', 'স্টেশন'],
  ['Ongko', 'ওঙ্ক'],
  ['NGc', 'ঞ্চ'],
  ['amra', 'আম্রা'],
  ['amora', 'আমরা'],
  ['k,,', 'ক্\u200C'],
  ['shadhinota', 'শাধিনতা'],
  ['RaRi', 'ড\u09BCাড\u09BCি'],
];

describe('phonetic (Avro-style)', () => {
  for (const [input, expected] of cases) {
    it(`${input} -> ${expected}`, () => {
      assert.equal(normalize(phonetic(input), { joiners: 'keep' }), normalize(expected, { joiners: 'keep' }));
    });
  }

  it('capitals without a meaning of their own are read as lower case', () => {
    assert.equal(phonetic('Bangla'), phonetic('bangla'));
    assert.equal(phonetic('KhoBor'), phonetic('khobor'));
    // but case-sensitive letters keep their meaning: N is ণ, NG is ঞ
    assert.equal(phonetic('BANGLA'), 'বাঞলা');
  });

  it('leaves unknown characters and Bangla text alone', () => {
    assert.equal(phonetic('ami, tumi!'), 'আমি, তুমি!');
    assert.equal(phonetic('বাংলা'), 'বাংলা');
    assert.equal(phonetic(''), '');
  });

  it('options keep dots and ASCII digits', () => {
    assert.equal(phonetic('ami 2.', { danda: false, digits: false }), 'আমি 2.');
  });

  it('a vowel after a space is independent again', () => {
    assert.equal(phonetic('k a'), 'ক আ');
  });
});
