import React from 'react';
import type { Log } from '../../db';
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
    replace?: boolean;
}
export const SidebarLogItem: React.FC<Props> = ({
    log,
    isActive,
    onClick,
    modelName,
    formatDate,
    inThread,
    untitledText,
    isCombineTarget,
    replace
}) => {
    return (
        <div
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
                replace={replace}
                $isActive={isActive}
                $inThread={inThread}
                onClick={onClick}
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
        </div>
    );
};
