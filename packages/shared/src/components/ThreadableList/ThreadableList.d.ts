import React from 'react';
import type { DropResult, DragUpdate, DragStart } from '@hello-pangea/dnd';
export interface ThreadableListProps<T> {
    items: T[];
    onDragEnd: (result: DropResult) => void;
    onDragStart?: (start: DragStart) => void;
    onDragUpdate?: (update: DragUpdate) => void;
    renderItem: (item: T, index: number, isCombineTarget: boolean) => React.ReactNode;
    droppableId: string;
    className?: string;
    style?: React.CSSProperties;
    isCombineEnabled?: boolean;
    type?: string;
    getItemId: (item: T) => string | number;
    useExternalContext?: boolean;
}
/**
 * A shared Drag & Drop list component that supports combining items into threads.
 * Specifically designed to unify thread management across MemoSuite apps.
 */
export declare function ThreadableList<T>({ items, onDragEnd, onDragStart, onDragUpdate, renderItem, droppableId, className, style, isCombineEnabled, type, getItemId, useExternalContext }: ThreadableListProps<T>): import("react/jsx-runtime").JSX.Element;
/**
 * Utility to help calculate the new order/thread status.
 * This can be expanded with the "Smart Join" logic from LLMemo.
 */
export declare const ThreadUtils: {
    /**
     * Helper to find if an item should be extracted or stay in a thread based on its new position.
     */
    calculateThreadTarget: <T extends {
        threadId?: string;
    }>(items: T[], sourceIndex: number, destIndex: number, movedItem: T) => string | undefined;
};
