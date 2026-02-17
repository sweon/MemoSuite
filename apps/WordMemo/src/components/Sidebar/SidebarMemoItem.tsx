import React from 'react';
import type { Word } from '../../db';
import { useLocation, useNavigate } from 'react-router-dom';
import { WordItemLink, WordTitle, WordDate, WordTitleRow, SpeakButton, BlurredText, StarButton, PinToggleButton, ItemFooter, ItemActions } from './itemStyles';
import { TouchDelayDraggable } from './TouchDelayDraggable';
import { FiVolume2, FiStar } from 'react-icons/fi';
import { BsPinAngle } from 'react-icons/bs';
import { db } from '../../db';
import { speakText } from '../../utils/tts';

interface Props {
    log: Word;
    index: number;
    isActive: boolean;
    onClick?: () => void;
    sourceName?: string;
    formatDate: (date: Date) => string;
    inThread?: boolean;
    untitledText: string;
    isCombineTarget?: boolean;
    studyMode?: 'none' | 'hide-meanings' | 'hide-words';
    onTogglePin?: (id: number, e: React.MouseEvent) => void;
    onMove?: (id: number) => void;
    isMoving?: boolean;
}

export const SidebarMemoItem: React.FC<Props> = ({
    log,
    index,
    isActive,
    onClick,
    sourceName,
    formatDate,
    inThread,
    untitledText,
    isCombineTarget,
    studyMode,
    onTogglePin,
    onMove,
    isMoving
}) => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isRevealed, setIsRevealed] = React.useState(false);
    const draggableId = inThread ? `thread-child-${log.id}` : String(log.id);

    const handleToggleStar = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!log.id) return;
        await db.words.update(log.id, { isStarred: log.isStarred ? 0 : 1 });
    };

    // Reset reveal when study mode changes
    React.useEffect(() => {
        setIsRevealed(false);
    }, [studyMode]);

    const handleClick = (e: React.MouseEvent) => {
        // Only intervene if in hide-words mode
        if (studyMode === 'hide-words') {
            // Check if touch device (simplest check for this context) or Android
            const isTouch = window.matchMedia('(hover: none)').matches || /Android/i.test(navigator.userAgent);

            if (isTouch) {
                if (!isRevealed) {
                    // First tap: Reveal only
                    e.preventDefault();
                    setIsRevealed(true);
                    return;
                }
                // Second tap (or if already revealed): Allow navigation
                // We don't preventDefault here, so it navigates
            }
        }


        // Always prevent default link behavior to control navigation
        e.preventDefault();

        if (isMoving && onMove && log.id) {
            onMove(log.id);
            return;
        }

        // Default behavior: call onClick (onCloseMobile) only on mobile devices
        if (onClick && window.innerWidth <= 768) {
            onClick();
        }

        navigate(`/word/${log.id}`, {
            replace: !location.pathname.endsWith('/') && location.pathname !== '/'
        });
    };

    return (
        <TouchDelayDraggable draggableId={draggableId} index={index}>
            {(provided: any, snapshot: any) => (
                <div
                    ref={provided.innerRef}
                    data-log-id={log.id}
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
                    <WordItemLink
                        to={`/word/${log.id}`}
                        $isActive={isActive}
                        $inThread={inThread}
                        onClick={handleClick}
                        replace={!location.pathname.endsWith('/') && location.pathname !== '/'}
                    >
                        <WordTitleRow>
                            <WordTitle $isUntitled={!log.title}>
                                <BlurredText $isBlurred={studyMode === 'hide-words'} $forceReveal={isRevealed}>
                                    {log.title || untitledText}
                                </BlurredText>
                            </WordTitle>
                        </WordTitleRow>
                        <ItemFooter>
                            <WordDate>
                                {formatDate(log.createdAt)}
                                {sourceName && (
                                    <span style={{ marginLeft: '0.5rem', opacity: 0.7 }}>
                                        • {sourceName}
                                    </span>
                                )}
                            </WordDate>
                            <ItemActions>
                                {onTogglePin && log.id && (
                                    <PinToggleButton
                                        $pinned={!!log.pinnedAt}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            onTogglePin(log.id!, e);
                                        }}
                                        title={log.pinnedAt ? 'Unpin' : 'Pin to top'}
                                    >
                                        <BsPinAngle size={12} style={{ transform: log.pinnedAt ? 'none' : 'rotate(45deg)' }} />
                                    </PinToggleButton>
                                )}
                                <StarButton
                                    $active={!!log.isStarred}
                                    onClick={handleToggleStar}
                                    title="Toggle Star"
                                >
                                    <FiStar size={14} fill={log.isStarred ? "#f59e0b" : "none"} />
                                </StarButton>
                                {(log.title) && (
                                    <SpeakButton
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            speakText(log.title);
                                        }}
                                        title="Speak"
                                    >
                                        <FiVolume2 size={14} />
                                    </SpeakButton>
                                )}
                            </ItemActions>
                        </ItemFooter>
                    </WordItemLink>
                </div>
            )}
        </TouchDelayDraggable>
    );
};
