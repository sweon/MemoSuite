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

const SpreadsheetComponent = React.lazy(
    () => import("../ui/SpreadsheetComponent")
);

export type SerializedSpreadsheetNode = Spread<
    {
        data: string;
    },
    SerializedLexicalNode
>;

export class SpreadsheetNode extends DecoratorNode<JSX.Element> {
    __data: string;

    static getType(): string {
        return "spreadsheet";
    }

    static clone(node: SpreadsheetNode): SpreadsheetNode {
        return new SpreadsheetNode(node.__data, node.getKey());
    }

    static importJSON(serializedNode: SerializedSpreadsheetNode): SpreadsheetNode {
        const node = $createSpreadsheetNode(serializedNode.data);
        return node;
    }

    exportJSON(): SerializedSpreadsheetNode {
        return {
            data: this.__data,
            type: "spreadsheet",
            version: 1,
        };
    }

    constructor(data: string, key?: NodeKey) {
        super(key);
        this.__data = data;
    }

    createDOM(_config: EditorConfig): HTMLElement {
        const div = document.createElement("div");
        div.className = "spreadsheet-node";
        div.style.display = "block";
        return div;
    }

    updateDOM(
        _prevNode: SpreadsheetNode,
        _dom: HTMLElement,
        _config: EditorConfig
    ): boolean {
        return false;
    }

    setData(data: string): void {
        const writable = this.getWritable() as SpreadsheetNode;
        writable.__data = data;
    }

    getData(): string {
        return this.__data;
    }

    getTextContent(): string {
        return `\n\`\`\`spreadsheet\n${this.__data}\n\`\`\`\n`;
    }

    decorate(): JSX.Element {
        return (
            <Suspense fallback={null}>
                <SpreadsheetComponent
                    data={this.__data}
                    nodeKey={this.getKey()}
                />
            </Suspense>
        );
    }

    exportDOM(): DOMExportOutput {
        const element = document.createElement("div");
        element.setAttribute("data-type", "spreadsheet");
        element.setAttribute("data-data", this.__data);
        return { element };
    }

    static importDOM(): DOMConversionMap | null {
        return {
            div: (domNode: HTMLElement) => {
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

function convertSpreadsheetElement(domNode: HTMLElement): DOMConversionOutput | null {
    const data = domNode.getAttribute("data-data");
    if (data) {
        const node = $createSpreadsheetNode(data);
        return { node };
    }
    return null;
}

export function $createSpreadsheetNode(data: string): SpreadsheetNode {
    return new SpreadsheetNode(data);
}

export function $isSpreadsheetNode(
    node: LexicalNode | null | undefined
): node is SpreadsheetNode {
    return node instanceof SpreadsheetNode;
}
