// Convert Avro-style phonetic text from standard input to Bangla:
//   echo "ami tOmake bhalobasi" | node examples/phonetic-stdin.mjs
import { phonetic } from 'bangla-text-kit';

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  input += chunk;
});
process.stdin.on('end', () => {
  process.stdout.write(phonetic(input));
});
