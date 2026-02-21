const { JSDOM } = require("jsdom");
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.HTMLElement = dom.window.HTMLElement;

require("ts-node").register({
    compilerOptions: { module: "commonjs", esModuleInterop: true },
    transpileOnly: true
});

const { createEditor, ParagraphNode, TextNode, DecoratorNode, RootNode } = require("lexical");
const { $convertToMarkdownString, $convertFromMarkdownString } = require("@lexical/markdown");

const { PageBreakNode, $createPageBreakNode, $isPageBreakNode } = require("./packages/shared/src/components/LexicalEditor/nodes/PageBreakNode.tsx");

const PAGE_BREAK_TRANSFORMER = {
  dependencies: [PageBreakNode],
  export: (node) => {
    return $isPageBreakNode(node) ? '![pagebreak](https://pagebreak)' : null;
  },
  regExp: /^(?:<div[^>]*page-break[^>]*>.*?<\/div>|<div style="page-break-after: always;"><\/div>|<hr[^>]*page-break[^>]*>|\\newpage|!\[pagebreak\]\(pagebreak\)|!\[pagebreak\]\(https:\/\/pagebreak\))\s*$/i,
  replace: (parentNode, _1, _2, isImport) => {
    const pbNode = $createPageBreakNode();
    if (isImport) {
      parentNode.replace(pbNode);
    } else {
      parentNode.insertBefore(pbNode);
    }
    pbNode.selectNext();
  },
  type: "element",
};

const editor = createEditor({
    nodes: [ParagraphNode, TextNode, PageBreakNode],
    onError: (e) => { throw e; }
});

editor.update(() => {
    const root = require("lexical").$getRoot();
    
    // Test 1: Insert manually and export
    const pb = $createPageBreakNode();
    root.append(pb);
}, { discrete: true });

let md = "";
editor.getEditorState().read(() => {
    md = $convertToMarkdownString([PAGE_BREAK_TRANSFORMER]);
    console.log("EXPORTED MD:", JSON.stringify(md));
});

editor.update(() => {
    // Clear and re-import
    const root = require("lexical").$getRoot();
    root.clear();
    $convertFromMarkdownString(md, [PAGE_BREAK_TRANSFORMER]);
}, { discrete: true });

editor.getEditorState().read(() => {
    const md2 = $convertToMarkdownString([PAGE_BREAK_TRANSFORMER]);
    console.log("RE-EXPORTED MD:", JSON.stringify(md2));
    const root = require("lexical").$getRoot();
    console.log("CHILDREN:", root.getChildren().map(n => n.getType()));
});
