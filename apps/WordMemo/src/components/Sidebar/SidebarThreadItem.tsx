import React from 'react';
import type { Log } from '../../db';
import { useLocation } from 'react-router-dom';
import { LogItemLink, LogTitle, LogDate, ThreadToggleBtn, LogTitleRow, SpeakButton, BlurredText, StarButton } from './itemStyles';
import { FiCornerDownRight, FiVolume2, FiStar } from 'react-icons/fi';
import { TouchDelayDraggable } from './TouchDelayDraggable';
import type { TranslationKeys } from '../../translations';
import { db } from '../../db';
import { speakText } from '../../utils/tts';

interface Props {
    threadId: string;
    logs: Log[];
    index: number;
    collapsed: boolean;
    onToggle: (id: string) => void;
    activeLogId?: number;
    sourceMap: Map<number, string>;
    formatDate: (d: Date) => string;
    untitledText: string;
    onLogClick?: () => void;
    isCombineTarget?: boolean;
    t: TranslationKeys;
    studyMode: 'none' | 'hide-meanings' | 'hide-words';
}

export const SidebarThreadItem: React.FC<Props> = ({
    threadId, logs, index, collapsed, onToggle,
    activeLogId, sourceMap, formatDate, untitledText, onLogClick,
    isCombineTarget, t,
    studyMode
}) => {
    const location = useLocation();
    const headLog = logs[0];
    const bodyLogs = logs.slice(1);

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

        if (onLogClick && window.innerWidth <= 768) onLogClick();
    };

    const handleToggleStar = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!headLog.id) return;
        await db.logs.update(headLog.id, { isStarred: headLog.isStarred ? 0 : 1 });
    };

    return (
        <TouchDelayDraggable draggableId={`thread-header-${headLog.id}`} index={index}>
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
                    {/* Head Log - Acts as drag handle for the group */}
                    <div {...provided.dragHandleProps} style={{ position: 'relative' }}>
                        <LogItemLink
                            to={`/log/${headLog.id}`}
                            $isActive={activeLogId === headLog.id}
                            $inThread={false}
                            onClick={handleHeaderClick}
                            replace={location.pathname !== '/' && location.pathname !== ''}
                        >
                            <LogTitleRow>
                                <LogTitle>
                                    <BlurredText $isBlurred={studyMode === 'hide-words'} $forceReveal={isRevealed}>
                                        {headLog.title || untitledText}
                                    </BlurredText>
                                </LogTitle>
                                <div style={{ display: 'flex', gap: '2px' }}>
                                    <StarButton
                                        $active={!!headLog.isStarred}
                                        onClick={handleToggleStar}
                                        title="Toggle Star"
                                    >
                                        <FiStar size={14} fill={headLog.isStarred ? "#f59e0b" : "none"} />
                                    </StarButton>
                                    {(headLog.title) && (
                                        <SpeakButton
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                speakText(headLog.title);
                                            }}
                                            title="Speak"
                                        >
                                            <FiVolume2 size={14} />
                                        </SpeakButton>
                                    )}
                                </div>
                            </LogTitleRow>
                            <LogDate>
                                {formatDate(headLog.createdAt)}
                                {headLog.sourceId && (
                                    <span style={{ marginLeft: '0.5rem', opacity: 0.7 }}>
                                        • {sourceMap.get(headLog.sourceId)}
                                    </span>
                                )}
                            </LogDate>
                        </LogItemLink>

                        {/* Integrated Toggle Button */}
                        {bodyLogs.length > 0 && (
                            <div style={{ paddingLeft: '0.5rem' }}>
                                <ThreadToggleBtn onClick={() => onToggle(threadId)}>
                                    <FiCornerDownRight />
                                    {collapsed ? t.sidebar.more_logs.replace('{count}', String(bodyLogs.length)) : t.sidebar.collapse}
                                </ThreadToggleBtn>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </TouchDelayDraggable>
    );
};
