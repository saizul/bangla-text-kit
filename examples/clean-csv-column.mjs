// Normalize and fold one column of a CSV file to build a search key column.
//   node examples/clean-csv-column.mjs input.csv 1 > output.csv
// Simple CSV only (no quoted commas); it is an example, not a CSV parser.
import { readFileSync } from 'node:fs';
import { fold, normalize } from 'bangla-text-kit';

const [file, column = '0'] = process.argv.slice(2);
if (!file) {
  console.error('usage: node examples/clean-csv-column.mjs FILE [COLUMN]');
  process.exit(2);
}
const index = Number(column);
const lines = readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean);
for (const [n, line] of lines.entries()) {
  const cells = line.split(',');
  if (n === 0) {
    console.log([...cells, 'search_key'].join(','));
    continue;
  }
  cells[index] = normalize(cells[index] ?? '');
  console.log([...cells, fold(cells[index])].join(','));
}
