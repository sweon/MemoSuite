const testStr = '<div class="page-break"></div>';
const regex = /(?:<div[^>]*page-break[^>]*>.*?<\/div>|<div style="page-break-after: always;"><\/div>|<hr[^>]*page-break[^>]*>|\\newpage|!\[pagebreak\]\(pagebreak\))/gi;
console.log(testStr.replace(regex, '\n\n![pagebreak](pagebreak)\n\n'));
