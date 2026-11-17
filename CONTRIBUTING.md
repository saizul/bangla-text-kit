# Contributing

Thanks for helping improve bangla-text-kit. Bug reports with real-world text
that is handled badly are the most useful contribution of all.

## Reporting a bug

Open an issue with:

- the function and options you called, the input and the output you expected
- **the code points** of the input, because many Bangla problems are
  invisible. In Node:
  `require('bangla-text-kit').describeCodePoints(text)` prints
  `U+0995 U+09CD U+09B7`
- your Node version (`node --version`). Grapheme results from the `intl`
  engine depend on the ICU version that ships with Node

Please don't paste private text. A few words that reproduce the problem are
enough.

## Development setup

You need Node 18 or newer.

```console
$ git clone https://github.com/saizul/bangla-text-kit.git
$ cd bangla-text-kit
$ npm ci
$ npm test        # builds ESM + CJS, compiles the tests and runs node:test
$ npm run lint    # biome lint + tsc --noEmit
$ npm run format  # biome format --write
```

CI runs lint on Node 22 and the tests on Node 18, 20, 22 and 24, plus
Windows and macOS.

## Guidelines

- **Zero runtime dependencies.** Anything that ships must use only the
  JavaScript standard library. Development tools go in `devDependencies`.
- **Verify code points.** When you add or change a character rule, check it
  against the Unicode Bengali chart (U+0980..U+09FF) and UnicodeData.txt.
  Mention the code points in the test name or a comment.
- **Write tricky characters as escapes in tests.** The nukta (U+09BC), the
  precomposed nukta letters (U+09DC, U+09DD, U+09DF), ZWJ and ZWNJ look the
  same as their alternatives, so write them as `\u` escapes. Readable Bangla
  is fine everywhere else.
- **Normalization must stay idempotent.** `normalize(normalize(x))` must
  equal `normalize(x)`. The tests check this.
- **Never touch other scripts.** Bangla fixes apply only next to Bangla
  characters. Emoji ZWJ sequences and Persian or Indic text that uses joiners
  must come out unchanged.
- Every change comes with a test that fails without it, and a line in the
  `Unreleased` section of `CHANGELOG.md`.

## Project layout

```text
src/
  chars.ts       code points of the Bengali block and classifiers
  normalize.ts   NFC + Bangla fixes, findIssues
  digits.ts      digit conversion, formatNumber, parseNumber
  fold.ts        search folding, findAll with offsets
  grapheme.ts    Intl.Segmenter wrapper and builtin segmenter, truncate
  tokenize.ts    word tokenizer
  sentence.ts    sentence splitter
  stopwords.ts   stopword list
  stem.ts        light stemmer
  phonetic.ts    Avro-style phonetic input
  romanize.ts    Bangla to Latin, slugify
  detect.ts      script ratio
  calendar.ts    Bangla calendar (বঙ্গাব্দ), Bangla date names and formatting
test/            node:test suites
examples/        runnable scripts
```

## Code of conduct

Everyone taking part in this project is expected to follow the
[Code of Conduct](CODE_OF_CONDUCT.md). Be respectful and constructive.
