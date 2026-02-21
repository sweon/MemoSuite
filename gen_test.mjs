import { writeFileSync } from 'fs';
writeFileSync('/tmp/test_react_md.js', `
const React = require('react');
const ReactDOMServer = require('react-dom/server');

async function run() {
  const ReactMarkdown = (await import('react-markdown')).default;
  const rehypeRaw = (await import('rehype-raw')).default;
  
  const m1 = '<pagebreak></pagebreak>';
  const components = {
    pagebreak: () => React.createElement('div', { className: 'page-break' })
  };
  const e1 = React.createElement(ReactMarkdown, { rehypePlugins: [rehypeRaw], components }, m1);
  console.log("HTML1:", ReactDOMServer.renderToStaticMarkup(e1));
}
run().catch(console.error);
`);
