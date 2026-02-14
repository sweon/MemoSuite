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
import styled from "styled-components";

const ImageWrapper = styled.div`
  display: inline-block;
  max-width: 100%;
  margin: 10px 0;
  user-select: none;
`;

const StyledImage = styled.img`
  max-width: 100%;
  height: auto;
  border: 1px solid #ddd;
  display: block;
`;

export type SerializedImageNode = Spread<
    {
        src: string;
        altText: string;
        width?: number;
        height?: number;
    },
    SerializedLexicalNode
>;

export class ImageNode extends DecoratorNode<JSX.Element> {
    __src: string;
    __altText: string;
    __width?: number;
    __height?: number;

    static getType(): string {
        return "image";
    }

    static clone(node: ImageNode): ImageNode {
        return new ImageNode(node.__src, node.__altText, node.__width, node.__height, node.getKey());
    }

    static importJSON(serializedNode: SerializedImageNode): ImageNode {
        const { src, altText, width, height } = serializedNode;
        const node = $createImageNode({ src, altText, width, height });
        return node;
    }

    exportJSON(): SerializedImageNode {
        return {
            src: this.__src,
            altText: this.__altText,
            width: this.__width,
            height: this.__height,
            type: "image",
            version: 1,
        };
    }

    constructor(src: string, altText: string, width?: number, height?: number, key?: NodeKey) {
        super(key);
        this.__src = src;
        this.__altText = altText;
        this.__width = width;
        this.__height = height;
    }

    createDOM(config: EditorConfig): HTMLElement {
        const span = document.createElement("span");
        const theme = config.theme;
        const className = theme.image;
        if (className !== undefined) {
            span.className = className;
        }
        return span;
    }

    updateDOM(): false {
        return false;
    }

    decorate(): JSX.Element {
        return (
            <ImageWrapper>
                <StyledImage
                    src={this.__src}
                    alt={this.__altText}
                    style={{
                        width: this.__width || 'auto',
                        height: this.__height || 'auto',
                    }}
                />
            </ImageWrapper>
        );
    }

    exportDOM(): DOMExportOutput {
        const element = document.createElement("img");
        element.setAttribute("src", this.__src);
        element.setAttribute("alt", this.__altText);
        if (this.__width) element.setAttribute("width", this.__width.toString());
        if (this.__height) element.setAttribute("height", this.__height.toString());
        return { element };
    }

    static importDOM(): DOMConversionMap | null {
        return {
            img: (_domNode: HTMLElement) => ({
                conversion: convertImageElement,
                priority: 0,
            }),
        };
    }
}

function convertImageElement(domNode: HTMLElement): DOMConversionOutput | null {
    if (domNode instanceof HTMLImageElement) {
        const { src, alt, width, height } = domNode;
        const node = $createImageNode({
            src,
            altText: alt,
            width: width || undefined,
            height: height || undefined
        });
        return { node };
    }
    return null;
}

export function $createImageNode({
    src,
    altText,
    width,
    height,
    key,
}: {
    src: string;
    altText: string;
    width?: number;
    height?: number;
    key?: NodeKey;
}): ImageNode {
    return new ImageNode(src, altText, width, height, key);
}

export function $isImageNode(node: LexicalNode | null | undefined): node is ImageNode {
    return node instanceof ImageNode;
}
