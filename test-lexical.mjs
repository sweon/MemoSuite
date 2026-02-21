import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.HTMLElement = dom.window.HTMLElement;

import { createEditor, ParagraphNode, TextNode } from 'lexical';
import { $convertFromMarkdownString, $convertToMarkdownString } from '@lexical/markdown';
import { ALL_TRANSFORMERS, EXPORT_TRANSFORMERS } from './packages/shared/src/components/LexicalEditor/LexicalEditor.tsx';
import { PageBreakNode, $createPageBreakNode } from './packages/shared/src/components/LexicalEditor/nodes/PageBreakNode.tsx';

// Need to mock or ignore some things for rendering
const editor = createEditor({
    nodes: [ParagraphNode, TextNode, PageBreakNode],
});

editor.update(() => {
    $convertFromMarkdownString('![pagebreak](https://pagebreak)', ALL_TRANSFORMERS);
}, { discrete: true });

editor.getEditorState().read(() => {
    const root = editor.getRoot();
    console.log("Nodes:", root.getChildren().map(n => n.getType()));
    const md = $convertToMarkdownString(EXPORT_TRANSFORMERS);
    console.log("MD Output:", JSON.stringify(md));
});
