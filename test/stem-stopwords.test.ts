import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { STOPWORDS, isStopword, removeStopwords, stem, stemAll, words } from '../src/index.js';

describe('stopwords', () => {
  it('contains common function words', () => {
    for (const w of ['এবং', 'কিন্তু', 'আমি', 'তার', 'থেকে', 'জন্য', 'না', 'হয\u09BC', 'এই', 'কি', 'কী']) {
      assert.ok(isStopword(w), w);
    }
    assert.ok(!isStopword('বাংলাদেশ'));
    assert.ok(STOPWORDS.size > 300);
  });

  it('matches either nukta form', () => {
    assert.ok(isStopword('হ\u09DF'));
    assert.ok(isStopword('হয\u09BC'));
  });

  it('removes stopwords, with extras', () => {
    const tokens = words('আমি এবং তুমি বাংলাদেশে থাকি');
    assert.deepEqual(removeStopwords(tokens), ['বাংলাদেশে', 'থাকি']);
    assert.deepEqual(removeStopwords(tokens, ['থাকি']), ['বাংলাদেশে']);
  });

  it('the list is normalized', () => {
    for (const w of STOPWORDS) assert.equal(w, w.normalize('NFC'));
  });
});

describe('stem', () => {
  it('maps inflected forms to one key', () => {
    const forms = ['ছেলে', 'ছেলের', 'ছেলেরা', 'ছেলেদের', 'ছেলেকে'];
    const stems = new Set(forms.map((f) => stem(f)));
    assert.equal(stems.size, 1, [...stems].join(','));
  });

  it('strips plural, case and classifier suffixes', () => {
    assert.equal(stem('বইগুলো'), 'বই');
    assert.equal(stem('বাংলাদেশের'), 'বাংলাদেশ');
    assert.equal(stem('মানুষদের'), 'মানুষ');
    assert.equal(stem('বাড\u09BCিতে'), 'বাড\u09BCি');
    assert.equal(stem('বইটি'), 'বই');
    assert.equal(stem('কলমটা'), 'কলম');
    assert.equal(stem('দেশে'), 'দেশ');
    assert.equal(stem('বাংলায\u09BC'), 'বাংলা');
  });

  it('strips verb endings unless told not to', () => {
    assert.equal(stem('করেছিলাম'), 'কর');
    assert.equal(stem('করছেন'), 'কর');
    assert.equal(stem('করবে'), 'কর');
    assert.equal(stem('করেছিলাম', { verbs: false }), 'করেছিলাম');
  });

  it('keeps short words and words without suffixes', () => {
    assert.equal(stem('বই'), 'বই');
    assert.equal(stem('মা'), 'মা');
    assert.equal(stem('দেশ'), 'দেশ');
    assert.equal(stem('ফল'), 'ফল');
  });

  it('never leaves a dangling virama', () => {
    assert.ok(!/্$/u.test(stem('বন্ধের')));
  });

  it('works on the precomposed nukta form and non-Bangla words', () => {
    assert.equal(stem('বা\u09DCিতে'), 'বাড\u09BCি');
    assert.equal(stem('computers'), 'computers');
    assert.deepEqual(stemAll(['বইগুলো', 'দেশে']), ['বই', 'দেশ']);
  });
});
