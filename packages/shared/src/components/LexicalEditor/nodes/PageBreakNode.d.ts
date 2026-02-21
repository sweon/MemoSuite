import { DecoratorNode } from "lexical";
import type { LexicalNode, NodeKey, SerializedLexicalNode, LexicalCommand, DOMExportOutput, DOMConversionMap } from "lexical";
import React from "react";
export declare const INSERT_PAGE_BREAK_COMMAND: LexicalCommand<void>;
export type SerializedPageBreakNode = SerializedLexicalNode;
export declare class PageBreakNode extends DecoratorNode<React.JSX.Element> {
    static getType(): string;
    static clone(node: PageBreakNode): PageBreakNode;
    constructor(key?: NodeKey);
    static importJSON(_serializedNode: SerializedPageBreakNode): PageBreakNode;
    exportJSON(): SerializedPageBreakNode;
    exportDOM(): DOMExportOutput;
    static importDOM(): DOMConversionMap | null;
    getTextContent(): string;
    createDOM(): HTMLElement;
    updateDOM(): false;
    decorate(): React.JSX.Element;
}
export declare function $createPageBreakNode(): PageBreakNode;
export declare function $isPageBreakNode(node: LexicalNode | null | undefined): node is PageBreakNode;
