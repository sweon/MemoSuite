const rx = /^(?:<div[^>]*page-break[^>]*>.*?<\/div>|<div style="page-break-after: always;"><\/div>|<hr[^>]*page-break[^>]*>|\\newpage|!\[pagebreak\]\(pagebreak\))\s*$/i;
console.log(rx.test("![pagebreak](pagebreak)"));
