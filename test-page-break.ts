import { JSDOM } from "jsdom";
const dom = new JSDOM();
(global as any).document = dom.window.document;
(global as any).window = dom.window;

import { createEditor, ParagraphNode, TextNode } from "lexical";
import { $convertFromMarkdownString, $convertToMarkdownString } from "@lexical/markdown";
import { PageBreakNode, $createPageBreakNode } from "./packages/shared/src/components/LexicalEditor/nodes/PageBreakNode";
import { LexicalEditor } from "lexical";

const editor = createEditor({
  nodes: [ParagraphNode, TextNode, PageBreakNode],
  onError: (e) => { throw e; }
});

const PAGE_BREAK_TRANSFORMER = {
  dependencies: [PageBreakNode],
  export: (node) => {
    return node instanceof PageBreakNode ? '<div class="page-break" style="page-break-after: always;"></div>' : null;
  },
  regExp: /^<div(?: class="page-break")? style="page-break-after: always;"><\/div>$/,
  replace: (parentNode, _1, _2, isFirstLine) => {
    const pbNode = $createPageBreakNode();
    if (isFirstLine) parentNode.replace(pbNode);
    else parentNode.insertBefore(pbNode);
  },
  type: "element",
};

editor.update(() => {
  $convertFromMarkdownString('Hello\n\n<div class="page-break" style="page-break-after: always;"></div>\n\nWorld', [PAGE_BREAK_TRANSFORMER]);
});

setTimeout(() => {
  editor.getEditorState().read(() => {
    console.log("MARKDOWN RESULT:");
    console.log($convertToMarkdownString([PAGE_BREAK_TRANSFORMER]));
  });
}, 100);
