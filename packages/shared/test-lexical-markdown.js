const fs = require('fs');
const js = fs.readFileSync('node_modules/@lexical/markdown/LexicalMarkdown.js', 'utf8');
console.log(js.length);
