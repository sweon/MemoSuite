const rx = /^(?:<div[^>]*page-break[^>]*>.*?<\/div>|<div style="page-break-after: always;"><\/div>|<hr[^>]*page-break[^>]*>|\\newpage|\[\[PAGEBREAK\]\])\s*$/i;
console.log(rx.test('[[PAGEBREAK]]'));
