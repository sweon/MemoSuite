import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { DecoratorNode, createCommand } from "lexical";
export const INSERT_PAGE_BREAK_COMMAND = createCommand("INSERT_PAGE_BREAK_COMMAND");
export class PageBreakNode extends DecoratorNode {
    static getType() {
        return "pagebreak";
    }
    static clone(node) {
        return new PageBreakNode(node.__key);
    }
    constructor(key) {
        super(key);
    }
    static importJSON(_serializedNode) {
        return $createPageBreakNode();
    }
    exportJSON() {
        return {
            ...super.exportJSON(),
            type: this.getType(),
            version: 1,
        };
    }
    exportDOM() {
        const element = document.createElement("div");
        element.setAttribute("data-type", "pagebreak");
        element.className = "page-break";
        element.style.pageBreakAfter = "always";
        element.style.breakAfter = "page";
        return { element };
    }
    static importDOM() {
        return {
            div: (domNode) => {
                if (domNode.getAttribute("data-type") === "pagebreak" || domNode.classList.contains("page-break")) {
                    return {
                        conversion: () => ({ node: $createPageBreakNode() }),
                        priority: 1,
                    };
                }
                return null;
            },
        };
    }
    getTextContent() {
        return "\n\n\\newpage\n\n";
    }
    createDOM() {
        const el = document.createElement("div");
        el.className = "page-break-container";
        el.style.pageBreakAfter = "always";
        el.style.breakAfter = "page";
        return el;
    }
    updateDOM() {
        return false;
    }
    decorate() {
        return (_jsxs("div", { style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                margin: '20px 0',
                width: '100%',
                position: 'relative',
                userSelect: 'none',
                pageBreakAfter: 'always',
                breakAfter: 'page'
            }, contentEditable: false, children: [_jsx("div", { className: "no-print", style: {
                        position: 'absolute',
                        top: '50%',
                        left: 0,
                        right: 0,
                        borderTop: '2px dashed #999',
                        zIndex: 0
                    } }), _jsx("div", { className: "no-print", style: {
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
                    }, children: "Page Break" })] }));
    }
}
export function $createPageBreakNode() {
    return new PageBreakNode();
}
export function $isPageBreakNode(node) {
    return node?.getType() === "pagebreak";
}
