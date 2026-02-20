import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { TouchDelayDraggable } from './TouchDelayDraggable';
/**
 * A shared Drag & Drop list component that supports combining items into threads.
 * Specifically designed to unify thread management across MemoSuite apps.
 */
export function ThreadableList({ items, onDragEnd, onDragStart, onDragUpdate, renderItem, droppableId, className, style, isCombineEnabled = true, type, getItemId, useExternalContext = false }) {
    const handleDragUpdate = (update) => {
        onDragUpdate?.(update);
    };
    const handleDragEnd = (result) => {
        onDragEnd(result);
    };
    const content = (_jsx(Droppable, { droppableId: droppableId, isCombineEnabled: isCombineEnabled, type: type, children: (provided) => (_jsxs("div", { ...provided.droppableProps, ref: provided.innerRef, className: className, style: { display: 'flex', flexDirection: 'column', ...style }, children: [items.map((item, index) => {
                    const id = String(getItemId(item));
                    return (_jsx(TouchDelayDraggable, { draggableId: id, index: index, children: (draggableProvided, snapshot) => (_jsx("div", { ref: draggableProvided.innerRef, ...draggableProvided.draggableProps, ...draggableProvided.dragHandleProps, style: {
                                ...draggableProvided.draggableProps.style,
                                opacity: snapshot.isDragging ? 0.6 : 1,
                                transition: snapshot.isDragging ? 'none' : 'opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                zIndex: snapshot.isDragging ? 100 : 1
                            }, children: renderItem(item, index, !!snapshot.combineTargetFor) })) }, id));
                }), provided.placeholder] })) }));
    if (useExternalContext) {
        return content;
    }
    return (_jsx(DragDropContext, { onDragStart: onDragStart, onDragUpdate: handleDragUpdate, onDragEnd: handleDragEnd, children: content }));
}
/**
 * Utility to help calculate the new order/thread status.
 * This can be expanded with the "Smart Join" logic from LLMemo.
 */
export const ThreadUtils = {
    /**
     * Helper to find if an item should be extracted or stay in a thread based on its new position.
     */
    calculateThreadTarget: (items, sourceIndex, destIndex, movedItem) => {
        const nextList = [...items];
        const [removed] = nextList.splice(sourceIndex, 1);
        nextList.splice(destIndex, 0, removed);
        const prevItem = nextList[destIndex - 1];
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
