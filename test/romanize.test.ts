import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { romanize, slugify } from '../src/index.js';

describe('romanize: simple', () => {
  const cases: Array<[string, string]> = [
    ['আমার সোনার বাংলা', 'amar sonar bangla'],
    ['বাংলাদেশ', 'bangladesh'],
    ['ঢাকা', 'dhaka'],
    ['কলম', 'kolom'],
    ['সত্য', 'sotyo'],
    ['রং', 'rong'],
    ['শ্রী', 'shri'],
    ['কৃষক', 'krishok'],
    ['ক্ষমা', 'kshoma'],
    ['বিদ্যালয\u09BC', 'bidyaloy'],
    ['দুঃখ', 'duhkh'],
    ['চাঁদ', 'chad'],
    ['হঠাৎ', 'hothat'],
    ['ঐক্য', 'oikyo'],
    ['বৌ', 'bou'],
    ['১৯৭১ সাল', '1971 sal'],
    ['আমি যাব।', 'ami jab.'],
  ];
  for (const [bn, latin] of cases) {
    it(`${bn} -> ${latin}`, () => assert.equal(romanize(bn), latin));
  }

  it('reads the precomposed nukta letters', () => {
    assert.equal(romanize('বা\u09DCি'), 'bari');
    assert.equal(romanize('বাড\u09BCি'), 'bari');
  });

  it('can keep the final inherent vowel', () => {
    assert.equal(romanize('কলম', { dropFinalVowel: false }), 'kolomo');
  });

  it('passes Latin text through', () => {
    assert.equal(romanize('Facebook পেজ'), 'Facebook pej');
  });
});

describe('romanize: iso', () => {
  const cases: Array<[string, string]> = [
    ['বাংলা', 'bāṁlā'],
    ['কলম', 'kalama'],
    ['শ্রী', 'śrī'],
    ['ক্ষমা', 'kṣamā'],
    ['দুঃখ', 'duḥkha'],
    ['চাঁদ', 'cām̐da'],
    ['ঋষি', 'r̥ṣi'],
    ['বাড\u09BCি', 'bāṛi'],
  ];
  for (const [bn, latin] of cases) {
    it(`${bn} -> ${latin}`, () => assert.equal(romanize(bn, { scheme: 'iso' }), latin.normalize('NFC')));
  }
});

describe('slugify', () => {
  it('makes URL slugs', () => {
    assert.equal(slugify('ঢাকা শহরের খবর'), 'dhaka-shohorer-khobor');
    assert.equal(slugify('  বাংলা: ২০২৬! '), 'bangla-2026');
    assert.equal(slugify('আমার সোনার বাংলা', '_'), 'amar_sonar_bangla');
  });
});
