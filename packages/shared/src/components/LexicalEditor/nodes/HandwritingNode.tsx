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

// Lazy load the component
const HandwritingComponent = React.lazy(
    () => import("../ui/HandwritingComponent")
);

export type SerializedHandwritingNode = Spread<
    {
        data: string;
    },
    SerializedLexicalNode
>;

export class HandwritingNode extends DecoratorNode<JSX.Element> {
    __data: string;

    static getType(): string {
        return "handwriting";
    }

    static clone(node: HandwritingNode): HandwritingNode {
        return new HandwritingNode(node.__data, node.__key);
    }

    static importJSON(serializedNode: SerializedHandwritingNode): HandwritingNode {
        const node = $createHandwritingNode(serializedNode.data);
        return node;
    }

    exportJSON(): SerializedHandwritingNode {
        return {
            data: this.__data,
            type: "handwriting",
            version: 1,
        };
    }

    constructor(data: string, key?: NodeKey) {
        super(key);
        this.__data = data;
    }

    createDOM(_config: EditorConfig): HTMLElement {
        const div = document.createElement("div");
        div.className = "handwriting-node";
        div.style.display = "block";
        return div;
    }

    updateDOM(
        _prevNode: HandwritingNode,
        _dom: HTMLElement,
        _config: EditorConfig
    ): boolean {
        return false;
    }

    setData(data: string): void {
        const writable = this.getWritable();
        writable.__data = data;
    }

    getData(): string {
        return this.__data;
    }

    decorate(): JSX.Element {
        return (
            <Suspense fallback={null}>
                <HandwritingComponent
                    data={this.__data}
                    nodeKey={this.getKey()}
                />
            </Suspense>
        );
    }

    exportDOM(): DOMExportOutput {
        const element = document.createElement("div");
        element.setAttribute("data-type", "handwriting");
        element.setAttribute("data-data", this.__data);
        return { element };
    }

    static importDOM(): DOMConversionMap | null {
        return {
            div: (domNode: HTMLElement) => {
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

function convertHandwritingElement(domNode: HTMLElement): DOMConversionOutput | null {
    const data = domNode.getAttribute("data-data");
    if (data) {
        const node = $createHandwritingNode(data);
        return { node };
    }
    return null;
}

export function $createHandwritingNode(data: string): HandwritingNode {
    return new HandwritingNode(data);
}

export function $isHandwritingNode(
    node: LexicalNode | null | undefined
): node is HandwritingNode {
    return node instanceof HandwritingNode;
}
