import React from 'react';
import type { Log } from '../../db';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogItemLink, LogTitle, LogDate, ThreadToggleBtn, PinToggleButton, ItemFooter, ItemActions } from './itemStyles';
import { FiCornerDownRight } from 'react-icons/fi';
import { BsPinAngle } from 'react-icons/bs';
import { TouchDelayDraggable } from './TouchDelayDraggable';
import type { TranslationKeys } from '../../translations';

interface Props {
    threadId: string;
    logs: Log[];
    index: number;
    collapsed: boolean;
    onToggle: (id: string) => void;
    activeLogId?: number;
    modelMap: Map<number, string>;
    formatDate: (d: Date) => string;
    untitledText: string;
    onLogClick?: () => void;
    isCombineTarget?: boolean;
    t: TranslationKeys;
    onTogglePin?: (id: number, e: React.MouseEvent) => void;
}

export const SidebarThreadItem: React.FC<Props> = ({
    threadId, logs, index, collapsed, onToggle,
    activeLogId, modelMap, formatDate, untitledText, onLogClick,
    isCombineTarget, t,
    onTogglePin
}) => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogClick = (e: React.MouseEvent, logId: number) => {
        e.preventDefault();

        if (onLogClick && window.innerWidth <= 768) {
            onLogClick();
        }

        navigate(`/log/${logId}`, {
            replace: location.pathname !== '/' && location.pathname !== '/index.html'
        });
    };

    const headLog = logs[0];
    const bodyLogs = logs.slice(1);

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
                    <div {...provided.dragHandleProps} data-log-id={headLog.id} style={{ position: 'relative' }}>
                        <LogItemLink
                            to={`/log/${headLog.id}`}
                            $isActive={activeLogId === headLog.id}
                            $inThread={false}
                            onClick={(e) => handleLogClick(e, headLog.id!)}
                        >
                            <LogTitle title={headLog.title || untitledText}>
                                {headLog.title || untitledText}
                            </LogTitle>
                            <ItemFooter>
                                <LogDate>
                                    {formatDate(headLog.createdAt)}
                                    {headLog.modelId && (
                                        <span style={{ marginLeft: '0.5rem', opacity: 0.7 }}>
                                            • {modelMap.get(headLog.modelId)}
                                        </span>
                                    )}
                                </LogDate>
                                <ItemActions>
                                    {onTogglePin && headLog.id && (
                                        <PinToggleButton
                                            $pinned={!!headLog.pinnedAt}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                onTogglePin(headLog.id!, e);
                                            }}
                                            title={headLog.pinnedAt ? 'Unpin' : 'Pin to top'}
                                        >
                                            <BsPinAngle size={12} style={{ transform: headLog.pinnedAt ? 'none' : 'rotate(45deg)' }} />
                                        </PinToggleButton>
                                    )}
                                </ItemActions>
                            </ItemFooter>
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
