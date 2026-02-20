import { jsx as _jsx } from "react/jsx-runtime";
import { DecoratorNode } from "lexical";
import React, { Suspense } from "react";
const SpreadsheetComponent = React.lazy(() => import("../ui/SpreadsheetComponent"));
export class SpreadsheetNode extends DecoratorNode {
    __data;
    static getType() {
        return "spreadsheet";
    }
    static clone(node) {
        return new SpreadsheetNode(node.__data, node.getKey());
    }
    static importJSON(serializedNode) {
        const node = $createSpreadsheetNode(serializedNode.data);
        return node;
    }
    exportJSON() {
        return {
            data: this.__data,
            type: "spreadsheet",
            version: 1,
        };
    }
    constructor(data, key) {
        super(key);
        this.__data = data;
    }
    createDOM(_config) {
        const div = document.createElement("div");
        div.className = "spreadsheet-node";
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
        return `\n\`\`\`spreadsheet\n${this.__data}\n\`\`\`\n`;
    }
    decorate() {
        return (_jsx(Suspense, { fallback: null, children: _jsx(SpreadsheetComponent, { data: this.__data, nodeKey: this.getKey() }) }));
    }
    exportDOM() {
        const element = document.createElement("div");
        element.setAttribute("data-type", "spreadsheet");
        element.setAttribute("data-data", this.__data);
        return { element };
    }
    static importDOM() {
        return {
            div: (domNode) => {
                if (!domNode.hasAttribute("data-type") || domNode.getAttribute("data-type") !== "spreadsheet") {
                    return null;
                }
                return {
                    conversion: convertSpreadsheetElement,
                    priority: 1,
                };
            },
        };
    }
}
function convertSpreadsheetElement(domNode) {
    const data = domNode.getAttribute("data-data");
    if (data) {
        const node = $createSpreadsheetNode(data);
        return { node };
    }
    return null;
}
export function $createSpreadsheetNode(data) {
    return new SpreadsheetNode(data);
}
export function $isSpreadsheetNode(node) {
    return node instanceof SpreadsheetNode;
}
