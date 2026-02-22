const { createHeadlessEditor } = require('@lexical/headless');
const { $createParagraphNode, $createTextNode, $getRoot, ParagraphNode, TextNode } = require('lexical');
const { $convertToMarkdownString } = require('@lexical/markdown');
const { PageBreakNode, $createPageBreakNode } = require('./src/components/LexicalEditor/nodes/PageBreakNode');

const editor = createHeadlessEditor({
  namespace: 'test',
  nodes: [ParagraphNode, TextNode, PageBreakNode],
  onError: (error) => console.error(error),
});

editor.update(() => {
  const root = $getRoot();
  const p = $createParagraphNode();

  // Create a PageBreakNode and temporarily modify its getTextContent
  const pbNode = $createPageBreakNode();
  pbNode.getTextContent = () => '\\n\\n\\\\newpage\\n\\n'; // Mocking the change

  p.append(pbNode);
  p.append($createTextNode("그다음줄text"));
  root.append(p);
});

editor.getEditorState().read(() => {
  console.log("MARKDOWN EXPORT:");
  try {
    console.log(JSON.stringify($convertToMarkdownString([])));
  } catch (e) {
    console.error("error:", e);
  }
});
