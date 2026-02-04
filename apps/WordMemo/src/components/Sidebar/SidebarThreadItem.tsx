import React from 'react';
import type { Word } from '../../db';
import { useLocation, useNavigate } from 'react-router-dom';
import { WordItemLink, WordTitle, WordDate, ThreadToggleBtn, WordTitleRow, SpeakButton, BlurredText, StarButton, PinToggleButton, ItemFooter, ItemActions } from './itemStyles';
import { FiCornerDownRight, FiVolume2, FiStar } from 'react-icons/fi';
import { BsPinAngle } from 'react-icons/bs';
import { TouchDelayDraggable } from './TouchDelayDraggable';
import type { TranslationKeys } from '../../translations';
import { db } from '../../db';
import { speakText } from '../../utils/tts';

interface Props {
    threadId: string;
    logs: Word[];
    index: number;
    collapsed: boolean;
    onToggle: (id: string) => void;
    activeWordId?: number;
    sourceMap: Map<number, string>;
    formatDate: (d: Date) => string;
    untitledText: string;
    onWordClick?: () => void;
    isCombineTarget?: boolean;
    t: TranslationKeys;
    studyMode: 'none' | 'hide-meanings' | 'hide-words';
    onTogglePin?: (id: number, e: React.MouseEvent) => void;
    onMove?: (id: number) => void;
    isMoving?: boolean;
}

export const SidebarThreadItem: React.FC<Props> = ({
    threadId, logs, index, collapsed, onToggle,
    activeWordId, sourceMap, formatDate, untitledText, onWordClick,
    isCombineTarget, t,
    studyMode,
    onTogglePin,
    onMove,
    isMoving
}) => {
    const location = useLocation();
    const navigate = useNavigate();
    const headWord = logs[0];
    const bodyWords = logs.slice(1);

    const [isRevealed, setIsRevealed] = React.useState(false);

    // Reset reveal when study mode changes
    React.useEffect(() => {
        setIsRevealed(false);
    }, [studyMode]);

    const handleHeaderClick = (e: React.MouseEvent) => {
        // Only intervene if in hide-words mode
        if (studyMode === 'hide-words') {
            const isTouch = window.matchMedia('(hover: none)').matches || /Android/i.test(navigator.userAgent);

            if (isTouch) {
                if (!isRevealed) {
                    e.preventDefault();
                    setIsRevealed(true);
                    return;
                }
            }
        }

        // Default behavior for navigation
        e.preventDefault();

        if (isMoving && onMove && headWord.id) {
            onMove(headWord.id);
            return;
        }

        if (onWordClick && window.innerWidth <= 768) onWordClick();

        navigate(`/word/${headWord.id}`, {
            replace: location.pathname !== '/' && location.pathname !== ''
        });
    };

    const handleToggleStar = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!headWord.id) return;
        await db.words.update(headWord.id, { isStarred: headWord.isStarred ? 0 : 1 });
    };

    return (
        <TouchDelayDraggable draggableId={`thread-header-${headWord.id}`} index={index}>
            {(provided: any, snapshot: any) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    style={{
                        ...provided.draggableProps.style,
                        marginBottom: '2px',
                        opacity: snapshot.isDragging ? 0.8 : 1,
                        transition: 'background-color 0.1s ease-out, border-color 0.1s ease-out',
                        borderRadius: '8px',
                        border: isCombineTarget ? `2px solid #3b82f6` : '2px solid transparent',
                        backgroundColor: isCombineTarget ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                    }}
                >
                    {/* Head Word - Acts as drag handle for the group */}
                    <div {...provided.dragHandleProps} data-log-id={headWord.id} style={{ position: 'relative' }}>
                        <WordItemLink
                            to={`/word/${headWord.id}`}
                            $isActive={activeWordId === headWord.id}
                            $inThread={false}
                            onClick={handleHeaderClick}
                            replace={location.pathname !== '/' && location.pathname !== ''}
                        >
                            <WordTitleRow>
                                <WordTitle>
                                    <BlurredText $isBlurred={studyMode === 'hide-words'} $forceReveal={isRevealed}>
                                        {headWord.title || untitledText}
                                    </BlurredText>
                                </WordTitle>
                            </WordTitleRow>
                            <ItemFooter>
                                <WordDate>
                                    {formatDate(headWord.createdAt)}
                                    {headWord.sourceId && (
                                        <span style={{ marginLeft: '0.5rem', opacity: 0.7 }}>
                                            • {sourceMap.get(headWord.sourceId)}
                                        </span>
                                    )}
                                </WordDate>
                                <ItemActions>
                                    {onTogglePin && headWord.id && (
                                        <PinToggleButton
                                            $pinned={!!headWord.pinnedAt}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                onTogglePin(headWord.id!, e);
                                            }}
                                            title={headWord.pinnedAt ? 'Unpin' : 'Pin to top'}
                                        >
                                            <BsPinAngle size={12} style={{ transform: headWord.pinnedAt ? 'none' : 'rotate(45deg)' }} />
                                        </PinToggleButton>
                                    )}
                                    <StarButton
                                        $active={!!headWord.isStarred}
                                        onClick={handleToggleStar}
                                        title="Toggle Star"
                                    >
                                        <FiStar size={14} fill={headWord.isStarred ? "#f59e0b" : "none"} />
                                    </StarButton>
                                    {(headWord.title) && (
                                        <SpeakButton
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                speakText(headWord.title);
                                            }}
                                            title="Speak"
                                        >
                                            <FiVolume2 size={14} />
                                        </SpeakButton>
                                    )}
                                </ItemActions>
                            </ItemFooter>
                        </WordItemLink>

                        {/* Integrated Toggle Button */}
                        {bodyWords.length > 0 && (
                            <div style={{ paddingLeft: '0.5rem' }}>
                                <ThreadToggleBtn onClick={() => onToggle(threadId)}>
                                    <FiCornerDownRight />
                                    {collapsed ? t.sidebar.more_words.replace('{count}', String(bodyWords.length)) : t.sidebar.collapse}
                                </ThreadToggleBtn>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </TouchDelayDraggable>
    );
};
