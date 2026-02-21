import { ElementNode } from "lexical";
import type { LexicalNode, NodeKey, SerializedElementNode, Spread } from "lexical";
export type SerializedCollapsibleNode = Spread<{
    open: boolean;
    title: string;
}, SerializedElementNode>;
export declare class CollapsibleNode extends ElementNode {
    __open: boolean;
    __title: string;
    static getType(): string;
    static clone(node: CollapsibleNode): CollapsibleNode;
    constructor(open: boolean, title?: string, key?: NodeKey);
    createDOM(): HTMLElement;
    updateDOM(prevNode: CollapsibleNode, dom: HTMLDetailsElement): boolean;
    static importJSON(serializedNode: SerializedCollapsibleNode): CollapsibleNode;
    exportJSON(): SerializedCollapsibleNode;
    setOpen(open: boolean): void;
    getOpen(): boolean;
    setTitle(title: string): void;
    getTitle(): string;
    collapseAtStart(): boolean;
}
export declare function $createCollapsibleNode(open: boolean, title: string): CollapsibleNode;
export declare function $isCollapsibleNode(node: LexicalNode | null | undefined): node is CollapsibleNode;
