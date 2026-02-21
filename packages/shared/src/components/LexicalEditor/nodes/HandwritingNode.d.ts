import { DecoratorNode } from "lexical";
import React from "react";
import type { DOMConversionMap, DOMExportOutput, EditorConfig, LexicalNode, NodeKey, SerializedLexicalNode, Spread } from "lexical";
export type SerializedHandwritingNode = Spread<{
    data: string;
}, SerializedLexicalNode>;
export declare class HandwritingNode extends DecoratorNode<React.ReactNode> {
    __data: string;
    static getType(): string;
    static clone(node: HandwritingNode): HandwritingNode;
    static importJSON(serializedNode: SerializedHandwritingNode): HandwritingNode;
    exportJSON(): SerializedHandwritingNode;
    constructor(data: string, key?: NodeKey);
    createDOM(_config: EditorConfig): HTMLElement;
    updateDOM(_prevNode: HandwritingNode, _dom: HTMLElement, _config: EditorConfig): boolean;
    setData(data: string): void;
    getData(): string;
    getTextContent(): string;
    decorate(): React.ReactNode;
    exportDOM(): DOMExportOutput;
    static importDOM(): DOMConversionMap | null;
}
export declare function $createHandwritingNode(data: string): HandwritingNode;
export declare function $isHandwritingNode(node: LexicalNode | null | undefined): node is HandwritingNode;
