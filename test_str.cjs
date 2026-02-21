const nodeStr = '\\newpage';
console.log('Lexical output:', JSON.stringify(nodeStr));
const regex = /(?:<div[^>]*page-break[^>]*>.*?<\/div>|<div style="page-break-after: always;"><\/div>|<hr[^>]*page-break[^>]*>|\\newpage)/gi;
console.log('Matches?', regex.test(nodeStr));
