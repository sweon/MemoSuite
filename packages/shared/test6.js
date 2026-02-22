const { createHeadlessEditor } = require('@lexical/headless');
const { $createParagraphNode, $createTextNode, $getRoot, ParagraphNode, TextNode, DecoratorNode, $isElementNode } = require('lexical');

class PageBreakNode extends DecoratorNode {
  static getType() { return "pagebreak"; }
  static clone(node) { return new PageBreakNode(node.__key); }
  getTextContent() { return "\\newpage"; }
  decorate() { return null; }
}

const editor = createHeadlessEditor({
  namespace: 'test',
  nodes: [ParagraphNode, TextNode, PageBreakNode],
  onError: (error) => console.log("ERROR CAUGHT IN LEXICAL:", error.message),
});

editor.update(() => {
  const root = $getRoot();
  const p = $createParagraphNode();
  const text1 = $createTextNode("hello ");
  const text2 = $createTextNode("\\newpage");
  const text3 = $createTextNode(" world");
  p.append(text1, text2, text3);
  root.append(p);

  // Now simulate text match replace
  const pbNode = new PageBreakNode();
  try {
     text2.replace(pbNode);
  } catch(e) {
     console.log("REPLACE THREW:", e.message);
  }
});

editor.getEditorState().read(() => {
   const children = $getRoot().getChildren();
   console.log("Root children types:", children.map(c => c.getType()));
   for(const child of children) {
       if($isElementNode(child)) {
           console.log("  Inner children:", child.getChildren().map(c => c.getType() + " (" + c.getTextContent() + ")"));
       }
   }
});
