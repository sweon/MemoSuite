import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';

const testCases = [
  '<div class="page-break"></div>',
  '<div data-page-break="true" class="page-break"><!-- pagebreak --></div>',
  '<div class="page-break">&nbsp;</div>',
  '<div class="page-break">BREAK</div>',
  '<hr class="page-break" />',
];

for (const test of testCases) {
  const markdown = `before\n\n${test}\n\nafter`;
  try {
    const result = await unified()
      .use(remarkParse)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(rehypeStringify)
      .process(markdown);
    console.log(`INPUT: ${test}`);
    console.log(`OUTPUT: ${String(result)}`);
    console.log('---');
  } catch(e) {
    console.log(`INPUT: ${test}`);
    console.log(`ERROR: ${e.message}`);
    console.log('---');
  }
}
