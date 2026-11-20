// Run after `npm run build`:  node examples/basic.mjs
import {
  banglaRatio,
  formatCompact,
  formatNumber,
  graphemeLength,
  normalize,
  phonetic,
  romanize,
  splitSentences,
  stem,
  toBanglaDigits,
  toLatinDigits,
  truncate,
  words,
} from 'bangla-text-kit';

// Text typed with an ASCII colon instead of visarga (ঃ).
const messy = 'আমার মন ভালো নেই, দু:খ লাগছে।';
console.log('normalize      ', normalize(messy));

console.log('digits         ', toBanglaDigits('Order #2026, 3 items'), '|', toLatinDigits('০১৭১২-৩৪৫৬৭৮'));
console.log('formatNumber   ', formatNumber(12345678.5), '|', formatNumber(12345678.5, { digits: 'latin' }));
console.log(
  'formatCompact  ',
  formatCompact(1250000),
  '|',
  formatCompact(35000000, { digits: 'latin', units: 'en' }),
);

const title = 'স্বাধীনতা দিবসের শুভেচ্ছা';
console.log(
  'length         ',
  title.length,
  'code units vs',
  graphemeLength(title, { engine: 'builtin' }),
  'characters',
);
console.log('truncate       ', truncate(title, 6, { engine: 'builtin' }));

const text = 'ড. করিম ঢাকায় থাকেন। তিনি ৩.৫ বছর ধরে শিক্ষকতা করছেন! আপনি কি তাকে চেনেন?';
console.log('sentences      ', splitSentences(text));
console.log('words          ', words(text));
console.log(
  'stems          ',
  words('ছেলেরা বইগুলো বাড়িতে রেখেছে').map((w) => stem(w)),
);

console.log('phonetic       ', phonetic('ami banglay gan gai'));
console.log('romanize       ', romanize('আমার সোনার বাংলা'), '|', romanize('বাংলা', { scheme: 'iso' }));
console.log('banglaRatio    ', banglaRatio('আমি Facebook ব্যবহার করি').toFixed(2));
