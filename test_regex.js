const regExp = /^(?:<div[^>]*page-break[^>]*>.*?<\/div>|<div style="page-break-after: always;"><\/div>|<hr[^>]*page-break[^>]*>|\\newpage)\s*$/gi;
console.log('Testing Lexical match:');
console.log('1.', regExp.test('\\newpage'));
regExp.lastIndex = 0; // reset because of /g
console.log('2.', regExp.test('<div class="page-break"></div>'));

const replaceRegex = /(?:<div[^>]*page-break[^>]*>.*?<\/div>|<div style="page-break-after: always;"><\/div>|<hr[^>]*page-break[^>]*>|\\newpage)/gi;
console.log('\nTesting Markdown replace:');
let md = 'some text\n\n\\newpage\n\nmore text';
console.log('Result:', md.replace(replaceRegex, '\n\n![pagebreak](pagebreak)\n\n'));
