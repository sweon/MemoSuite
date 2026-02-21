// Fake Lexical Markdown parsing logic to see if it matches
const PAGE_BREAK_REGEX = /^(?:<div[^>]*page-break[^>]*>.*?<\/div>|<div style="page-break-after: always;"><\/div>|<hr[^>]*page-break[^>]*>|\\newpage|!\[pagebreak\]\(pagebreak\))\s*$/i;
const mdOut = '\n\n![pagebreak](pagebreak)\n\n';
console.log('Match?', PAGE_BREAK_REGEX.test(mdOut.trim()));
