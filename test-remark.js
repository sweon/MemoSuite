const React = require('react');
const { renderToString } = require('react-dom/server');
const ReactMarkdown = require('react-markdown').default || require('react-markdown');
const rehypeRaw = require('rehype-raw').default || require('rehype-raw');

// Suppress console.error for missing DOM elements in Node environment if any
const originalError = console.error;
console.error = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('Warning:')) return;
    originalError(...args);
};

const components = {
    img: ({ src, alt }) => {
        console.log('IMG hit:', src, alt);
        if (src === 'pagebreak' || alt === 'pagebreak') return React.createElement('div', { className: 'page-break' }, 'PAGE_BREAK_IMG');
        return React.createElement('img', { src, alt });
    },
    div: ({ className, children, ...props }) => {
        console.log('DIV hit:', className);
        return React.createElement('div', { className, ...props }, children || 'DIV_CONTENT');
    }
};

const markdown1 = '\n\n![pagebreak](pagebreak)\n\n';
const element1 = React.createElement(ReactMarkdown, { components }, markdown1);
console.log("HTML1:", renderToString(element1));

const markdown2 = '\n\n<div class="page-break"></div>\n\n';
const element2 = React.createElement(ReactMarkdown, { components, rehypePlugins: [rehypeRaw] }, markdown2);
console.log("HTML2:", renderToString(element2));
