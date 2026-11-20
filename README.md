# bangla-text-kit

[![CI](https://github.com/saizul/bangla-text-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/saizul/bangla-text-kit/actions/workflows/ci.yml)
![Node 18+](https://img.shields.io/badge/node-18%2B-blue)
![Zero dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)
![License: MIT](https://img.shields.io/badge/license-MIT-green)

Bangla (Bengali) text utilities for JavaScript and TypeScript. It covers
Unicode normalization that understands Bangla, digit conversion, fuzzy search
folding, grapheme-safe truncation, a tokenizer and sentence splitter,
stopwords and a stemmer, Avro-style phonetic typing, romanization, script
detection and the Bangla calendar (বঙ্গাব্দ). It has **zero runtime
dependencies** and ships ESM, CommonJS and type declarations.

```js
import { normalize, fold, truncate, phonetic, romanize, splitSentences } from 'bangla-text-kit';

normalize('দু:খ');                       // 'দুঃখ'   (ASCII colon -> visarga)
fold('শিক্ষক') === fold('সিক্ষক');       // true     (শ/ষ/স folded for search)
truncate('স্বাধীনতা দিবস', 4);            // 'স্বাধীন…' (never splits স্বা)
phonetic('ami banglay gan gai');         // 'আমি বাংলায় গান গাই'
romanize('আমার সোনার বাংলা');            // 'amar sonar bangla'
splitSentences('ড. করিম এলেন। বসুন!');    // ['ড. করিম এলেন।', 'বসুন!']
```

## Why

Bangla text from real users is messy in ways that NFC doesn't fix. Two strings
can look identical on screen and still compare unequal:

- **য় ড় ঢ় come in two forms.** U+09DF is one code point, and U+09AF U+09BC
  is YA + NUKTA. NFC always picks the decomposed one, because these letters
  are composition exclusions. Many databases hold a mix of both.
- **Khanda ta has a legacy form.** Text from before Unicode 4.1 writes ৎ as
  TA + VIRAMA + ZWJ.
- **Invisible joiners.** ZWJ and ZWNJ get pasted in from word processors and
  break search, except in the two places where they matter.
- **Visual-order typing.** Old typing habits put ে before the consonant, or
  type অ + া for আ, or place candrabindu before the vowel sign.
- **A colon for visarga.** People type `দু:খ` for `দুঃখ`.

On top of that, `string.length` and `.slice()` count UTF-16 code units, so
they cut `ক্ষ` and `কি` in half. And people spell শ/ষ/স, ি/ী, ু/ূ and ন/ণ
interchangeably, which makes exact search useless.

## Features

- **Normalization**: NFC plus the Bangla fixes listed above. Every fix is
  optional, and `findIssues()` reports which problems a text has.
- **Digits**: ASCII to Bangla and back, `formatNumber()` with lakh/crore
  grouping (১২,৩৪,৫৬৭), and `parseNumber()`.
- **Compact numbers**: `formatCompact(1250000)` gives ১২.৫ লাখ (হাজার, লাখ,
  কোটি, or thousand/lakh/crore), and `parseCompact()` reads ১ কোটি ২০ লাখ,
  `2.5 lakh` or `৳ ৩ হাজার` back into a number.
- **Search folding**: ি/ী, ু/ূ, শ/ষ/স and ন/ণ by default, with optional
  য/জ, ড়/র, candrabindu and ঋ/রি folds. `findAll()` returns positions in the
  original text for highlighting.
- **Graphemes**: `Intl.Segmenter`, or a builtin segmenter with conjunct rules
  (GB9c) that behaves the same on every Node version. Includes length, slice,
  truncate and reverse.
- **Tokenizer**: words, numbers, punctuation and symbols with offsets. Joiners,
  conjuncts, `১০টা`, `১২,৫০০.৭৫` and `সাদা-কালো` stay whole.
- **Sentence splitter**: splits on দাঁড়ি (।), double danda (॥), `?`, `!` and
  `.`. It knows Bangla and English abbreviations (ড., মো., Dr.), initials
  (এ. কে. এম.) and decimals.
- **Stopwords and stemmer**: 360+ stopwords, and a light suffix-stripping
  stemmer that maps ছেলে, ছেলের, ছেলেরা and ছেলেদের to one key.
- **Transliteration**: Avro-style phonetic input to Bangla, and Bangla to
  Latin in a simple ASCII scheme or an ISO 15919 style scheme with
  diacritics. Includes `slugify()`.
- **Script detection**: the Bangla share of the letters, `isBangla()` and
  `dominantScript()`.
- **Bangla calendar**: Gregorian to বঙ্গাব্দ and back using the revised
  Bangladesh calendar, with month, weekday and season (ঋতু) names,
  `formatBanglaDate()` patterns, Gregorian dates with Bangla month names, and
  `parseBanglaDate()` for written dates such as `১লা বৈশাখ ১৪৩৩`.

## Install

```bash
npm install bangla-text-kit
```

Requires Node 18 or newer. It also works in browsers and edge runtimes that
support ES2022 and `\p{...}` regular expressions. Only the `intl` grapheme
engine needs `Intl.Segmenter`, and `auto` falls back to the builtin one.

```js
// ESM
import { normalize } from 'bangla-text-kit';
// CommonJS
const { normalize } = require('bangla-text-kit');
```

## Usage

### Normalization

```js
import { normalize, findIssues } from 'bangla-text-kit';

normalize(t);                  // য় ড় ঢ় as U+09DF/U+09DC/U+09DD -> YA/DDA/DDHA + NUKTA (NFC)
normalize('হঠাত' + '\u09CD\u200D'); // legacy TA + VIRAMA + ZWJ -> 'হঠাৎ'
normalize('েকা');              // ে typed first -> 'কো'
normalize('চঁাদ');             // candrabindu before the sign -> 'চাঁদ'
normalize('অামি');             // অ + া -> 'আমি'
normalize('দু:খ');             // 'দুঃখ'
normalize('নাম: করিম');        // unchanged, a colon before a space is a label

normalize(text, { nukta: 'composed' });   // emit U+09DC/U+09DD/U+09DF instead
findIssues('েকা দু:খ');                   // ['vowel-sign-order', 'colon-for-visarga']
```

| Option | Default | Effect |
|---|---|---|
| `nukta` | `'decomposed'` | `'composed'` outputs য় ড় ঢ় as single code points (the result is then not NFC) |
| `khandaTa` | `true` | TA + VIRAMA + ZWJ (and TA + ZWJ + VIRAMA) to ৎ (U+09CE) |
| `joiners` | `'clean'` | `'clean'` removes ZWJ/ZWNJ next to Bangla letters unless they touch a virama (ক্‌ষ, র‍্য keep theirs); `'remove'` removes all of them; `'keep'` keeps them all. Emoji ZWJ sequences and other scripts are never touched |
| `vowelSigns` | `true` | moves pre-base signs typed before their consonant (including past conjuncts), composes ে + া and ে + ৗ, moves a nukta typed after a sign, moves candrabindu after the sign, and turns অ + া / ো / ৌ into আ / ও / ঔ |
| `duplicateMarks` | `true` | the same sign typed twice (কাা) becomes one |
| `colonToVisarga` | `true` | an ASCII or fullwidth colon between Bangla letters becomes ঃ |
| `visargaToColon` | `false` | ঃ followed by a digit or line end becomes `:` (সময়ঃ ১০টা) |
| `pipeToDanda` | `false` | `|` after a Bangla word at the end of a sentence becomes । |
| `doubleDanda` | `false` | `।।` becomes ॥ |

`normalize` is idempotent. The individual fixers (`fixKhandaTa`,
`cleanJoiners`, `fixVowelSigns`, `removeDuplicateMarks`, `colonToVisarga`,
`composeNukta`, `decomposeNukta`) are exported too.

### Digits and numbers

```js
toBanglaDigits(2026);                    // '২০২৬'
toBanglaDigits('Tel 01712');             // 'Tel ০১৭১২'
toLatinDigits('৳ ১,২৩৪.৫০');             // '৳ 1,234.50'
formatNumber(1234567.5);                 // '১২,৩৪,৫৬৭.৫'
formatNumber(1234567, { digits: 'latin', grouping: 'international' }); // '1,234,567'
formatNumber(1500, { fractionDigits: 2 });                              // '১,৫০০.০০'
parseNumber('১২,৩৪,৫৬৭.৫০');             // 1234567.5
```

#### Compact numbers (হাজার, লাখ, কোটি)

```js
formatCompact(4500);                     // '৪.৫ হাজার'
formatCompact(1250000);                  // '১২.৫ লাখ'
formatCompact(35000000);                 // '৩.৫ কোটি'
formatCompact(12000000000);              // '১,২০০ কোটি'
formatCompact(99999);                    // '১ লাখ' (rounding moves up a unit)
formatCompact(2500000, { digits: 'latin', units: 'en' }); // '25 lakh'
formatCompact(50000, { thousand: false });                // '৫০,০০০'
formatCompact(1234567, { maximumFractionDigits: 0 });     // '১২ লাখ'

parseCompact('১২.৫ লাখ');                // 1250000
parseCompact('১ কোটি ২০ লাখ');           // 12000000
parseCompact('Tk. 2.5 lakh');            // 250000
parseCompact('৫০ লাখ টাকা');             // 5000000
parseCompact('অনেক টাকা');               // NaN
```

`formatCompact()` keeps at most `maximumFractionDigits` (default 2) and drops
trailing zeros. `parseCompact()` accepts Bangla or ASCII digits, the unit
words হাজার, লাখ/লক্ষ, কোটি and thousand/k, lakh/lac, crore/cr (any case), a
leading `৳`/`Tk`/`BDT` and a trailing `টাকা`; several units add up when they
go from large to small.

Turning numbers into Bangla words (১২৩ to একশো তেইশ) is out of scope for
this package.

### Search folding

```js
import { fold, includesFolded, createMatcher, findAll } from 'bangla-text-kit';

fold('শীক্ষক');                          // 'সিক্সক' (a search key, not for display)
includesFolded('আমাদের শিক্ষক', 'সিক্ষক'); // true
names.filter(createMatcher('পূর্বাশা'));   // also matches 'পুর্বাসা'

findAll('সে শিক্ষক, তিনি সিক্ষক', 'শিক্ষক');
// [{ start: 3, end: 9, text: 'শিক্ষক' }, { start: 16, end: 22, text: 'সিক্ষক' }]
```

| Option | Default | Folds |
|---|---|---|
| `ii` | `true` | ী to ি, ঈ to ই |
| `uu` | `true` | ূ to ু, ঊ to উ |
| `sibilants` | `true` | শ and ষ to স |
| `nasals` | `true` | ণ to ন |
| `khandaTa` | `true` | ৎ to ত |
| `ja` | `false` | য to জ (য় is left alone) |
| `ra` | `false` | ড় and ঢ় to র |
| `candrabindu` | `false` | removes ঁ |
| `vocalicR` | `false` | ঋ to রি, ৃ to ্রি |
| `joiners`, `digits`, `lowercase`, `whitespace` | `true` | remove ZWJ/ZWNJ, Bangla digits to ASCII, lower-case Latin, collapse spaces |

`findAll()` folds per grapheme cluster and maps every folded character back to
its source cluster. A match that ends inside a cluster is widened to cover the
whole cluster.

### Graphemes and truncation

```js
'বাংলাদেশ'.length;                        // 8
graphemeLength('বাংলাদেশ');               // 4: বাং লা দে শ
graphemes('ক্ষমা', { engine: 'builtin' }); // ['ক্ষ', 'মা']
sliceGraphemes('বাংলাদেশ', 2);             // 'দেশ'
truncate('আমার সোনার বাংলা', 8, { wordBoundary: true }); // 'আমার…'
```

The `engine` option picks the segmenter:

- `auto` (default): `Intl.Segmenter` when the runtime has it, the builtin
  segmenter otherwise.
- `intl`: `Intl.Segmenter`. Its rules depend on the ICU in your Node. Since
  Unicode 15.1 (Node 22+), conjuncts such as ক্ষ are a single cluster. Node 18
  and 20 split them after the virama.
- `builtin`: this package's segmenter. It applies GB9c, so ক্ষ, স্ত্রী and
  র‍্যা are one cluster everywhere. ZWNJ breaks a conjunct (ক্‌ষ is two
  clusters). It also handles CRLF, emoji ZWJ sequences, skin tones and flags.
  Use it when results must be identical across environments, for example
  when a database column limit is enforced on both client and server.

`truncate(text, max, { ellipsis = '…', wordBoundary = false })` counts the
ellipsis toward `max`.

### Tokenizer

```js
tokenize('দাম ১২,৫০০.৭৫ টাকা।');
// [ { text: 'দাম', type: 'word', start: 0, end: 3 },
//   { text: ' ', type: 'whitespace', ... },
//   { text: '১২,৫০০.৭৫', type: 'number', ... }, ...
//   { text: '।', type: 'punctuation', ... } ]

words('১০টা বই, সাদা-কালো ছবি');        // ['১০টা', 'বই', 'সাদা-কালো', 'ছবি']
words(text, { numbers: false, lowercase: true, normalize: true });
wordCount('আমার সোনার বাংলা');           // 3
```

Token types are `word`, `number`, `punctuation`, `whitespace` and `symbol`.
Offsets are UTF-16 indexes into the input, or into the normalized text when
`normalize` is set.

### Sentences

```js
splitSentences('আমি যাব।তুমি থাকো? দাম ৩.৫ টাকা। ড. ইউনূস এলেন।');
// ['আমি যাব।', 'তুমি থাকো?', 'দাম ৩.৫ টাকা।', 'ড. ইউনূস এলেন।']

sentenceSpans(text);   // [{ text, start, end }, ...]
splitSentences(text, { extraAbbreviations: ['প্রকৌ.'], splitOnNewline: true });
```

The splitter has these rules:

- দাঁড়ি always ends a sentence, even without a following space.
- `?` and `!` end a sentence before whitespace or a Bangla letter.
- `.` ends a sentence unless it is a decimal point, follows a known
  abbreviation or a chain of initials (এ. কে. এম., A. K.), or is followed
  directly by a letter (example.com).
- Closing quotes and brackets stay with their sentence.
- Blank lines always split.

### Stopwords and stemming

```js
isStopword('এবং');                                   // true
removeStopwords(words('আমি এবং তুমি বাংলাদেশে থাকি')); // ['বাংলাদেশে', 'থাকি']
stem('ছেলেদের');   // 'ছেল'   (ছেলে, ছেলের, ছেলেরা give the same)
stem('বইগুলো');    // 'বই'
stem('করেছিলাম');  // 'কর'
stem('করেছিলাম', { verbs: false }); // unchanged
```

The stemmer is rule-based and doesn't use a dictionary. Its stems are search
keys, not dictionary words.

### Phonetic typing (Avro-style)

```js
phonetic('amar sOnar bangla');  // 'আমার সোনার বাংলা'
phonetic('shikkhok');           // 'শিক্ষক'
phonetic('biggan');             // 'বিজ্ঞান'
phonetic('du:kh');              // 'দুঃখ'
phonetic('ca^d');               // 'চাঁদ'
phonetic('hoThat``');           // 'হঠাৎ'
phonetic('20 Taka $');          // '২০ টাকা ৳'
```

The conventions follow the Avro Phonetic layout:

- **Case.** `o` is the inherent vowel and `O` is ো. Case also separates these
  pairs: `t`/`T`, `d`/`D`, `n`/`N`, `s`/`S`/`Sh`, `r`/`R`, `i`/`I` and
  `u`/`U`. Other capitals read as lower case.
- **Conjuncts.** Two consonants with no vowel between them form a conjunct
  when the pair is a common one (`nt` ন্ত, `kSh` ক্ষ, `gg` জ্ঞ). `r` before a
  consonant is reph. `r`, `y` and `w` after a consonant are ra-, ya- and
  ba-phala.
- **Keeping consonants apart.** Type `o` between them (`dorokar` দরকার), or
  use the separator `` ` ``.
- **`ng`.** `ng` is ং, except before a vowel or k/g, where it is ঙ (`rongin`
  রঙিন).
- **Other keys.** `:` ঃ, `^` ঁ, ``t`` `` ৎ, `,,` explicit hasanta, `.` ।, `..`
  a full stop, `$` ৳. Digits become Bangla digits.

This is a deterministic rule engine. It doesn't suggest dictionary spellings
the way the Avro keyboard's suggestion list does.

### Romanization

```js
romanize('আমার সোনার বাংলা');            // 'amar sonar bangla'
romanize('সত্য');                         // 'sotyo'
romanize('বাংলা', { scheme: 'iso' });     // 'bāṁlā'
romanize('ক্ষমা', { scheme: 'iso' });     // 'kṣamā'
slugify('ঢাকা শহরের খবর');                // 'dhaka-shohorer-khobor'
```

- **`simple`** writes the inherent vowel as `o` and drops it at the end of a
  word, except after a conjunct. It is meant for slugs, usernames and search.
- **`iso`** follows ISO 15919 conventions. It always writes the inherent
  vowel `a` and uses diacritics (ṭ ḍ ṇ ś ṣ ṁ ḥ ẏ ṛ).

### Script detection

```js
banglaRatio('আমি Facebook ব্যবহার করি');  // 0.62
isBangla('I use ফেসবুক every day');       // false
isBangla('I use ফেসবুক every day', { threshold: 0.2 }); // true
scriptStats('কি? ok');  // { bangla: 2, latin: 2, other: 0, banglaDigits: 0, total: 4, banglaRatio: 0.5 }
dominantScript('বাংলা text');             // 'bangla'
```

Detection counts letters and combining marks. Whitespace, punctuation, ZWJ and
ZWNJ are ignored, and digits only count with `countDigits: true`.

### Bangla calendar (বঙ্গাব্দ)

```js
toBanglaDate('2026-04-14');
// { year: 1433, month: 1, day: 1, monthName: 'বৈশাখ', weekday: 2, weekdayName: 'মঙ্গলবার',
//   season: 0, seasonName: 'গ্রীষ্ম', dayOfYear: 1 }
fromBanglaDate({ year: 1432, month: 11, day: 8 });  // { year: 2026, month: 2, day: 21 }

formatBanglaDate('2026-04-14');                                       // '১ বৈশাখ ১৪৩৩'
formatBanglaDate('2026-04-14', { pattern: 'EEEE, d MMMM y বঙ্গাব্দ' }); // 'মঙ্গলবার, ১ বৈশাখ ১৪৩৩ বঙ্গাব্দ'
formatBanglaDate('2026-12-16', { calendar: 'gregorian' });            // '১৬ ডিসেম্বর ২০২৬'
formatBanglaDate(new Date(), { timeZone: 'Asia/Dhaka', digits: 'latin', pattern: 'dd/MM/y' });

parseBanglaDate('১লা বৈশাখ, ১৪৩৩ বঙ্গাব্দ');  // { year: 1433, month: 1, day: 1 }
parseBanglaDate('৩০ ফাল্গুন ১৪৩১');          // null (ফাল্গুন 1431 has 29 days)
isBanglaLeapYear(1430);                       // true: ফাল্গুন 1430 has 30 days
banglaMonthLength(1433, 1);                   // 31
```

The conversion follows the calendar used officially in Bangladesh since the
2019 revision: the year starts on 14 April, বৈশাখ to আশ্বিন have 31 days,
কার্তিক to মাঘ and চৈত্র have 30, and ফাল্গুন has 29 days, or 30 when the
February it overlaps is in a Gregorian leap year. So 21 February is always
৮ ফাল্গুন, 26 March ১২ চৈত্র and 16 December ১ পৌষ.

Dates can be given as a `Date`, an ISO `YYYY-MM-DD` string (Bangla digits are
fine) or a `{ year, month, day }` object. A `Date` is read in the runtime's
local time zone unless you pass `timeZone` (`'UTC'` or an IANA name such as
`'Asia/Dhaka'`), which matters on servers that run in UTC: 20:00 UTC on 13
April is already ১ বৈশাখ in Dhaka.

Pattern tokens: `d`/`dd` day, `M`/`MM` month number, `MMMM` month name, `y`
year (`yyyy` pads), `EEEE` weekday, `r` season. Bangla text is copied as is;
put ASCII text in single quotes. `parseBanglaDate()` accepts day suffixes
(১লা, ২৫শে), a trailing বঙ্গাব্দ or সন, and common spelling variants of the
month names (শ্রাবন, অঘ্রাণ, ফাগুন, both nukta forms).

## API reference

| Module | Exports |
|---|---|
| chars | `CP`, `CH`, `isConsonant`, `isFullConsonant`, `isIndependentVowel`, `isVowelSign`, `isPreBaseVowelSign`, `isVariousSign`, `isCombining`, `isBanglaDigit`, `isBanglaLetterOrMark`, `isAssignedBengali`, `inBengaliBlock`, `cps`, `fromCps`, `describeCodePoints` |
| normalize | `normalize(text, options?)`, `isNormalized`, `findIssues`, `fixKhandaTa`, `cleanJoiners(text, mode?)`, `fixVowelSigns`, `removeDuplicateMarks`, `colonToVisarga`, `visargaToColon`, `pipeToDanda`, `doubleDanda`, `composeNukta`, `decomposeNukta`, `DEFAULT_NORMALIZE_OPTIONS` |
| digits | `toBanglaDigits(value)`, `toLatinDigits(text)`, `hasBanglaDigits`, `formatNumber(value, options?)`, `parseNumber(text)` |
| compact | `formatCompact(value, options?)`, `parseCompact(text)` |
| fold | `fold(text, options?)`, `foldedEquals(a, b, options?)`, `includesFolded`, `createMatcher(query, options?)`, `findAll(text, query, options?)`, `foldWithOffsets`, `DEFAULT_FOLD_OPTIONS` |
| grapheme | `graphemes(text, options?)`, `graphemeLength`, `sliceGraphemes(text, start, end?, options?)`, `truncate(text, max, options?)`, `reverseGraphemes`, `segmentGraphemesBuiltin(text, conjuncts?)`, `hasIntlSegmenter()` |
| tokenize | `tokenize(text, options?)`, `words(text, options?)`, `wordCount(text)` |
| sentence | `splitSentences(text, options?)`, `sentenceSpans(text, options?)`, `DEFAULT_ABBREVIATIONS` |
| stopwords | `STOPWORDS`, `isStopword(word, extra?)`, `removeStopwords(words, extra?)` |
| stem | `stem(word, options?)`, `stemAll(words, options?)` |
| phonetic | `phonetic(input, options?)` |
| romanize | `romanize(text, options?)`, `slugify(text, separator?)` |
| detect | `scriptStats(text, options?)`, `banglaRatio`, `isBangla(text, options?)`, `dominantScript`, `containsBangla` |
| calendar | `toBanglaDate(date, options?)`, `fromBanglaDate(date)`, `formatBanglaDate(date, options?)`, `parseBanglaDate(text)`, `isBanglaLeapYear`, `banglaMonthLength`, `toPlainDate`, `BANGLA_MONTHS`, `GREGORIAN_MONTHS_BN`, `BANGLA_WEEKDAYS`, `BANGLA_SEASONS` |

Every function is pure and synchronous, and every option is optional. The
TypeScript declarations document each option.

## Configuration

There is no global state or configuration file. Behaviour is controlled per
call through the option objects described above. To use one setup throughout
an app, wrap the functions once:

```js
const searchKey = (s) => fold(s, { ja: true, ra: true, candrabindu: true });
const clean = (s) => normalize(s, { nukta: 'composed', pipeToDanda: true });
```

## Examples

Build first (`npm run build`), then run:

- [`examples/basic.mjs`](examples/basic.mjs): a tour of every module
- [`examples/search.mjs`](examples/search.mjs): fuzzy search with highlighted matches (`node examples/search.mjs সিক্ষক`)
- [`examples/phonetic-stdin.mjs`](examples/phonetic-stdin.mjs): phonetic text from standard input to Bangla
- [`examples/clean-csv-column.mjs`](examples/clean-csv-column.mjs): add a normalized search key column to a CSV
- [`examples/calendar.mjs`](examples/calendar.mjs): today's date in বঙ্গাব্দ (`node examples/calendar.mjs 2026-04-14`)
- [`examples/commonjs.cjs`](examples/commonjs.cjs): `require()` usage

## Testing

```bash
npm ci
npm test        # builds ESM and CJS, compiles the tests, runs node:test
npm run lint    # biome lint + tsc --noEmit
```

The suite has 210 tests covering tricky Unicode cases. Code points are
checked against the Unicode Bengali chart (U+0980..U+09FF): composition
exclusions, both nukta forms, legacy khanda ta, joiners next to and away from
a virama, emoji ZWJ sequences and Persian ZWNJ that must survive, vowel signs
typed before conjuncts, idempotence, both grapheme engines, and the CommonJS
build, plus a day-by-day round trip of the calendar over eleven years.
Ambiguous characters such as the nukta, the precomposed nukta letters, ZWJ and
ZWNJ are written as escapes in the tests, so what is being tested is visible.

## Limitations

- **The stemmer is light.** It strips suffixes without a dictionary, so
  stems are not always words (ছেলে becomes ছেল) and some words ending in a
  suffix-like syllable are over-stripped (বাজার becomes বাজা). This is fine
  for search keys but not for display.
- **Sentence splitting is rule-based.** Unknown abbreviations ending in `.`
  split a sentence. Add them with `extraAbbreviations`.
- **Phonetic input follows Avro conventions, not every Avro rule.** Rare
  conjuncts outside the built-in list need `,,` (hasanta), and nothing is
  guessed from a dictionary.
- **Romanization is not reversible** in the `simple` scheme, and it
  approximates pronunciation (silent ব-ফলা is still written `w`).
- **`intl` grapheme results vary with the ICU version.** Use `builtin` when
  you need the same result on every runtime.
- **Normalization targets modern Bangla.** Assamese (ৰ ৱ) and Sanskrit-only
  letters pass through, but the Bangla-specific fixes are not tuned for them.
- **The calendar is the Bangladesh one.** The West Bengal (Indian) Bangla
  calendar follows the sidereal year and can differ by a day or so; it is not
  supported. The revised rules are applied to every year, so dates before the
  1987 and 2019 revisions may not match calendars printed at the time.
- Number to Bangla words is deliberately out of scope.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and the
[Code of Conduct](CODE_OF_CONDUCT.md). Report security issues privately as
described in [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE) © 2026 Saizul Amin

## Install from GitHub Packages

Releases are published as `@saizul/bangla-text-kit` on GitHub Packages:

```bash
echo "@saizul:registry=https://npm.pkg.github.com" >> .npmrc
npm install @saizul/bangla-text-kit
```

GitHub Packages needs a personal access token with `read:packages` in your npm config to install.
