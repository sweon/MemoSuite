import React, { useRef, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import type { DraggableProps } from '@hello-pangea/dnd';

interface TouchDelayDraggableProps extends DraggableProps {
    children: (provided: any, snapshot: any) => ReactNode;
    touchDelay?: number; // milliseconds to wait before allowing drag
}

export const TouchDelayDraggable: React.FC<TouchDelayDraggableProps> = ({
    children,
    touchDelay = 1000,
    ...draggableProps
}) => {
    const [isDragDisabled, setIsDragDisabled] = useState(true);
    const timerRef = useRef<any>(null);
    const resetTimerRef = useRef<any>(null);
    const startPosRef = useRef<{ x: number; y: number } | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const isLongPressedRef = useRef(false);

    useEffect(() => {
        const el = wrapperRef.current;
        if (!el) return;

        const handleTouchStart = (e: TouchEvent) => {
            if ((e as any)._isSynthetic) return;
            if (resetTimerRef.current) {
                clearTimeout(resetTimerRef.current);
                resetTimerRef.current = null;
            }
            const touch = e.touches[0];
            startPosRef.current = { x: touch.clientX, y: touch.clientY };
            isLongPressedRef.current = false;
            e.stopPropagation();
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                isLongPressedRef.current = true;
                setIsDragDisabled(false);
                if (window.navigator.vibrate) window.navigator.vibrate(40);
                setTimeout(() => {
                    if (isLongPressedRef.current) {
                        const t = e.touches[0];
                        const syntheticEvent = new TouchEvent('touchstart', {
                            cancelable: true, bubbles: true,
                            touches: [t as any], targetTouches: [t as any], changedTouches: [t as any],
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
            if (isLongPressedRef.current) return;
            if (!startPosRef.current) return;
            const touch = e.touches[0];
            const dx = Math.abs(touch.clientX - startPosRef.current.x);
            const dy = Math.abs(touch.clientY - startPosRef.current.y);
            if (dx > 10 || dy > 10) {
                if (timerRef.current) clearTimeout(timerRef.current);
                timerRef.current = null;
                startPosRef.current = null;
            }
        };

        const handleTouchEnd = (e: TouchEvent) => {
            if ((e as any)._isSynthetic) return;
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = null;
            startPosRef.current = null;
            isLongPressedRef.current = false;
            resetTimerRef.current = setTimeout(() => {
                setIsDragDisabled(true);
                resetTimerRef.current = null;
            }, 500);
        };

        el.addEventListener('touchstart', handleTouchStart, { capture: true, passive: false });
        el.addEventListener('touchmove', handleTouchMove, { capture: true, passive: true });
        el.addEventListener('touchend', handleTouchEnd, { capture: true });
        el.addEventListener('touchcancel', handleTouchEnd, { capture: true });

        return () => {
            el.removeEventListener('touchstart', handleTouchStart, { capture: true });
            el.removeEventListener('touchmove', handleTouchMove, { capture: true });
            el.removeEventListener('touchend', handleTouchEnd, { capture: true });
            el.removeEventListener('touchcancel', handleTouchEnd, { capture: true });
            if (timerRef.current) clearTimeout(timerRef.current);
            if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
        };
    }, [touchDelay]);

    const handleMouseDown = () => {
        if (resetTimerRef.current) {
            clearTimeout(resetTimerRef.current);
            resetTimerRef.current = null;
        }
        setIsDragDisabled(false);
    };

    return (
        <Draggable {...draggableProps} isDragDisabled={draggableProps.isDragDisabled || isDragDisabled}>
            {(provided, snapshot) => (
                <div ref={wrapperRef} onMouseDown={handleMouseDown} style={{ touchAction: 'pan-y', display: 'contents' }}>
                    {children(provided, snapshot)}
                </div>
            )}
        </Draggable>
    );
};
