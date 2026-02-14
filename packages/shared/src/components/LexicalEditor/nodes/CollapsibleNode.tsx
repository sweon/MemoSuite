import { ElementNode } from "lexical";
import type { LexicalNode, NodeKey, SerializedElementNode, Spread } from "lexical";

export type SerializedCollapsibleNode = Spread<
    {
        open: boolean;
        title: string;
    },
    SerializedElementNode
>;

export class CollapsibleNode extends ElementNode {
    __open: boolean;
    __title: string;

    static getType(): string {
        return "collapsible";
    }

    static clone(node: CollapsibleNode): CollapsibleNode {
        return new CollapsibleNode(node.__open, node.__title, node.getKey());
    }

    constructor(open: boolean, title: string = "Details", key?: NodeKey) {
        super(key);
        this.__open = open;
        this.__title = title;
    }

    createDOM(): HTMLElement {
        const details = document.createElement("details");
        if (this.__open) {
            details.open = true;
        }
        details.className = "editor-collapsible";

        const summary = document.createElement("summary");
        summary.textContent = this.__title || "Details";
        summary.contentEditable = "false";
        details.appendChild(summary);

        // Standard browser behavior for toggle won't sync to Lexical node state automatically.
        // We can add a simple listener here, but better is a plugin. 
        // For now, let's just make it look right.

        return details;
    }

    updateDOM(prevNode: CollapsibleNode, dom: HTMLDetailsElement): boolean {
        const open = this.__open;
        if (prevNode.__open !== open) {
            dom.open = open;
        }
        return false;
    }

    static importJSON(serializedNode: SerializedCollapsibleNode): CollapsibleNode {
        const node = $createCollapsibleNode(serializedNode.open, serializedNode.title);
        return node;
    }

    exportJSON(): SerializedCollapsibleNode {
        return {
            ...super.exportJSON(),
            open: this.__open,
            title: this.__title,
            type: "collapsible",
            version: 1,
        };
    }

    setOpen(open: boolean): void {
        const writable = this.getWritable() as CollapsibleNode;
        writable.__open = open;
    }

    getOpen(): boolean {
        return this.__open;
    }

    setTitle(title: string): void {
        const writable = this.getWritable() as CollapsibleNode;
        writable.__title = title;
    }

    getTitle(): string {
        return this.__title;
    }

    collapseAtStart(): boolean {
        return true;
    }
}

export function $createCollapsibleNode(open: boolean, title: string): CollapsibleNode {
    return new CollapsibleNode(open, title);
}

export function $isCollapsibleNode(node: LexicalNode | null | undefined): node is CollapsibleNode {
    return node instanceof CollapsibleNode;
}
