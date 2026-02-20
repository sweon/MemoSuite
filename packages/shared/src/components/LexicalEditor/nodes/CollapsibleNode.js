import { ElementNode } from "lexical";
export class CollapsibleNode extends ElementNode {
    __open;
    __title;
    static getType() {
        return "collapsible";
    }
    static clone(node) {
        return new CollapsibleNode(node.__open, node.__title, node.getKey());
    }
    constructor(open, title = "Details", key) {
        super(key);
        this.__open = open;
        this.__title = title;
    }
    createDOM() {
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
    updateDOM(prevNode, dom) {
        const open = this.__open;
        if (prevNode.__open !== open) {
            dom.open = open;
        }
        return false;
    }
    static importJSON(serializedNode) {
        const node = $createCollapsibleNode(serializedNode.open, serializedNode.title);
        return node;
    }
    exportJSON() {
        return {
            ...super.exportJSON(),
            open: this.__open,
            title: this.__title,
            type: "collapsible",
            version: 1,
        };
    }
    setOpen(open) {
        const writable = this.getWritable();
        writable.__open = open;
    }
    getOpen() {
        return this.__open;
    }
    setTitle(title) {
        const writable = this.getWritable();
        writable.__title = title;
    }
    getTitle() {
        return this.__title;
    }
    collapseAtStart() {
        return true;
    }
}
export function $createCollapsibleNode(open, title) {
    return new CollapsibleNode(open, title);
}
export function $isCollapsibleNode(node) {
    return node instanceof CollapsibleNode;
}
