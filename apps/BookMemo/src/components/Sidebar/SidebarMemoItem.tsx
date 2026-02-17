import React from 'react';
import type { Memo } from '../../db';
import { MemoItemLink, MemoTitle, MemoDate } from './itemStyles';
import { TouchDelayDraggable } from './TouchDelayDraggable';

interface Props {
    memo: Memo;
    index: number;
    isActive: boolean;
    onClick?: (skipHistory?: boolean) => void;
    formatDate: (date: Date) => string;
    inThread?: boolean;
    untitledText: string;
    isCombineTarget?: boolean;
}

export const SidebarMemoItem: React.FC<Props> = ({
    memo,
    index,
    isActive,
    onClick,
    formatDate,
    inThread,
    untitledText,
    isCombineTarget
}) => {
    const draggableId = inThread ? `thread-child-${memo.id}` : String(memo.id);

    return (
        <TouchDelayDraggable draggableId={draggableId} index={index}>
            {(provided: any, snapshot: any) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    style={{
                        ...provided.draggableProps.style,
                        marginBottom: '2px',
                        opacity: snapshot.isDragging ? 0.8 : 1,
                        transition: 'background-color 0.1s ease-out, border-color 0.1s ease-out',
                        borderRadius: '6px',
                        border: isCombineTarget ? `2px solid #3b82f6` : '2px solid transparent',
                        backgroundColor: isCombineTarget ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                    }}
                >
                    <MemoItemLink
                        to={`/book/${memo.bookId}/memo/${memo.id}`}
                        $isActive={isActive}
                        $inThread={inThread}
                        onClick={() => onClick?.(true)}
                    >
                        <MemoTitle title={memo.title || untitledText} $isUntitled={!memo.title}>
                            {memo.title || untitledText}
                        </MemoTitle>
                        <MemoDate>
                            {formatDate(memo.createdAt)}
                        </MemoDate>
                    </MemoItemLink>
                </div>
            )}
        </TouchDelayDraggable>
    );
};

