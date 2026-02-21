const regExp = /^(?:<div[^>]*page-break[^>]*>.*?<\/div>|<div style="page-break-after: always;"><\/div>|<hr[^>]*page-break[^>]*>|\\newpage|!\[pagebreak\]\(pagebreak\)|!\[pagebreak\]\(https:\/\/pagebreak\))\s*$/i;
console.log("Matches block?", regExp.test('![pagebreak](https://pagebreak)'));
console.log("Matches with leading space?", regExp.test(' ![pagebreak](https://pagebreak)'));
