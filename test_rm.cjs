const importDynamic = new Function('modulePath', 'return import(modulePath)');

(async () => {
  const React = require('react');
  const ReactDOMServer = await importDynamic('react-dom/server');
  
  const ReactMarkdown = (await importDynamic('react-markdown')).default;
  const rehypeRaw = (await importDynamic('rehype-raw')).default;
  
  const m1 = '<div class="page-break"></div>';
  const e1 = React.createElement(ReactMarkdown, { rehypePlugins: [rehypeRaw] }, m1);
  console.log("HTML1:", ReactDOMServer.renderToStaticMarkup(e1));

  const m2 = '![pagebreak](pagebreak)';
  const components = {
    img: ({ src, alt }) => React.createElement('div', { className: 'page-break' })
  };
  const e2 = React.createElement(ReactMarkdown, { components }, m2);
  console.log("HTML2:", ReactDOMServer.renderToStaticMarkup(e2));
})();
