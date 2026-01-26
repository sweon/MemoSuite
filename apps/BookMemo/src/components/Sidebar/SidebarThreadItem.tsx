import React from 'react';
import type { Memo } from '../../db';
import { MemoItemLink, MemoTitle, MemoDate, ThreadToggleBtn } from './itemStyles';
import { FiCornerDownRight } from 'react-icons/fi';
import { TouchDelayDraggable } from './TouchDelayDraggable';
import type { TranslationKeys } from '../../translations';

interface Props {
    threadId: string;
    memos: Memo[];
    index: number;
    collapsed: boolean;
    onToggle: (id: string) => void;
    activeMemoId?: number;
    formatDate: (d: Date) => string;
    untitledText: string;
    onMemoClick?: (skipHistory?: boolean) => void;
    isCombineTarget?: boolean;
    t: TranslationKeys;
}

export const SidebarThreadItem: React.FC<Props> = ({
    threadId, memos, index, collapsed, onToggle,
    activeMemoId, formatDate, untitledText, onMemoClick,
    isCombineTarget, t
}) => {
    const headMemo = memos[0];
    const bodyMemos = memos.slice(1);

    return (
        <TouchDelayDraggable draggableId={`thread-header-${headMemo.id}`} index={index}>
            {(provided: any, snapshot: any) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    style={{
                        ...provided.draggableProps.style,
                        marginBottom: '4px',
                        opacity: snapshot.isDragging ? 0.8 : 1,
                        transition: 'background-color 0.1s ease-out, border-color 0.1s ease-out',
                        borderRadius: '8px',
                        border: isCombineTarget ? `2px solid #3b82f6` : '2px solid transparent',
                        backgroundColor: isCombineTarget ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                    }}
                >
                    {/* Head Memo - Acts as drag handle for the group */}
                    <div {...provided.dragHandleProps} style={{ position: 'relative' }}>
                        <MemoItemLink
                            to={`/book/${headMemo.bookId}/memo/${headMemo.id}`}
                            $isActive={activeMemoId === headMemo.id}
                            $inThread={false}
                            onClick={() => onMemoClick?.(true)}
                        >
                            <MemoTitle title={headMemo.title || untitledText}>
                                {headMemo.title || untitledText}
                            </MemoTitle>
                            <MemoDate>
                                {formatDate(headMemo.createdAt)}
                            </MemoDate>
                        </MemoItemLink>

                        {/* Integrated Toggle Button */}
                        {bodyMemos.length > 0 && (
                            <div style={{ paddingLeft: '0.5rem' }}>
                                <ThreadToggleBtn onClick={() => onToggle(threadId)}>
                                    <FiCornerDownRight />
                                    {collapsed ? t.sidebar.more_memos.replace('{count}', String(bodyMemos.length)) : t.sidebar.collapse}
                                </ThreadToggleBtn>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </TouchDelayDraggable>
    );
};
