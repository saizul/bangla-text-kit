/**
 * Avro-style phonetic typing: Latin keystrokes to Bangla.
 *
 * `phonetic('ami banglay gan gai')` -> `আমি বাংলায় গান গাই`.
 *
 * The scheme follows the conventions of the Avro Phonetic layout that most
 * Bangla typists know:
 *
 * - Vowels have an independent form at the start of a word or after another
 *   vowel (`a` -> আ) and a vowel sign after a consonant (`ka` -> কা). `o`
 *   after a consonant is the inherent vowel and adds nothing (`kolom` ->
 *   কলম); `O` is the ো sign (`tOmar` -> তোমার).
 * - Case matters where Bangla has two letters: `t` ত / `T` ট, `d` দ / `D` ড,
 *   `n` ন / `N` ণ, `s` স / `S` শ / `Sh` ষ, `r` র / `R` ড়, `i` ই / `I` ঈ,
 *   `u` উ / `U` ঊ, `o` অ / `O` ও. Other capitals are read as lower case.
 * - Two consonants with no vowel between them form a conjunct when the pair
 *   is a common Bangla conjunct (`nt` -> ন্ত, `kSh` -> ক্ষ). `r` before a
 *   consonant becomes reph (`korjo` -> কর্য), `r`, `y`, `w` and `l` after a
 *   consonant become ra-phala, ya-phala, ba-phala and la-phala where valid.
 *   Type `o` or the separator `` ` `` to keep two consonants apart.
 * - `ng` is anusvara (ং) except before a vowel or k/g, where it is ঙ.
 *   `NG` is ঞ, `Ng` ঙ, `:` visarga, `^` candrabindu, ``t`` `` ৎ, `,,` an
 *   explicit hasanta, `.` দাঁড়ি (`..` a full stop), `$` ৳, digits become
 *   Bangla digits.
 *
 * It is a deterministic rule engine, not a dictionary: it will not guess
 * spellings the way an input method's suggestion list does.
 */

type Unit =
  | { kind: 'vowel'; key: string; independent: string; sign: string }
  | { kind: 'consonant'; key: string; bn: string }
  | { kind: 'y' | 'w' | 'ng' | 'Z'; key: string }
  | { kind: 'mod'; key: string; bn: string }
  | { kind: 'sep' | 'hasanta'; key: string }
  | { kind: 'text'; key: string; bn: string };

const VOWELS: ReadonlyArray<readonly [string, string, string]> = [
  // key, independent, sign
  ['rri', 'ঋ', 'ৃ'],
  ['OI', 'ঐ', 'ৈ'],
  ['oi', 'ঐ', 'ৈ'],
  ['OU', 'ঔ', 'ৌ'],
  ['ou', 'ঔ', 'ৌ'],
  ['oo', 'উ', 'ু'],
  ['ee', 'ঈ', 'ী'],
  ['o', 'অ', ''],
  ['O', 'ও', 'ো'],
  ['a', 'আ', 'া'],
  ['A', 'আ', 'া'],
  ['i', 'ই', 'ি'],
  ['I', 'ঈ', 'ী'],
  ['u', 'উ', 'ু'],
  ['U', 'ঊ', 'ূ'],
  ['e', 'এ', 'ে'],
  ['E', 'এ', 'ে'],
];

const CONSONANTS: ReadonlyArray<readonly [string, string]> = [
  ['kkh', 'ক্ষ'],
  ['kh', 'খ'],
  ['gh', 'ঘ'],
  ['gg', 'জ্ঞ'],
  ['Ng', 'ঙ'],
  ['NG', 'ঞ'],
  ['ch', 'ছ'],
  ['jh', 'ঝ'],
  ['Th', 'ঠ'],
  ['Dh', 'ঢ'],
  ['th', 'থ'],
  ['dh', 'ধ'],
  ['ph', 'ফ'],
  ['bh', 'ভ'],
  ['sh', 'শ'],
  ['Sh', 'ষ'],
  ['Rh', 'ঢ\u09BC'],
  ['k', 'ক'],
  ['g', 'গ'],
  ['c', 'চ'],
  ['j', 'জ'],
  ['J', 'জ'],
  ['T', 'ট'],
  ['D', 'ড'],
  ['N', 'ণ'],
  ['t', 'ত'],
  ['d', 'দ'],
  ['n', 'ন'],
  ['p', 'প'],
  ['f', 'ফ'],
  ['b', 'ব'],
  ['v', 'ভ'],
  ['m', 'ম'],
  ['z', 'য'],
  ['r', 'র'],
  ['l', 'ল'],
  ['S', 'শ'],
  ['s', 'স'],
  ['h', 'হ'],
  ['R', 'ড\u09BC'],
  ['x', 'ক্স'],
  ['q', 'ক'],
];

/** Two-letter conjuncts formed automatically (first + virama + second). */
const CONJUNCT_PAIRS = new Set(
  (
    'ক্ক ক্ট ক্ত ক্ব ক্ম ক্ল ক্ষ ক্স গ্ধ গ্ন গ্ব গ্ম গ্ল ঘ্ন ঙ্ক ঙ্খ ঙ্গ ঙ্ঘ চ্চ চ্ছ চ্ঞ জ্জ জ্ঝ জ্ঞ জ্ব ' +
    'ঞ্চ ঞ্ছ ঞ্জ ঞ্ঝ ট্ট ড্ড ণ্ট ণ্ঠ ণ্ড ণ্ণ ত্ত ত্থ ত্ন ত্ব ত্ম দ্দ দ্ধ দ্ব দ্ভ দ্ম ধ্ব ন্ট ন্ঠ ন্ড ন্ত ন্থ ন্দ ' +
    'ন্ধ ন্ন ন্ব ন্ম ন্স প্ট প্ত প্ন প্প প্ল প্স ফ্ল ব্জ ব্দ ব্ধ ব্ব ব্ল ভ্ল ম্ন ম্প ম্ফ ম্ব ম্ভ ম্ম ম্ল ল্ক ল্গ ' +
    'ল্ট ল্ড ল্প ল্ফ ল্ব ল্ম ল্ল শ্চ শ্ছ শ্ন শ্ব শ্ম শ্ল ষ্ক ষ্ট ষ্ঠ ষ্ণ ষ্প ষ্ফ ষ্ম স্ক স্খ স্ট স্ত স্থ স্ন ' +
    'স্প স্ফ স্ব স্ম স্ল হ্ন হ্ব হ্ম হ্ল ক্ষ্ম ক্ষ্ণ'
  ).split(' '),
);

/** Consonants that take la-phala (ক্ল, গ্ল ...); used for `l` after a consonant. */
const VIRAMA = '্';
const ZWNJ = '\u200C';

const TEXT_UNITS: ReadonlyArray<readonly [string, string]> = [
  ['t``', 'ৎ'],
  ['..', '.'],
  ['.', '।'],
  ['$', '৳'],
  ['0', '০'],
  ['1', '১'],
  ['2', '২'],
  ['3', '৩'],
  ['4', '৪'],
  ['5', '৫'],
  ['6', '৬'],
  ['7', '৭'],
  ['8', '৮'],
  ['9', '৯'],
];

const MODS: ReadonlyArray<readonly [string, string]> = [
  [':', 'ঃ'],
  ['^', 'ঁ'],
];

interface Pattern {
  key: string;
  unit: Unit;
}

function buildPatterns(): Pattern[] {
  const list: Pattern[] = [];
  for (const [key, independent, sign] of VOWELS) {
    list.push({ key, unit: { kind: 'vowel', key, independent, sign } });
  }
  for (const [key, bn] of CONSONANTS) list.push({ key, unit: { kind: 'consonant', key, bn } });
  for (const [key, bn] of TEXT_UNITS)
    list.push({ key, unit: { kind: key === 't``' ? 'mod' : 'text', key, bn } });
  for (const [key, bn] of MODS) list.push({ key, unit: { kind: 'mod', key, bn } });
  list.push({ key: 'ng', unit: { kind: 'ng', key: 'ng' } });
  list.push({ key: 'y', unit: { kind: 'y', key: 'y' } });
  list.push({ key: 'Y', unit: { kind: 'y', key: 'Y' } });
  list.push({ key: 'w', unit: { kind: 'w', key: 'w' } });
  list.push({ key: 'Z', unit: { kind: 'Z', key: 'Z' } });
  list.push({ key: '`', unit: { kind: 'sep', key: '`' } });
  list.push({ key: ',,', unit: { kind: 'hasanta', key: ',,' } });
  // longest key first, so "kh" wins over "k" and "rri" over "r"
  return list.sort((a, b) => b.key.length - a.key.length);
}

const PATTERNS = buildPatterns();
const CASE_SENSITIVE = new Set('oOiIuUeEtTdDnNsSrRgGjJ'.split(''));

function matchAt(input: string, i: number): Unit | null {
  for (const p of PATTERNS) {
    if (input.startsWith(p.key, i)) return p.unit;
  }
  // capitals without their own meaning are read as lower case
  const ch = input[i] as string;
  if (/[A-Z]/.test(ch) && !CASE_SENSITIVE.has(ch)) {
    const lowered = input.slice(0, i) + ch.toLowerCase() + input.slice(i + 1);
    return matchAt(lowered, i);
  }
  return null;
}

function startsWithVowel(input: string, i: number): boolean {
  const u = i < input.length ? matchAt(input, i) : null;
  return u !== null && u.kind === 'vowel';
}

function lastCodePoint(s: string): string {
  const chars = Array.from(s);
  return chars[chars.length - 1] ?? '';
}

function joinable(prevCluster: string, prevKey: string, next: string): boolean {
  const prev = lastCodePoint(prevCluster);
  const first = Array.from(next)[0] ?? '';
  if (first === 'র') return true; // ra-phala
  if (prev === 'র' && prevKey === 'r') return true; // reph
  return CONJUNCT_PAIRS.has(prev + VIRAMA + first) || CONJUNCT_PAIRS.has(prevCluster + VIRAMA + first);
}

export interface PhoneticOptions {
  /** Convert `.` to দাঁড়ি. Default true. */
  danda?: boolean;
  /** Convert ASCII digits to Bangla digits. Default true. */
  digits?: boolean;
}

/** Converts Avro-style phonetic Latin input to Bangla. */
export function phonetic(input: string, options: PhoneticOptions = {}): string {
  const { danda = true, digits = true } = options;
  let out = '';
  // "consonant": the last unit was a consonant and no vowel followed yet
  let state: 'start' | 'consonant' | 'vowel' | 'other' = 'start';
  let cluster = ''; // current consonant cluster (for conjunct checks)
  let clusterKey = ''; // Latin key of the last consonant in the cluster

  const emitConsonant = (bn: string, key: string, allowJoin = true) => {
    if (state === 'consonant' && allowJoin && joinable(cluster, clusterKey, bn)) {
      out += VIRAMA + bn;
      cluster += VIRAMA + bn;
    } else {
      out += bn;
      cluster = bn;
    }
    clusterKey = key;
    state = 'consonant';
  };

  let i = 0;
  while (i < input.length) {
    const unit = matchAt(input, i);
    if (unit === null) {
      const ch = String.fromCodePoint(input.codePointAt(i) as number);
      out += ch;
      i += ch.length;
      state = /\s/.test(ch) ? 'start' : 'other';
      cluster = '';
      continue;
    }
    const next = i + unit.key.length;
    switch (unit.kind) {
      case 'vowel':
        if (state === 'consonant') {
          out += unit.sign;
        } else {
          out += unit.independent;
        }
        state = 'vowel';
        cluster = '';
        break;
      case 'consonant':
        emitConsonant(unit.bn, unit.key);
        break;
      case 'y':
        if (state === 'consonant') {
          out += `${VIRAMA}য`; // ya-phala
          cluster += `${VIRAMA}য`;
          clusterKey = 'y';
        } else {
          out += 'য\u09BC';
          cluster = 'য\u09BC';
          clusterKey = 'y';
          state = 'consonant';
        }
        break;
      case 'Z':
        if (state === 'consonant') {
          out += `${VIRAMA}য`;
          cluster += `${VIRAMA}য`;
        } else {
          emitConsonant('য', 'z', false);
        }
        break;
      case 'w':
        if (state === 'consonant') {
          out += `${VIRAMA}ব`; // ba-phala
          cluster += `${VIRAMA}ব`;
          clusterKey = 'w';
        } else if (startsWithVowel(input, next)) {
          out += 'ওয\u09BC';
          cluster = 'য\u09BC';
          clusterKey = 'y';
          state = 'consonant';
        } else {
          out += 'ও';
          state = 'vowel';
        }
        break;
      case 'ng': {
        const following = input.slice(next, next + 2);
        if (startsWithVowel(input, next)) {
          emitConsonant('ঙ', 'ng');
        } else if (/^(k|g)/.test(following)) {
          emitConsonant('ঙ', 'ng');
        } else {
          out += 'ং';
          state = 'other';
          cluster = '';
        }
        break;
      }
      case 'mod':
        out += unit.bn;
        state = 'other';
        cluster = '';
        break;
      case 'text':
        if ((unit.key === '.' || unit.key === '..') && !danda) out += unit.key;
        else if (/^\d$/.test(unit.key) && !digits) out += unit.key;
        else out += unit.bn;
        state = 'other';
        cluster = '';
        break;
      case 'sep':
        state = 'other';
        cluster = '';
        break;
      case 'hasanta':
        out += VIRAMA + ZWNJ;
        state = 'other';
        cluster = '';
        break;
    }
    i = next;
  }
  return out;
}
