const { createHeadlessEditor } = require('@lexical/headless');
const { $createParagraphNode, $createTextNode, $getRoot, ParagraphNode, TextNode } = require('lexical');
const { $convertToMarkdownString } = require('@lexical/markdown');
const { PageBreakNode, $createPageBreakNode } = require('./src/components/LexicalEditor/nodes/PageBreakNode');

const editor = createHeadlessEditor({
  nodes: [ParagraphNode, TextNode, PageBreakNode],
  onError: (error) => console.error(error),
});

editor.update(() => {
  const root = $getRoot();
  const p = $createParagraphNode();
  p.append($createPageBreakNode());
  root.append(p);
  
  const p2 = $createParagraphNode();
  p2.append($createTextNode("hello"));
  root.append(p2);
});

editor.getEditorState().read(() => {
  try {
     console.log("MARKDOWN:", $convertToMarkdownString([]));
  } catch(e) {
     console.error(e);
  }
});
