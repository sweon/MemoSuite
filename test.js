const str = "hello\n\n\\newpage\n\nworld";
const result = str.replace(/^\\newpage\s*$/gm, '<div class="page-break"></div>');
console.log(result);

const str2 = "hello\n\n<div style=\"page-break-after: always;\"></div>\n\nworld";
const result2 = str2.replace(/^<div style="page-break-after: always;"><\/div>\s*$/gm, '<div class="page-break"></div>');
console.log(result2);

const r = /^(<div style="page-break-after: always;"><\/div>|<div class="page-break"><\/div>|\\newpage)\s*$/;
console.log(r.test('\\newpage'));
console.log(r.test('\\newpage\n'));
