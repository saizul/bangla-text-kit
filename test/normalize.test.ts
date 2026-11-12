import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  cleanJoiners,
  composeNukta,
  decomposeNukta,
  describeCodePoints,
  findIssues,
  fixKhandaTa,
  fixVowelSigns,
  isNormalized,
  normalize,
} from '../src/index.js';

const eq = (actual: string, expected: string) =>
  assert.equal(actual, expected, `${describeCodePoints(actual)} != ${describeCodePoints(expected)}`);

describe('normalize: NFC and nukta forms', () => {
  it('decomposes precomposed YYA, RRA, RHA (NFC)', () => {
    eq(normalize('বাড\u09BCি'), 'বাড\u09BCি');
    eq(normalize('বা\u09DCি'), 'বাড\u09BCি'); // বাড়ি
    eq(normalize('আষা\u09DD'), 'আষাঢ\u09BC'); // আষাঢ়
    eq(normalize('হ\u09DF'), 'হয\u09BC'); // হয়
  });

  it('both input forms give the same output', () => {
    eq(normalize('য\u09BC'), normalize('\u09DF'));
    eq(normalize('য\u09BC', { nukta: 'composed' }), normalize('\u09DF', { nukta: 'composed' }));
  });

  it('can output composed nukta letters', () => {
    eq(normalize('হয\u09BC', { nukta: 'composed' }), 'হ\u09DF');
    eq(composeNukta('ড\u09BCঢ\u09BCয\u09BC'), '\u09DC\u09DD\u09DF');
    eq(decomposeNukta('\u09DC\u09DD\u09DF'), 'ড\u09BCঢ\u09BCয\u09BC');
  });

  it('composes E + AA into O and E + AU length mark into AU', () => {
    eq(normalize('কো'), 'কো'); // কো
    eq(normalize('কে\u09D7'), 'কৌ'); // কৌ
  });
});

describe('normalize: khanda ta', () => {
  it('replaces TA + VIRAMA + ZWJ with KHANDA TA', () => {
    eq(normalize('হঠাত্\u200D'), 'হঠাৎ'); // হঠাৎ
    eq(fixKhandaTa('উত্\u200Dসব'), 'উৎসব'); // উৎসব
    eq(fixKhandaTa('ত\u200D্'), 'ৎ');
  });

  it('leaves TA + VIRAMA + consonant (a real conjunct) alone', () => {
    eq(normalize('সত্য'), 'সত্য'); // সত্য
    eq(normalize('ত্ত'), 'ত্ত');
  });

  it('can be switched off', () => {
    eq(normalize('ত্\u200D', { khandaTa: false }), 'ত্\u200D');
  });
});

describe('normalize: joiners', () => {
  it('keeps ZWNJ after virama (explicit hasanta) and ZWJ in ra + ya-phala', () => {
    eq(normalize('ক্\u200Cষ'), 'ক্\u200Cষ'); // ক্\u200Cষ
    eq(normalize('র\u200D্যাব'), 'র\u200D্যাব'); // র\u200D্যাব
  });

  it('removes stray joiners next to Bangla letters', () => {
    eq(normalize('ক\u200Cা'), 'কা');
    eq(normalize('\u200Dআমি'), 'আমি');
    eq(normalize('আমি\u200C '), 'আমি ');
  });

  it('collapses a run of joiners to one', () => {
    eq(cleanJoiners('ক্\u200C\u200C\u200Dষ'), 'ক্\u200Cষ');
  });

  it('never touches emoji ZWJ sequences or other scripts', () => {
    const family = '\u{1F468}\u200D\u{1F469}\u200D\u{1F467}';
    eq(normalize(`আমি ${family}`), `আমি ${family}`);
    const persian = 'می\u200Cخواهم';
    eq(normalize(persian), persian.normalize('NFC'));
  });

  it('remove mode strips meaningful joiners too, keep mode leaves all', () => {
    eq(normalize('ক্\u200Cষ', { joiners: 'remove' }), 'ক্ষ');
    eq(normalize('ক\u200Cা', { joiners: 'keep' }), 'ক\u200Cা');
  });
});

describe('normalize: vowel sign order', () => {
  it('moves a pre-base sign typed before its consonant', () => {
    eq(normalize('েক'), 'কে'); // ে + ক -> কে
    eq(normalize('আমি িক'), 'আমি কি');
  });

  it('builds O from E typed first and AA typed after (old typing)', () => {
    eq(normalize('েকা'), 'কো'); // ে ক া -> কো
    eq(normalize('েক\u09D7'), 'কৌ'); // ে ক ৗ -> কৌ
  });

  it('moves the sign past a whole conjunct', () => {
    // ি + ক্ষ -> ক্ষি
    eq(normalize('িক্ষ'), 'ক্ষি');
    // ে + স্ত্র -> স্ত্রে
    eq(normalize('েস্ত্র'), 'স্ত্রে');
    // ে + য় (decomposed nukta) -> য়ে
    eq(normalize('ে\u09DF'), 'য\u09BCে');
  });

  it('does not move correctly placed signs', () => {
    eq(normalize('কিতে'), 'কিতে'); // কিতে
    eq(normalize('মেয\u09BCে'), 'মেয\u09BCে'); // মেয়ে
  });

  it('moves candrabindu after the vowel sign', () => {
    eq(normalize('চঁাদ'), 'চাঁদ'); // চাঁদ
    eq(normalize('কঁো'), 'কোঁ');
  });

  it('moves a nukta typed after the vowel sign', () => {
    eq(normalize('যি\u09BC'), 'য\u09BCি');
    eq(normalize('বাডি\u09BC'), 'বাড\u09BCি'); // বাড়ি
  });

  it('merges অ + া into আ and অ + ো into ও', () => {
    eq(normalize('অাম'), 'আম');
    eq(normalize('অো'), 'ও');
    eq(normalize('অো'), 'ও');
    eq(normalize('অৌ'), 'ঔ');
  });

  it('can be switched off', () => {
    eq(normalize('েক', { vowelSigns: false }), 'েক');
    eq(fixVowelSigns('কা'), 'কা');
  });
});

describe('normalize: duplicates, visarga, danda', () => {
  it('removes doubled marks', () => {
    eq(normalize('কাা'), 'কা');
    eq(normalize('ক্্ষ'), 'ক্ষ');
    eq(normalize('বাংং'), 'বাং');
    eq(normalize('কাা', { duplicateMarks: false }), 'কাা');
  });

  it('turns a colon inside a word into visarga', () => {
    eq(normalize('দু:খ'), 'দুঃখ'); // দুঃখ
    eq(normalize('নি:স্ব'), 'নিঃস্ব'); // নিঃস্ব
  });

  it('keeps label colons and times', () => {
    eq(normalize('নাম: করিম'), 'নাম: করিম');
    eq(normalize('১০:৩০'), '১০:৩০');
    eq(normalize('time 10:30'), 'time 10:30');
  });

  it('optionally turns visarga used as a colon into a colon', () => {
    const text = 'সময\u09BCঃ ১০টা';
    eq(normalize(text), text);
    eq(normalize(text, { visargaToColon: true }), 'সময\u09BC: ১০টা');
    // inside a word visarga stays
    eq(normalize('দুঃখ', { visargaToColon: true }), 'দুঃখ');
  });

  it('optionally fixes pipe and double danda', () => {
    eq(normalize('আমি যাব |', { pipeToDanda: true }), 'আমি যাব।');
    eq(normalize('a | b', { pipeToDanda: true }), 'a | b');
    eq(normalize('কা।।', { doubleDanda: true }), 'কা॥');
  });
});

describe('normalize: idempotence and helpers', () => {
  const samples = [
    'আমার সোনার বাংলা',
    'েকা দু:খ ত্\u200D চঁাদ',
    'র\u200D্যাব ক্\u200Cষ \u09DF\u09DC',
    'mixed English and বাংলা 123',
  ];

  it('is idempotent', () => {
    for (const s of samples) eq(normalize(normalize(s)), normalize(s));
  });

  it('isNormalized', () => {
    assert.ok(isNormalized('কো'));
    assert.ok(!isNormalized('কো'));
    assert.ok(!isNormalized('\u09DF'));
    assert.ok(isNormalized('\u09DF', { nukta: 'composed' }));
  });

  it('lists the issues it would fix', () => {
    assert.deepEqual(findIssues('কো'), []);
    assert.deepEqual(findIssues('কো'), ['not-nfc']);
    assert.deepEqual(findIssues('হ\u09DF'), ['precomposed-nukta']);
    assert.deepEqual(findIssues('ত্\u200D'), ['legacy-khanda-ta']);
    assert.deepEqual(findIssues('ক\u200Cা'), ['stray-joiner']);
    assert.deepEqual(findIssues('েক'), ['vowel-sign-order']);
    assert.deepEqual(findIssues('কাা'), ['duplicate-mark']);
    assert.deepEqual(findIssues('দু:খ'), ['colon-for-visarga']);
  });

  it('handles empty and non-Bangla text', () => {
    eq(normalize(''), '');
    eq(normalize('Hello, world!'), 'Hello, world!');
    eq(normalize('é'), 'é');
  });
});
