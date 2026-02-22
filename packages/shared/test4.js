const { createHeadlessEditor } = require('@lexical/headless');
const { $createParagraphNode, $createTextNode, $getRoot, ParagraphNode, TextNode, DecoratorNode } = require('lexical');
const { $convertToMarkdownString } = require('@lexical/markdown');
const { $createPageBreakNode, PageBreakNode } = require('./src/components/LexicalEditor/nodes/PageBreakNode');

const editor = createHeadlessEditor({
  namespace: 'test',
  nodes: [ParagraphNode, TextNode, PageBreakNode],
  onError: (error) => console.error(error),
});

editor.update(() => {
  const root = $getRoot();
  const p1 = $createParagraphNode();
  p1.append($createTextNode("Text above"));
  root.append(p1);

  const pb = $createPageBreakNode();
  root.append(pb);

  const p2 = $createParagraphNode();
  p2.append($createTextNode("Text below"));
  root.append(p2);
});

const PAGE_BREAK_ELEMENT_TRANSFORMER = {
  type: "element",
  dependencies: [PageBreakNode],
  export: (node) => {
    return (node.getType() === "pagebreak") ? "\\newpage" : null;
  },
  regExp: /^\\newpage\s*$/,
  replace: () => {}
};

const PAGE_BREAK_TEXT_MATCH_TRANSFORMER = {
  type: "text-match",
  dependencies: [PageBreakNode],
  export: (node) => {
    return (node.getType() === "pagebreak") ? "\\newpage" : null;
  },
  regExp: /\\newpage/,
  importRegExp: /\\newpage/,
  trigger: '\\',
  replace: () => {}
};

editor.getEditorState().read(() => {
  const md = $convertToMarkdownString([PAGE_BREAK_ELEMENT_TRANSFORMER, PAGE_BREAK_TEXT_MATCH_TRANSFORMER]);
  console.log("MARKDOWN with root children:");
  console.log(JSON.stringify(md));
});

editor.update(() => {
  const root = $getRoot();
  root.clear();
  const p1 = $createParagraphNode();
  p1.append($createTextNode("Text above"));
  const pb = $createPageBreakNode();
  p1.append(pb); // inline!
  p1.append($createTextNode("Text below"));
  root.append(p1);
});

editor.getEditorState().read(() => {
  const md = $convertToMarkdownString([PAGE_BREAK_ELEMENT_TRANSFORMER, PAGE_BREAK_TEXT_MATCH_TRANSFORMER]);
  console.log("MARKDOWN with inline children:");
  console.log(JSON.stringify(md));
});
