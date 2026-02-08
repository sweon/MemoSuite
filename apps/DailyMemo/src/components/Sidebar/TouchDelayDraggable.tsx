import React, { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import type { DraggableProps } from '@hello-pangea/dnd';

interface TouchDelayDraggableProps extends DraggableProps {
    children: (provided: any, snapshot: any) => ReactNode;
    touchDelay?: number; // milliseconds to wait before allowing drag
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
    const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
    const isLongPressActiveRef = useRef(false);
    const lastTouchRef = useRef<any>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        // If this is our own synthetic event, let it pass to the library
        if ((e.nativeEvent as any)._isSynthetic) {
            return;
        }

        const touch = e.touches[0];
        touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
        lastTouchRef.current = touch;
        isLongPressActiveRef.current = false;

        // Disable drag initially to prevent the library from starting immediately
        setIsDragDisabled(true);

        if (touchTimerRef.current) {
            window.clearTimeout(touchTimerRef.current);
        }

        touchTimerRef.current = window.setTimeout(() => {
            // Success! 800ms passed without significant movement.
            isLongPressActiveRef.current = true;

            // 1. Enable the draggable component
            setIsDragDisabled(false);

            // 2. Visual/Haptic feedback
            if (window.navigator.vibrate) {
                window.navigator.vibrate(40);
            }

            // 3. Programmatically restart the drag session in the library
            // We need a tiny delay for React to update the DOM with isDragDisabled=false
            setTimeout(() => {
                if (isLongPressActiveRef.current && lastTouchRef.current) {
                    const target = e.target as HTMLElement;
                    const touch = lastTouchRef.current;

                    const syntheticEvent = new TouchEvent('touchstart', {
                        cancelable: true,
                        bubbles: true,
                        touches: [touch],
                        targetTouches: [touch],
                        changedTouches: [touch],
                    });
                    (syntheticEvent as any)._isSynthetic = true;
                    target.dispatchEvent(syntheticEvent);
                }
            }, 50);
        }, touchDelay);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if ((e.nativeEvent as any)._isSynthetic) return;
        if (!touchStartPosRef.current || isLongPressActiveRef.current) return;

        const touch = e.touches[0];
        const moveX = Math.abs(touch.clientX - touchStartPosRef.current.x);
        const moveY = Math.abs(touch.clientY - touchStartPosRef.current.y);

        // If moved significantly, cancel the long press timer.
        if (moveX > 10 || moveY > 10) {
            if (touchTimerRef.current) {
                window.clearTimeout(touchTimerRef.current);
                touchTimerRef.current = null;
            }
            setIsDragDisabled(true);
        }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if ((e.nativeEvent as any)._isSynthetic) return;

        if (touchTimerRef.current) {
            window.clearTimeout(touchTimerRef.current);
            touchTimerRef.current = null;
        }

        isLongPressActiveRef.current = false;

        // Re-enable for next interaction
        setTimeout(() => {
            setIsDragDisabled(false);
        }, 100);
    };

    return (
        <Draggable {...draggableProps} isDragDisabled={isDragDisabled}>
            {(provided, snapshot) => (
                <div
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    style={{
                        touchAction: 'pan-y',
                        ...(snapshot.isDragging ? { zIndex: 9999 } : {})
                    }}
                >
                    {children(provided, snapshot)}
                </div>
            )}
        </Draggable>
    );
};
