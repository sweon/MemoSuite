import { jsx as _jsx } from "react/jsx-runtime";
import { DecoratorNode } from "lexical";
import React, { Suspense } from "react";
// Lazy load the component
const HandwritingComponent = React.lazy(() => import("../ui/HandwritingComponent"));
export class HandwritingNode extends DecoratorNode {
    __data;
    static getType() {
        return "handwriting";
    }
    static clone(node) {
        return new HandwritingNode(node.__data, node.getKey());
    }
    static importJSON(serializedNode) {
        const node = $createHandwritingNode(serializedNode.data);
        return node;
    }
    exportJSON() {
        return {
            data: this.__data,
            type: "handwriting",
            version: 1,
        };
    }
    constructor(data, key) {
        super(key);
        this.__data = data;
    }
    createDOM(_config) {
        const div = document.createElement("div");
        div.className = "handwriting-node";
        div.style.display = "block";
        return div;
    }
    updateDOM(_prevNode, _dom, _config) {
        return false;
    }
    setData(data) {
        const writable = this.getWritable();
        writable.__data = data;
    }
    getData() {
        return this.__data;
    }
    getTextContent() {
        return `\n\`\`\`fabric\n${this.__data}\n\`\`\`\n`;
    }
    decorate() {
        return (_jsx(Suspense, { fallback: null, children: _jsx(HandwritingComponent, { data: this.__data, nodeKey: this.getKey() }) }));
    }
    exportDOM() {
        const element = document.createElement("div");
        element.setAttribute("data-type", "handwriting");
        element.setAttribute("data-data", this.__data);
        return { element };
    }
    static importDOM() {
        return {
            div: (domNode) => {
                if (!domNode.hasAttribute("data-type") || domNode.getAttribute("data-type") !== "handwriting") {
                    return null;
                }
                return {
                    conversion: convertHandwritingElement,
                    priority: 1,
                };
            },
        };
    }
}
function convertHandwritingElement(domNode) {
    const data = domNode.getAttribute("data-data");
    if (data) {
        const node = $createHandwritingNode(data);
        return { node };
    }
    return null;
}
export function $createHandwritingNode(data) {
    return new HandwritingNode(data);
}
export function $isHandwritingNode(node) {
    return node instanceof HandwritingNode;
}
