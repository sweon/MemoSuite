import { DecoratorNode, createCommand } from "lexical";
import type { LexicalNode, NodeKey, SerializedLexicalNode, LexicalCommand } from "lexical";
import React from "react";

export const INSERT_PAGE_BREAK_COMMAND: LexicalCommand<void> = createCommand("INSERT_PAGE_BREAK_COMMAND");

export type SerializedPageBreakNode = SerializedLexicalNode;

export class PageBreakNode extends DecoratorNode<React.JSX.Element> {
    static getType(): string {
        return "pagebreak";
    }

    static clone(node: PageBreakNode): PageBreakNode {
        return new PageBreakNode(node.__key);
    }

    constructor(key?: NodeKey) {
        super(key);
    }

    createDOM(): HTMLElement {
        const el = document.createElement("div");
        el.className = "page-break-container";
        el.style.pageBreakAfter = "always";
        el.style.breakAfter = "page";
        return el;
    }

    updateDOM(): false {
        return false;
    }

    static importJSON(_serializedNode: SerializedPageBreakNode): PageBreakNode {
        return $createPageBreakNode();
    }

    exportJSON(): SerializedPageBreakNode {
        return {
            type: "pagebreak",
            version: 1,
        };
    }

    decorate(): React.JSX.Element {
        return (
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    margin: '20px 0',
                    width: '100%',
                    position: 'relative',
                    userSelect: 'none',
                    pageBreakAfter: 'always',
                    breakAfter: 'page'
                }}
                contentEditable={false}
            >
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: 0,
                    right: 0,
                    borderTop: '2px dashed #999',
                    zIndex: 0
                }} />
                <div style={{
                    background: '#fff',
                    color: '#999',
                    padding: '2px 8px',
                    fontSize: '12px',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    zIndex: 1,
                    position: 'relative',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    marginRight: '20px'
                }}>
                    Page Break
                </div>
            </div>
        );
    }
}

export function $createPageBreakNode(): PageBreakNode {
    return new PageBreakNode();
}

export function $isPageBreakNode(node: LexicalNode | null | undefined): node is PageBreakNode {
    return node instanceof PageBreakNode;
}
