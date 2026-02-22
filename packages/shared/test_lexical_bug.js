const { createHeadlessEditor } = require('@lexical/headless');
const { $createParagraphNode, $createTextNode, $getRoot, ParagraphNode, TextNode, DecoratorNode } = require('lexical');
const { $convertToMarkdownString } = require('@lexical/markdown');

class PageBreakNode extends DecoratorNode {
  static getType() { return "pagebreak"; }
  static clone(node) { return new PageBreakNode(node.__key); }
  getTextContent() { return "\\newpage"; }
  decorate() { return null; }
}

const editor = createHeadlessEditor({
  namespace: 'test',
  nodes: [ParagraphNode, TextNode, PageBreakNode],
  onError: (error) => console.error(error),
});

editor.update(() => {
  const root = $getRoot();
  const pb = new PageBreakNode();
  root.append(pb);
});

editor.getEditorState().read(() => {
  console.log("Decorators:", $getRoot().getChildren().map(c => c.getType()));
  const transformers = [{
    type: "element",
    dependencies: [PageBreakNode],
    export: (node) => {
      console.log('called export for:', node.getType());
      if (node.getType() === 'pagebreak') return '\n\\newpage\n';
      return null;
    }
  }];
  try {
    console.log("MARKDOWN:", $convertToMarkdownString(transformers));
  } catch (e) {
    console.error("error:", e);
  }
});
