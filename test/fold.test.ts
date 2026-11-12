import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createMatcher, findAll, fold, foldedEquals, foldWithOffsets, includesFolded } from '../src/index.js';

describe('fold', () => {
  it('folds ি/ী, ু/ূ, শ/ষ/স and ন/ণ by default', () => {
    assert.equal(fold('শিক্ষক'), fold('সিক্ষক'));
    assert.equal(fold('শীক্ষক'), fold('শিক্ষক'));
    assert.equal(fold('পূর্ব'), fold('পুর্ব'));
    assert.equal(fold('কারণ'), fold('কারন'));
    assert.equal(fold('বিষ'), fold('বিস'));
    assert.equal(fold('ঈদ'), fold('ইদ'));
    assert.equal(fold('ঊষা'), fold('উসা'));
  });

  it('each fold can be switched off', () => {
    assert.notEqual(fold('শিক্ষক', { sibilants: false }), fold('সিক্ষক', { sibilants: false }));
    assert.notEqual(fold('দীন', { ii: false }), fold('দিন', { ii: false }));
    assert.notEqual(fold('পূর্ব', { uu: false }), fold('পুর্ব', { uu: false }));
    assert.notEqual(fold('কারণ', { nasals: false }), fold('কারন', { nasals: false }));
  });

  it('optional folds: য/জ (keeping য\u09BC), ড\u09BC/র, candrabindu, vocalic r', () => {
    assert.equal(fold('যাদু', { ja: true }), fold('জাদু', { ja: true }));
    assert.notEqual(fold('যাদু'), fold('জাদু'));
    // য় is YA + NUKTA and must not become জ়
    assert.equal(fold('হয\u09BC', { ja: true }), 'হয\u09BC');
    assert.equal(fold('পড\u09BCা', { ra: true }), fold('পরা', { ra: true }));
    assert.equal(fold('চাঁদ', { candrabindu: true }), fold('চাদ', { candrabindu: true }));
    assert.equal(fold('ঋষি', { vocalicR: true }), fold('রিষি', { vocalicR: true }));
    assert.equal(fold('কৃষক', { vocalicR: true }), fold('ক্রিষক', { vocalicR: true }));
  });

  it('normalizes first: precomposed nukta, joiners, khanda ta, digits, case, spaces', () => {
    assert.equal(fold('হ\u09DF'), fold('হয\u09BC'));
    assert.equal(fold('ক্\u200Cষ'), fold('ক্ষ'));
    assert.equal(fold('হঠাৎ'), fold('হঠাত'));
    assert.equal(fold('১০টা'), '10টা');
    assert.equal(fold('  Dhaka   CITY '), 'dhaka city');
    assert.ok(foldedEquals('ঢাকা শহর', 'ঢাকা  সহর'));
  });

  it('includesFolded and createMatcher', () => {
    assert.ok(includesFolded('আমাদের শিক্ষক খুব ভালো', 'সিক্ষক'));
    assert.ok(!includesFolded('আমাদের শিক্ষক', 'ছাত্র'));
    assert.ok(includesFolded('anything', ''));
    const match = createMatcher('পূর্বাশা');
    assert.deepEqual(['পুর্বাসা এক্সপ্রেস', 'সোনার বাংলা', 'পূর্বাশা'].filter(match), ['পুর্বাসা এক্সপ্রেস', 'পূর্বাশা']);
  });
});

describe('findAll with offsets', () => {
  it('returns positions in the original text', () => {
    const text = 'সে শিক্ষক, তিনি সিক্ষক';
    const hits = findAll(text, 'শিক্ষক');
    assert.equal(hits.length, 2);
    assert.deepEqual(
      hits.map((h) => h.text),
      ['শিক্ষক', 'সিক্ষক'],
    );
    for (const h of hits) assert.equal(text.slice(h.start, h.end), h.text);
  });

  it('maps through precomposed letters and joiners', () => {
    const text = 'বা\u09DCি ক্\u200Cষ';
    const [hit] = findAll(text, 'বাড\u09BCি');
    assert.ok(hit);
    assert.equal(hit.text, 'বা\u09DCি');
    const [hit2] = findAll(text, 'ক্ষ');
    assert.ok(hit2);
    assert.equal(hit2.text, 'ক্\u200Cষ');
  });

  it('widens a match that ends inside a cluster', () => {
    const [hit] = findAll('ক্ষমা', 'ক');
    assert.ok(hit);
    assert.equal(hit.text, 'ক্ষ');
  });

  it('finds Latin text case-insensitively and handles no match', () => {
    assert.deepEqual(
      findAll('Dhaka dhaka', 'DHAKA').map((m) => m.start),
      [0, 6],
    );
    assert.deepEqual(findAll('abc', 'x'), []);
    assert.deepEqual(findAll('abc', ''), []);
  });

  it('foldWithOffsets keeps one offset per output unit', () => {
    const r = foldWithOffsets('শ  ষ');
    assert.equal(r.text, 'স স');
    assert.equal(r.offsets.length, r.text.length);
    assert.deepEqual(r.offsets, [0, 1, 3]);
  });
});
