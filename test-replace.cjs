const input = '<div class="page-break"></div>';
const regex = /(?:<div[^>]*page-break[^>]*>.*?<\/div>|<div style="page-break-after: always;"><\/div>|<hr[^>]*page-break[^>]*>|\\newpage)/gi;
console.log(input.replace(regex, '\n\n![pagebreak](pagebreak)\n\n'));
