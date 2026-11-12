// Fuzzy Bangla search with highlighting.  node examples/search.mjs সিক্ষক
import { createMatcher, findAll } from 'bangla-text-kit';

const query = process.argv[2] ?? 'সিক্ষক';
const documents = [
  'আমাদের শিক্ষক খুব ভালো পড়ান।',
  'নতুন শীক্ষক নিয়োগ দেওয়া হবে।',
  'ঢাকা বিশ্ববিদ্যালয়ের ছাত্ররা মিছিল করেছে।',
  'প্রধান সিক্ষক ছুটিতে আছেন।',
];

const matches = createMatcher(query);
for (const doc of documents.filter(matches)) {
  let marked = '';
  let last = 0;
  for (const hit of findAll(doc, query)) {
    marked += `${doc.slice(last, hit.start)}[${hit.text}]`;
    last = hit.end;
  }
  console.log(marked + doc.slice(last));
}
