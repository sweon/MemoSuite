import { DecoratorNode } from "lexical";
import type {
    DOMConversionMap,
    DOMConversionOutput,
    DOMExportOutput,
    EditorConfig,
    LexicalNode,
    NodeKey,
    SerializedLexicalNode,
    Spread,
} from "lexical";
import React, { Suspense } from "react";

const YouTubeComponent = React.lazy(
    () => import("../ui/YouTubeComponent")
);

export type SerializedYouTubeNode = Spread<
    {
        videoId: string;
        startTimestamp?: number;
        isShort?: boolean;
        rawUrl?: string;
    },
    SerializedLexicalNode
>;

/**
 * Extracts a YouTube video ID from various URL formats.
 */
export function extractYouTubeVideoId(url: string): { videoId: string; startTimestamp?: number; isShort?: boolean } | null {
    if (!url) return null;
    const trimmed = url.trim();

    let videoId = '';
    let startTimestamp: number | undefined;
    let isShort = false;

    try {
        if (trimmed.includes('youtube.com/watch')) {
            const u = new URL(trimmed);
            videoId = u.searchParams.get('v') || '';
            const t = u.searchParams.get('t');
            if (t) startTimestamp = parseInt(t);
        } else if (trimmed.includes('youtu.be/')) {
            videoId = trimmed.split('youtu.be/')[1]?.split('?')[0] || '';
            try {
                const u = new URL(trimmed);
                const t = u.searchParams.get('t');
                if (t) startTimestamp = parseInt(t);
            } catch { /* ignore */ }
        } else if (trimmed.includes('youtube.com/shorts/')) {
            videoId = trimmed.split('youtube.com/shorts/')[1]?.split('?')[0] || '';
            isShort = true;
        } else if (trimmed.includes('youtube.com/embed/')) {
            videoId = trimmed.split('youtube.com/embed/')[1]?.split('?')[0] || '';
        } else if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
            // Bare video ID
            videoId = trimmed;
        }
    } catch {
        return null;
    }

    if (!videoId) return null;
    return { videoId, startTimestamp, isShort };
}

/**
 * Check if a URL is a YouTube video URL.
 */
export function isYouTubeUrl(url: string): boolean {
    if (!url) return false;
    return url.includes('youtube.com/watch') ||
        url.includes('youtu.be/') ||
        url.includes('youtube.com/embed/') ||
        url.includes('youtube.com/shorts/');
}

export class YouTubeNode extends DecoratorNode<React.ReactNode> {
    __videoId: string;
    __startTimestamp?: number;
    __isShort: boolean;
    __rawUrl?: string;

    static getType(): string {
        return "youtube";
    }

    static clone(node: YouTubeNode): YouTubeNode {
        return new YouTubeNode(node.__videoId, node.__startTimestamp, node.__isShort, node.__rawUrl, node.getKey());
    }

    static importJSON(serializedNode: SerializedYouTubeNode): YouTubeNode {
        return new YouTubeNode(
            serializedNode.videoId,
            serializedNode.startTimestamp,
            serializedNode.isShort,
            serializedNode.rawUrl
        );
    }

    exportJSON(): SerializedYouTubeNode {
        return {
            videoId: this.__videoId,
            startTimestamp: this.__startTimestamp,
            isShort: this.__isShort,
            rawUrl: this.__rawUrl,
            type: "youtube",
            version: 1,
        };
    }

    constructor(videoId: string, startTimestamp?: number, isShort?: boolean, rawUrl?: string, key?: NodeKey) {
        super(key);
        this.__videoId = videoId;
        this.__startTimestamp = startTimestamp;
        this.__isShort = isShort || false;
        this.__rawUrl = rawUrl;
    }

    createDOM(_config: EditorConfig): HTMLElement {
        const div = document.createElement("div");
        div.className = "youtube-node";
        div.style.display = "block";
        return div;
    }

    updateDOM(): boolean {
        return false;
    }

    getVideoId(): string {
        return this.__videoId;
    }

    getStartTimestamp(): number | undefined {
        return this.__startTimestamp;
    }

    getIsShort(): boolean {
        return this.__isShort;
    }

    getRawUrl(): string | undefined {
        return this.__rawUrl;
    }

    getTextContent(): string {
        // Reconstruct the ```youtube code block for markdown export
        const lines: string[] = [];
        if (this.__rawUrl) {
            lines.push(this.__rawUrl);
        } else {
            lines.push(`https://www.youtube.com/watch?v=${this.__videoId}`);
        }
        if (this.__startTimestamp) {
            lines.push(`start=${this.__startTimestamp}`);
        }
        if (this.__isShort) {
            lines.push('short');
        }
        return `\n\`\`\`youtube\n${lines.join('\n')}\n\`\`\`\n`;
    }

    decorate(): React.ReactNode {
        return (
            <Suspense fallback={
                <div style={{
                    width: this.__isShort ? '320px' : '100%',
                    maxWidth: this.__isShort ? '320px' : '560px',
                    aspectRatio: this.__isShort ? '9/16' : '16/9',
                    background: '#000',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    margin: '1rem auto'
                }}>
                    Loading...
                </div>
            }>
                <YouTubeComponent
                    videoId={this.__videoId}
                    startTimestamp={this.__startTimestamp}
                    isShort={this.__isShort}
                    nodeKey={this.getKey()}
                />
            </Suspense>
        );
    }

    exportDOM(): DOMExportOutput {
        const element = document.createElement("div");
        element.setAttribute("data-type", "youtube");
        element.setAttribute("data-video-id", this.__videoId);
        if (this.__startTimestamp !== undefined) {
            element.setAttribute("data-start", this.__startTimestamp.toString());
        }
        if (this.__isShort) {
            element.setAttribute("data-short", "true");
        }
        if (this.__rawUrl) {
            element.setAttribute("data-url", this.__rawUrl);
        }
        return { element };
    }

    static importDOM(): DOMConversionMap | null {
        return {
            div: (domNode: HTMLElement) => {
                if (domNode.getAttribute("data-type") !== "youtube") {
                    return null;
                }
                return {
                    conversion: convertYouTubeElement,
                    priority: 1,
                };
            },
        };
    }
}

function convertYouTubeElement(domNode: HTMLElement): DOMConversionOutput | null {
    const videoId = domNode.getAttribute("data-video-id");
    if (videoId) {
        const start = domNode.getAttribute("data-start");
        const isShort = domNode.getAttribute("data-short") === "true";
        const rawUrl = domNode.getAttribute("data-url") || undefined;
        const node = $createYouTubeNode(videoId, start ? parseInt(start) : undefined, isShort, rawUrl);
        return { node };
    }
    return null;
}

export function $createYouTubeNode(
    videoId: string,
    startTimestamp?: number,
    isShort?: boolean,
    rawUrl?: string,
    key?: NodeKey
): YouTubeNode {
    return new YouTubeNode(videoId, startTimestamp, isShort, rawUrl, key);
}

export function $isYouTubeNode(node: LexicalNode | null | undefined): node is YouTubeNode {
    return node instanceof YouTubeNode;
}
