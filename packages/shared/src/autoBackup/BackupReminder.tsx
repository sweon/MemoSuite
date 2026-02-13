/**
 * BackupReminder - Non-intrusive floating banner for mobile users.
 * Shows when auto-backup is set up but the last backup is older than a threshold.
 * Only shows on mobile (non-desktop) since desktop has automatic backup.
 */

import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import type { UseAutoBackupReturn } from './useAutoBackup';

const DISMISS_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

const slideUp = keyframes`
    from {
        transform: translateY(100%);
        opacity: 0;
    }
    to {
        transform: translateY(0);
        opacity: 1;
    }
`;

const slideDown = keyframes`
    from {
        transform: translateY(0);
        opacity: 1;
    }
    to {
        transform: translateY(100%);
        opacity: 0;
    }
`;

const Banner = styled.div<{ $hiding?: boolean }>`
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 9000;
    padding: 12px 16px;
    padding-bottom: max(12px, env(safe-area-inset-bottom));
    background: ${({ theme }) => theme.colors.surface};
    border-top: 1px solid ${({ theme }) => theme.colors.border};
    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
    animation: ${({ $hiding }) => $hiding ? slideDown : slideUp} 0.3s ease forwards;
    display: flex;
    align-items: center;
    gap: 12px;
`;

const IconWrapper = styled.div`
    font-size: 1.5rem;
    flex-shrink: 0;
`;

const TextArea = styled.div`
    flex: 1;
    min-width: 0;
`;

const Title = styled.div`
    font-size: 0.85rem;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text};
    margin-bottom: 2px;
`;

const Subtitle = styled.div`
    font-size: 0.75rem;
    color: ${({ theme }) => theme.colors.textSecondary};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const ButtonGroup = styled.div`
    display: flex;
    gap: 6px;
    flex-shrink: 0;
    align-items: center;
`;



const BackupButton = styled.button`
    padding: 8px 14px;
    border: none;
    border-radius: ${({ theme }) => theme.radius.medium};
    background: var(--primary, #ef8e13);
    color: #fff;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: opacity 0.2s;

    &:active {
        opacity: 0.8;
    }

    &:disabled {
        opacity: 0.5;
    }
`;

const DismissButton = styled.button`
    padding: 8px;
    border: none;
    border-radius: ${({ theme }) => theme.radius.medium};
    background: transparent;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 1rem;
    cursor: pointer;
    line-height: 1;

    &:active {
        opacity: 0.6;
    }
`;

const translations = {
    ko: {
        title: '백업을 해주세요',
        last_backup: '마지막 백업',
        never: '없음',
        backup_now: '지금 백업',
        done: '완료!',
    },
    en: {
        title: 'Time to back up',
        last_backup: 'Last backup',
        never: 'Never',
        backup_now: 'Download',
        done: 'Done!',
    }
};

interface BackupReminderProps {
    autoBackup: UseAutoBackupReturn;
    language: string;
}

function isDismissed(): boolean {
    try {
        const dismissed = localStorage.getItem('backupReminder_dismissed');
        if (!dismissed) return false;
        const timestamp = parseInt(dismissed, 10);
        return Date.now() - timestamp < DISMISS_COOLDOWN_MS;
    } catch {
        return false;
    }
}

function setDismissed(): void {
    try {
        localStorage.setItem('backupReminder_dismissed', Date.now().toString());
    } catch {
        // localStorage may be unavailable
    }
}

export const BackupReminder: React.FC<BackupReminderProps> = ({ autoBackup, language }) => {
    const [visible, setVisible] = useState(false);
    const [hiding, setHiding] = useState(false);
    const [backupDone, setBackupDone] = useState(false);

    const t = translations[language as keyof typeof translations] || translations.en;

    useEffect(() => {
        // Only show on mobile when backup is set up
        if (autoBackup.isDesktop) return;
        if (!autoBackup.isSetUp) return;
        if (isDismissed()) return;

        // Check if last backup is older than threshold
        const lastBackup = autoBackup.state.lastBackupTime;
        const intervalDays = autoBackup.state.mobileWarningInterval ?? 3;

        if (intervalDays <= 0) {
            setVisible(false);
            return;
        }

        if (!lastBackup) {
            // Never backed up but set up — show reminder
            setVisible(true);
            return;
        }

        const daysSinceBackup = (Date.now() - new Date(lastBackup).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceBackup >= intervalDays) {
            setVisible(true);
        } else {
            setVisible(false);
        }
    }, [autoBackup.isDesktop, autoBackup.isSetUp, autoBackup.state.lastBackupTime, autoBackup.state.mobileWarningInterval]);

    const handleDismiss = () => {
        setHiding(true);
        setDismissed();
        setTimeout(() => setVisible(false), 300);
    };

    const handleBackup = async () => {
        const success = await autoBackup.manualBackup();
        if (success) {
            setBackupDone(true);
            setTimeout(() => {
                setHiding(true);
                setTimeout(() => setVisible(false), 300);
            }, 1500);
        }
    };



    if (!visible) return null;

    return (
        <Banner $hiding={hiding}>
            <IconWrapper>💾</IconWrapper>
            <TextArea>
                <Title>{backupDone ? `✅ ${t.done}` : t.title}</Title>
                <Subtitle>
                    {t.last_backup}: {autoBackup.lastBackupText || t.never}
                </Subtitle>
            </TextArea>
            <ButtonGroup>

                {!backupDone && (
                    <BackupButton
                        onClick={handleBackup}
                        disabled={autoBackup.isProcessing}
                    >
                        {t.backup_now}
                    </BackupButton>
                )}
                <DismissButton onClick={handleDismiss}>✕</DismissButton>
            </ButtonGroup>
        </Banner>
    );
};
