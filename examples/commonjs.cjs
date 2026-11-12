// The package also works with require():  node examples/commonjs.cjs
const { normalize, slugify, isBangla } = require('bangla-text-kit');

console.log(normalize('দু:খ'));
console.log(slugify('ঢাকা শহরের খবর'));
console.log(isBangla('এটি একটি বাংলা বাক্য'));
