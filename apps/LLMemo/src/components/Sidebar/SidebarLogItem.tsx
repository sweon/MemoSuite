import React from 'react';
import type { Log } from '../../db';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogItemLink, LogTitle, LogDate } from './itemStyles';

interface Props {
    log: Log;
    isActive: boolean;
    onClick?: () => void;
    modelName?: string;
    formatDate: (date: Date) => string;
    inThread?: boolean;
    untitledText: string;
    isCombineTarget?: boolean;
}
export const SidebarLogItem: React.FC<Props> = ({
    log,
    isActive,
    onClick,
    modelName,
    formatDate,
    inThread,
    untitledText,
    isCombineTarget
}) => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogClick = (e: React.MouseEvent) => {
        e.preventDefault();

        if (onClick && window.innerWidth <= 768) {
            onClick();
        }

        navigate(`/log/${log.id}`, {
            replace: location.pathname !== '/' && location.pathname !== '/index.html'
        });
    };

    return (
        <div
            data-log-id={log.id}
            style={{
                marginBottom: '2px',
                transition: 'background-color 0.1s ease-out, border-color 0.1s ease-out',
                borderRadius: '6px',
                border: isCombineTarget ? `2px solid #3b82f6` : '2px solid transparent',
                backgroundColor: isCombineTarget ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
            }}
        >
            <LogItemLink
                to={`/log/${log.id}`}
                $isActive={isActive}
                $inThread={inThread}
                onClick={handleLogClick}
            >
                <LogTitle title={log.title || untitledText}>
                    {log.title || untitledText}
                </LogTitle>
                <LogDate>
                    {formatDate(log.createdAt)}
                    {modelName && (
                        <span style={{ marginLeft: '0.5rem', opacity: 0.7 }}>
                            • {modelName}
                        </span>
                    )}
                </LogDate>
            </LogItemLink>
        </div >
    );
};
