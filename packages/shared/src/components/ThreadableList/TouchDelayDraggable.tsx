import React, { useRef, useState, useEffect } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import type { DraggableProps } from '@hello-pangea/dnd';

interface TouchDelayDraggableProps extends DraggableProps {
    children: (provided: any, snapshot: any) => React.ReactNode;
    touchDelay?: number; // milliseconds to wait before allowing drag
}

/**
 * A wrapper around Draggable that requires a longer press on touch devices
 * before drag starts. This prevents accidental drags when scrolling.
 * Uses native capture listeners to intercept and delay events from the library.
 */
export const TouchDelayDraggable: React.FC<TouchDelayDraggableProps> = ({
    children,
    touchDelay = 1000,
    ...draggableProps
}) => {
    const [isDragDisabled, setIsDragDisabled] = useState(true);
    const timerRef = useRef<any>(null);
    const startPosRef = useRef<{ x: number; y: number } | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const isLongPressedRef = useRef(false);

    useEffect(() => {
        const el = wrapperRef.current;
        if (!el) return;

        const handleTouchStart = (e: TouchEvent) => {
            // If it's our own synthetic event, don't block it
            if ((e as any)._isSynthetic) {
                return;
            }

            const touch = e.touches[0];
            startPosRef.current = { x: touch.clientX, y: touch.clientY };
            isLongPressedRef.current = false;

            // 1. STOP the library from seeing this initial touch immediate
            // We use stopPropagation in the capture phase to hide it from the library's listeners
            e.stopPropagation();

            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }

            timerRef.current = setTimeout(() => {
                // Success! 1000ms passed without significant movement.
                isLongPressedRef.current = true;

                // 2. Enable the draggable component so it will respond to the next event
                setIsDragDisabled(false);

                if (window.navigator.vibrate) {
                    window.navigator.vibrate(40);
                }

                // 3. Programmatically restart the drag session in the library
                // We need a tiny delay for React to update the DOM with isDragDisabled=false
                setTimeout(() => {
                    if (isLongPressedRef.current) {
                        const touch = e.touches[0];
                        const syntheticEvent = new TouchEvent('touchstart', {
                            cancelable: true,
                            bubbles: true,
                            touches: [touch as any],
                            targetTouches: [touch as any],
                            changedTouches: [touch as any],
                        });
                        (syntheticEvent as any)._isSynthetic = true;
                        e.target?.dispatchEvent(syntheticEvent);
                    }
                }, 50);

                timerRef.current = null;
            }, touchDelay);
        };

        const handleTouchMove = (e: TouchEvent) => {
            if ((e as any)._isSynthetic) return;
            if (!startPosRef.current || isLongPressedRef.current) return;

            const touch = e.touches[0];
            const moveX = Math.abs(touch.clientX - startPosRef.current.x);
            const moveY = Math.abs(touch.clientY - startPosRef.current.y);

            // If moved significantly, cancel the long press timer.
            if (moveX > 10 || moveY > 10) {
                if (timerRef.current) {
                    clearTimeout(timerRef.current);
                    timerRef.current = null;
                }
                startPosRef.current = null;
            }
        };

        const handleTouchEnd = (e: TouchEvent) => {
            if ((e as any)._isSynthetic) return;

            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            startPosRef.current = null;
            isLongPressedRef.current = false;

            // Re-disable for the next interaction
            setIsDragDisabled(true);
        };

        // Attach native listeners in the capture phase to ensure they fire BEFORE the library
        el.addEventListener('touchstart', handleTouchStart, { capture: true, passive: false });
        el.addEventListener('touchmove', handleTouchMove, { capture: true, passive: true });
        el.addEventListener('touchend', handleTouchEnd, { capture: true });
        el.addEventListener('touchcancel', handleTouchEnd, { capture: true });

        return () => {
            el.removeEventListener('touchstart', handleTouchStart, { capture: true });
            el.removeEventListener('touchmove', handleTouchMove, { capture: true });
            el.removeEventListener('touchend', handleTouchEnd, { capture: true });
            el.removeEventListener('touchcancel', handleTouchEnd, { capture: true });
        };
    }, [touchDelay]);

    // Handle mouse interaction (should be instant)
    const handleMouseDown = () => {
        setIsDragDisabled(false);
    };

    return (
        <Draggable {...draggableProps} isDragDisabled={draggableProps.isDragDisabled || isDragDisabled}>
            {(provided, snapshot) => (
                <div
                    ref={wrapperRef}
                    onMouseDown={handleMouseDown}
                    style={{
                        touchAction: 'pan-y', // Important: allows scrolling vertically
                        display: 'contents' // Makes the wrapper div "invisible" for layout purposes
                    }}
                >
                    {children(provided, snapshot)}
                </div>
            )}
        </Draggable>
    );
};
