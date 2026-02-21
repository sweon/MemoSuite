const testStr = '![pagebreak](pagebreak)';
console.log(testStr.replace(/!\[([^\]]*)\]\(([^)]*)\)/, 'IMAGE'));

const PAGE_BREAK_TRANSFORMER = {
  regExp: /^(?:<div[^>]*page-break[^>]*>.*?<\/div>|<div style="page-break-after: always;"><\/div>|<hr[^>]*page-break[^>]*>|\\newpage|!\[pagebreak\]\(pagebreak\))\s*$/i
};

console.log(PAGE_BREAK_TRANSFORMER.regExp.test(testStr));
