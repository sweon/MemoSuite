import { jsx as _jsx } from "react/jsx-runtime";
import { DecoratorNode } from "lexical";
import styled from "styled-components";
const ImageWrapper = styled.div `
  display: inline-block;
  max-width: 100%;
  margin: 10px 0;
  user-select: none;
`;
const StyledImage = styled.img `
  max-width: 100%;
  height: auto;
  border: 1px solid #ddd;
  display: block;
`;
export class ImageNode extends DecoratorNode {
    __src;
    __altText;
    __width;
    __height;
    static getType() {
        return "image";
    }
    static clone(node) {
        return new ImageNode(node.__src, node.__altText, node.__width, node.__height, node.getKey());
    }
    static importJSON(serializedNode) {
        const { src, altText, width, height } = serializedNode;
        const node = $createImageNode({ src, altText, width, height });
        return node;
    }
    exportJSON() {
        return {
            src: this.__src,
            altText: this.__altText,
            width: this.__width,
            height: this.__height,
            type: "image",
            version: 1,
        };
    }
    constructor(src, altText, width, height, key) {
        super(key);
        this.__src = src;
        this.__altText = altText;
        this.__width = width;
        this.__height = height;
    }
    createDOM(config) {
        const span = document.createElement("span");
        const theme = config.theme;
        const className = theme.image;
        if (className !== undefined) {
            span.className = className;
        }
        return span;
    }
    updateDOM() {
        return false;
    }
    decorate() {
        return (_jsx(ImageWrapper, { children: _jsx(StyledImage, { src: this.__src, alt: this.__altText, style: {
                    width: this.__width || 'auto',
                    height: this.__height || 'auto',
                } }) }));
    }
    exportDOM() {
        const element = document.createElement("img");
        element.setAttribute("src", this.__src);
        element.setAttribute("alt", this.__altText);
        if (this.__width)
            element.setAttribute("width", this.__width.toString());
        if (this.__height)
            element.setAttribute("height", this.__height.toString());
        return { element };
    }
    static importDOM() {
        return {
            img: (_domNode) => ({
                conversion: convertImageElement,
                priority: 0,
            }),
        };
    }
}
function convertImageElement(domNode) {
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
export function $createImageNode({ src, altText, width, height, key, }) {
    return new ImageNode(src, altText, width, height, key);
}
export function $isImageNode(node) {
    return node instanceof ImageNode;
}
