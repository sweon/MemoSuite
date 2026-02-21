import { DecoratorNode } from "lexical";
import React from "react";
import type { DOMConversionMap, DOMExportOutput, EditorConfig, LexicalNode, NodeKey, SerializedLexicalNode, Spread } from "lexical";
export type SerializedImageNode = Spread<{
    src: string;
    altText: string;
    width?: number;
    height?: number;
}, SerializedLexicalNode>;
export declare class ImageNode extends DecoratorNode<React.ReactNode> {
    __src: string;
    __altText: string;
    __width?: number;
    __height?: number;
    static getType(): string;
    static clone(node: ImageNode): ImageNode;
    static importJSON(serializedNode: SerializedImageNode): ImageNode;
    exportJSON(): SerializedImageNode;
    constructor(src: string, altText: string, width?: number, height?: number, key?: NodeKey);
    createDOM(config: EditorConfig): HTMLElement;
    updateDOM(): false;
    decorate(): React.ReactNode;
    exportDOM(): DOMExportOutput;
    static importDOM(): DOMConversionMap | null;
}
export declare function $createImageNode({ src, altText, width, height, key, }: {
    src: string;
    altText: string;
    width?: number;
    height?: number;
    key?: NodeKey;
}): ImageNode;
export declare function $isImageNode(node: LexicalNode | null | undefined): node is ImageNode;
