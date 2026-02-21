import { DecoratorNode } from "lexical";
import type { DOMConversionMap, DOMExportOutput, EditorConfig, LexicalNode, NodeKey, SerializedLexicalNode, Spread } from "lexical";
import React from "react";
export type SerializedSpreadsheetNode = Spread<{
    data: string;
}, SerializedLexicalNode>;
export declare class SpreadsheetNode extends DecoratorNode<React.ReactNode> {
    __data: string;
    static getType(): string;
    static clone(node: SpreadsheetNode): SpreadsheetNode;
    static importJSON(serializedNode: SerializedSpreadsheetNode): SpreadsheetNode;
    exportJSON(): SerializedSpreadsheetNode;
    constructor(data: string, key?: NodeKey);
    createDOM(_config: EditorConfig): HTMLElement;
    updateDOM(_prevNode: SpreadsheetNode, _dom: HTMLElement, _config: EditorConfig): boolean;
    setData(data: string): void;
    getData(): string;
    getTextContent(): string;
    decorate(): React.ReactNode;
    exportDOM(): DOMExportOutput;
    static importDOM(): DOMConversionMap | null;
}
export declare function $createSpreadsheetNode(data: string): SpreadsheetNode;
export declare function $isSpreadsheetNode(node: LexicalNode | null | undefined): node is SpreadsheetNode;
