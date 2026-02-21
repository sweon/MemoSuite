import { DecoratorNode } from "lexical";
import type { DOMConversionMap, DOMExportOutput, EditorConfig, LexicalNode, NodeKey, SerializedLexicalNode, Spread } from "lexical";
import React from "react";
export type SerializedYouTubeNode = Spread<{
    videoId: string;
    startTimestamp?: number;
    isShort?: boolean;
    rawUrl?: string;
}, SerializedLexicalNode>;
/**
 * Extracts a YouTube video ID from various URL formats.
 */
export declare function extractYouTubeVideoId(url: string): {
    videoId: string;
    startTimestamp?: number;
    isShort?: boolean;
} | null;
/**
 * Check if a URL is a YouTube video URL.
 */
export declare function isYouTubeUrl(url: string): boolean;
export declare class YouTubeNode extends DecoratorNode<React.ReactNode> {
    __videoId: string;
    __startTimestamp?: number;
    __isShort: boolean;
    __rawUrl?: string;
    static getType(): string;
    static clone(node: YouTubeNode): YouTubeNode;
    static importJSON(serializedNode: SerializedYouTubeNode): YouTubeNode;
    exportJSON(): SerializedYouTubeNode;
    constructor(videoId: string, startTimestamp?: number, isShort?: boolean, rawUrl?: string, key?: NodeKey);
    createDOM(_config: EditorConfig): HTMLElement;
    updateDOM(): boolean;
    getVideoId(): string;
    getStartTimestamp(): number | undefined;
    getIsShort(): boolean;
    getRawUrl(): string | undefined;
    getTextContent(): string;
    decorate(): React.ReactNode;
    exportDOM(): DOMExportOutput;
    static importDOM(): DOMConversionMap | null;
}
export declare function $createYouTubeNode(videoId: string, startTimestamp?: number, isShort?: boolean, rawUrl?: string, key?: NodeKey): YouTubeNode;
export declare function $isYouTubeNode(node: LexicalNode | null | undefined): node is YouTubeNode;
