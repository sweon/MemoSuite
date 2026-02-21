const { createEditor, ParagraphNode, TextNode } = require('lexical');
const { $convertToMarkdownString, $convertFromMarkdownString } = require('@lexical/markdown');

// Let's import our built commonjs from dist if possible? 
// Or I can just write a quick simulation.
