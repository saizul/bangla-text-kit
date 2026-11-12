# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0] - 2026-11-12

### Added

- `normalize()`: NFC plus Bangla fixes. It handles the nukta letters য় ড় ঢ়
  (decomposed by default, optionally composed), legacy khanda ta (TA + VIRAMA
  + ZWJ to U+09CE), stray ZWJ/ZWNJ (meaningful ones next to a virama are
  kept, emoji sequences are never touched), pre-base vowel signs typed before
  the consonant, old ে + া / ে + ৗ sequences, misplaced nukta and
  candrabindu, অ + া written for আ, doubled marks, and an ASCII colon used for
  visarga. Optional fixes: visarga used as a colon, a pipe for দাঁড়ি, and a
  double danda. Also `findIssues()`, `isNormalized()` and the individual
  fixers.
- Digit conversion in both directions, `formatNumber()` with lakh/crore or
  international grouping, and `parseNumber()`.
- Search folding (`fold`, `foldedEquals`, `includesFolded`, `createMatcher`)
  for ি/ী, ু/ূ, শ/ষ/স and ন/ণ, with optional য/জ, ড়/র, candrabindu and
  vocalic r folds. `findAll()` returns match positions in the original text.
- Grapheme clusters through `Intl.Segmenter`, or a builtin segmenter that
  applies GB9c conjunct rules the same way on every Node version:
  `graphemes`, `graphemeLength`, `sliceGraphemes`, `truncate`,
  `reverseGraphemes`.
- Word tokenizer with offsets and token types, and a sentence splitter that
  splits on দাঁড়ি, double danda, `?`, `!` and `.` and knows Bangla and English
  abbreviations, initials and decimals.
- A stopword list (over 300 words) and a light suffix-stripping stemmer.
- Avro-style phonetic typing (`phonetic`), romanization in a simple ASCII
  scheme and an ISO 15919 style scheme (`romanize`), and `slugify`.
- Script detection: `scriptStats`, `banglaRatio`, `isBangla`,
  `dominantScript`, `containsBangla`.
- ESM and CommonJS builds with type declarations; no runtime dependencies.

[Unreleased]: https://github.com/saizul/bangla-text-kit/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/saizul/bangla-text-kit/releases/tag/v0.1.0
