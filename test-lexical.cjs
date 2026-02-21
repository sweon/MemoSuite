const { createEditor, ParagraphNode, TextNode, DecoratorNode, RootNode } = require('lexical');
const { $convertToMarkdownString } = require('@lexical/markdown');
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.HTMLElement = dom.window.HTMLElement;

class PageBreakNode extends DecoratorNode {
  static getType() { return "pagebreak"; }
  static clone(node) { return new PageBreakNode(node.__key); }
  constructor(key) { super(key); }
  createDOM() { return document.createElement("div"); }
  updateDOM() { return false; }
  exportJSON() { return { type: "pagebreak", version: 1 }; }
  decorate() { return null; }
}

const PAGE_BREAK_TRANSFORMER = {
  dependencies: [PageBreakNode],
  export: (node) => {
    return node instanceof PageBreakNode ? '![pagebreak](pagebreak)' : null;
  },
  replace: () => { },
  type: "element",
};

const editor = createEditor({
  nodes: [ParagraphNode, TextNode, PageBreakNode],
  onError: (e) => { throw e; }
});

try {
  editor.update(() => {
    const root = require('lexical').$getRoot();
    const pb = new PageBreakNode();
    root.append(pb);

    // Add a normal paragraph just to be sure
    const p = new ParagraphNode();
    p.append(new TextNode('Hello'));
    root.append(p);
  }, { discrete: true });

  editor.getEditorState().read(() => {
    const md = $convertToMarkdownString([PAGE_BREAK_TRANSFORMER]);
    console.log("Markdown output:", JSON.stringify(md));
  });
} catch (e) {
  console.error(e);
}
