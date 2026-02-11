import React from 'react';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import type { DropResult, DragUpdate, DragStart } from '@hello-pangea/dnd';

import { TouchDelayDraggable } from './TouchDelayDraggable';

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
export function ThreadableList<T>({
    items,
    onDragEnd,
    onDragStart,
    onDragUpdate,
    renderItem,
    droppableId,
    className,
    style,
    isCombineEnabled = true,
    type,
    getItemId,
    useExternalContext = false
}: ThreadableListProps<T>) {
    const handleDragUpdate = (update: DragUpdate) => {
        onDragUpdate?.(update);
    };

    const handleDragEnd = (result: DropResult) => {
        onDragEnd(result);
    };

    const content = (
        <Droppable droppableId={droppableId} isCombineEnabled={isCombineEnabled} type={type}>
            {(provided) => (
                <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={className}
                    style={{ display: 'flex', flexDirection: 'column', ...style }}
                >
                    {items.map((item, index) => {
                        const id = String(getItemId(item));
                        return (
                            <TouchDelayDraggable key={id} draggableId={id} index={index}>
                                {(draggableProvided, snapshot) => (
                                    <div
                                        ref={draggableProvided.innerRef}
                                        {...draggableProvided.draggableProps}
                                        {...draggableProvided.dragHandleProps}
                                        style={{
                                            ...draggableProvided.draggableProps.style,
                                            opacity: snapshot.isDragging ? 0.6 : 1,
                                            transition: snapshot.isDragging ? 'none' : 'opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                            zIndex: snapshot.isDragging ? 100 : 1
                                        }}
                                    >
                                        {renderItem(item, index, !!snapshot.combineTargetFor)}
                                    </div>
                                )}
                            </TouchDelayDraggable>
                        );
                    })}
                    {provided.placeholder}
                </div>
            )}
        </Droppable>
    );

    if (useExternalContext) {
        return content;
    }

    return (
        <DragDropContext
            onDragStart={onDragStart}
            onDragUpdate={handleDragUpdate}
            onDragEnd={handleDragEnd}
        >
            {content}
        </DragDropContext>
    );
}

/**
 * Utility to help calculate the new order/thread status.
 * This can be expanded with the "Smart Join" logic from LLMemo.
 */
export const ThreadUtils = {
    /**
     * Helper to find if an item should be extracted or stay in a thread based on its new position.
     */
    calculateThreadTarget: <T extends { threadId?: string }>(
        items: T[],
        sourceIndex: number,
        destIndex: number,
        movedItem: T
    ): string | undefined => {
        const nextList = [...items];
        const [removed] = nextList.splice(sourceIndex, 1);
        nextList.splice(destIndex, 0, removed);

        const prevItem = nextList[destIndex - 1] as any;

        // Smart Join Logic (from LLMemo):
        // If dropped after a thread member, and either they are in the same thread OR it was a joinable position.
        if (prevItem && prevItem.threadId) {
            // In LLMemo: if it was already in the same thread, keep it there (reorder child).
            if (movedItem.threadId === prevItem.threadId) {
                return prevItem.threadId;
            }
        }

        return undefined; // Result: Extract or stay standalone
    }
};
