import React, { useRef, useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import type { DraggableProps } from '@hello-pangea/dnd';

interface TouchDelayDraggableProps extends DraggableProps {
    children: (provided: any, snapshot: any) => React.ReactElement;
    touchDelay?: number;
}

/**
 * A wrapper around Draggable that requires a longer press on touch devices
 * before drag starts. This prevents accidental drags when scrolling.
 */
export const TouchDelayDraggable: React.FC<TouchDelayDraggableProps> = ({
    children,
    touchDelay = 800,
    ...draggableProps
}) => {
    const [isDragDisabled, setIsDragDisabled] = useState(false);
    const touchTimerRef = useRef<number | null>(null);
    const startPosRef = useRef<{ x: number, y: number } | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        // If it's a synthetic event we generated, don't trap it
        if ((e.nativeEvent as any)._isSynthetic) return;

        const touch = e.touches[0];
        startPosRef.current = { x: touch.clientX, y: touch.clientY };
        setIsDragDisabled(true);

        if (touchTimerRef.current) window.clearTimeout(touchTimerRef.current);

        touchTimerRef.current = window.setTimeout(() => {
            // Long press success
            setIsDragDisabled(false);
            if (window.navigator.vibrate) window.navigator.vibrate(40);

            // Programmatically restart drag after a tiny delay for React to update isDragDisabled
            setTimeout(() => {
                if (!startPosRef.current) return;
                const target = e.target as HTMLElement;

                // Use any cast to satisfy TS strict Touch type requirements in event constructor
                const syntheticEvent = new TouchEvent('touchstart', {
                    bubbles: true,
                    cancelable: true,
                    touches: [touch as any],
                    targetTouches: [touch as any],
                    changedTouches: [touch as any],
                });
                (syntheticEvent as any)._isSynthetic = true;
                target.dispatchEvent(syntheticEvent);
            }, 50);
        }, touchDelay);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!startPosRef.current || (e.nativeEvent as any)._isSynthetic) return;
        const touch = e.touches[0];
        const dx = Math.abs(touch.clientX - startPosRef.current.x);
        const dy = Math.abs(touch.clientY - startPosRef.current.y);

        if (dx > 10 || dy > 10) {
            if (touchTimerRef.current) {
                window.clearTimeout(touchTimerRef.current);
                touchTimerRef.current = null;
            }
            startPosRef.current = null;
            setIsDragDisabled(true);
        }
    };

    const handleTouchEnd = () => {
        if (touchTimerRef.current) {
            window.clearTimeout(touchTimerRef.current);
            touchTimerRef.current = null;
        }
        startPosRef.current = null;
        // Small delay before enabling to prevent accidental drag on quick tap
        setTimeout(() => setIsDragDisabled(false), 100);
    };

    return (
        <Draggable {...draggableProps} isDragDisabled={isDragDisabled}>
            {(provided, snapshot) => {
                // We attach handlers to a wrapper that doesn't interfere with library's innerRef
                return (
                    <div
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        style={{ touchAction: 'pan-y' }}
                    >
                        {children(provided, snapshot)}
                    </div>
                );
            }}
        </Draggable>
    );
};
