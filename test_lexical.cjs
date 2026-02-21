const PAGE_BREAK_REGEX = /^(?:<div[^>]*page-break[^>]*>.*?<\/div>|<div style="page-break-after: always;"><\/div>|<hr[^>]*page-break[^>]*>|\\newpage)\s*$/;
const lines = ['\\newpage', '<div class="page-break"></div>'];
for (const line of lines) {
  const match = line.match(PAGE_BREAK_REGEX);
  console.log(line, '->', match ? 'MATCH' : 'NO MATCH');
}
