import React from 'react';
import type { DraggableProps } from '@hello-pangea/dnd';
interface TouchDelayDraggableProps extends DraggableProps {
    children: (provided: any, snapshot: any) => React.ReactNode;
    touchDelay?: number;
}
/**
 * A wrapper around Draggable that requires a longer press on touch devices
 * before drag starts. This prevents accidental drags when scrolling.
 */
export declare const TouchDelayDraggable: React.FC<TouchDelayDraggableProps>;
export {};
