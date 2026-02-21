import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import 'rehype-raw';
import 'rehype-katex';
import 'remark-math';
import 'remark-gfm';
import 'remark-breaks';

const components = {
  img: ({ src, alt }) => {
    if (src === 'pagebreak' || alt === 'pagebreak') {
      return React.createElement('div', { className: 'page-break' }, 'PAGE_BREAK_DIV');
    }
    return React.createElement('img', { src, alt });
  },
  p: ({ children }) => React.createElement('p', {}, children)
};

const content = "\n\n![pagebreak](pagebreak)\n\n";

const element = React.createElement(ReactMarkdown, { components }, content);
const html = renderToStaticMarkup(element);
console.log("HTML:", html);
