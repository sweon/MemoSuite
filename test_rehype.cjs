// A simple CJS test using the packages from pnpm
const path = require('path');

// Direct require from the pnpm store
async function main() {
    const { unified } = await import('/Users/sywon/workspace/MemoSuite/node_modules/.pnpm/unified@11.0.5/node_modules/unified/index.js');
    const remarkParse = (await import('/Users/sywon/workspace/MemoSuite/node_modules/.pnpm/remark-parse@11.0.0/node_modules/remark-parse/index.js')).default;
    const remarkRehype = (await import('/Users/sywon/workspace/MemoSuite/node_modules/.pnpm/remark-rehype@11.1.2/node_modules/remark-rehype/index.js')).default;
    const rehypeRaw = (await import('/Users/sywon/workspace/MemoSuite/node_modules/.pnpm/rehype-raw@7.0.0/node_modules/rehype-raw/index.js')).default;
    const rehypeStringify = (await import('/Users/sywon/workspace/MemoSuite/node_modules/.pnpm/rehype-stringify@10.0.1/node_modules/rehype-stringify/index.js')).default;

    const testCases = [
        '<div class="page-break"></div>',
        '<div data-page-break="true" class="page-break"><!-- pagebreak --></div>',
        '<div class="page-break">&nbsp;</div>',
        '<div class="page-break">BREAK</div>',
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
        } catch (e) {
            console.log(`INPUT: ${test}`);
            console.log(`ERROR: ${e.message}`);
            console.log('---');
        }
    }
}

main();
