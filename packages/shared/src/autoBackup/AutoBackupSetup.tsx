/**
 * AutoBackupSetup - Settings section for configuring auto-backup.
 * Shown in the app's Settings page.
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import type { UseAutoBackupReturn } from './useAutoBackup';

const Section = styled.div`
    background: ${({ theme }) => theme.colors.surface};
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: ${({ theme }) => theme.radius.large};
    padding: 20px;
    margin-bottom: 16px;
`;

const SectionTitle = styled.h3`
    margin: 0 0 12px 0;
    font-size: 1.1rem;
    color: ${({ theme }) => theme.colors.text};
    display: flex;
    align-items: center;
    gap: 8px;
`;

const StatusText = styled.p`
    margin: 0 0 12px 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.9rem;
    line-height: 1.5;
`;

const StatusBadge = styled.span<{ $active?: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 9999px;
    font-size: 0.8rem;
    font-weight: 600;
    background: ${({ $active }) => $active ? 'rgba(46, 204, 113, 0.15)' : 'rgba(231, 76, 60, 0.15)'};
    color: ${({ $active }) => $active ? '#2ecc71' : '#e74c3c'};
    margin-bottom: 12px;
`;

const InputGroup = styled.div`
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
`;

const Input = styled.input`
    flex: 1;
    padding: 10px 14px;
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: ${({ theme }) => theme.radius.medium};
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text};
    font-size: 0.95rem;

    &:focus {
        outline: none;
        border-color: ${({ theme }) => theme.colors.primary};
    }
`;

const Button = styled.button<{ $primary?: boolean; $small?: boolean }>`
    padding: ${({ $small }) => $small ? '8px 16px' : '10px 20px'};
    border: 1px solid ${({ theme, $primary }) => $primary ? theme.colors.primary : theme.colors.border};
    border-radius: ${({ theme }) => theme.radius.medium};
    background: ${({ $primary }) => $primary ? 'var(--primary, #ef8e13)' : 'transparent'};
    color: ${({ theme, $primary }) => $primary ? '#fff' : theme.colors.text};
    font-size: ${({ $small }) => $small ? '0.85rem' : '0.95rem'};
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;

    &:hover {
        opacity: 0.9;
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const InfoRow = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    font-size: 0.9rem;
    color: ${({ theme }) => theme.colors.textSecondary};
`;

const translations = {
    ko: {
        title: '🔒 자동 백업',
        status_active: '활성',
        status_inactive: '비활성',
        desktop_desc: '선택한 폴더에 데이터가 자동으로 암호화되어 저장됩니다. 브라우저 데이터를 삭제해도 파일은 유지됩니다.',
        mobile_desc: '아래 버튼을 눌러 암호화된 백업 파일을 저장하세요. 브라우저 데이터를 삭제해도 다운로드 폴더의 파일로 복원할 수 있습니다.',
        password_placeholder: '백업 비밀번호 설정',
        setup: '설정',
        setup_desktop: '폴더 선택 및 설정',
        backup_now: '지금 백업',
        last_backup: '마지막 백업',
        never: '없음',
        platform_desktop: '데스크톱 모드 (자동 백업)',
        platform_mobile: '모바일 모드 (수동 백업)',
        backup_success: '백업 완료!',
        backup_failed: '백업 실패',
        share_backup: '공유',
        share_success: '공유 완료!',
        change_password: '비밀번호 변경',
        change_folder: '폴더 변경',
    },
    en: {
        title: '🔒 Auto Backup',
        status_active: 'Active',
        status_inactive: 'Inactive',
        desktop_desc: 'Data is automatically encrypted and saved to the selected folder. Files persist even when browser data is cleared.',
        mobile_desc: 'Press the button below to save an encrypted backup file. You can restore from the downloaded file even after clearing browser data.',
        password_placeholder: 'Set backup password',
        setup: 'Set Up',
        setup_desktop: 'Select Folder & Set Up',
        backup_now: 'Backup Now',
        last_backup: 'Last backup',
        never: 'Never',
        platform_desktop: 'Desktop mode (auto backup)',
        platform_mobile: 'Mobile mode (manual backup)',
        backup_success: 'Backup complete!',
        backup_failed: 'Backup failed',
        share_backup: 'Share',
        share_success: 'Shared!',
        change_password: 'Change Password',
        change_folder: 'Change Folder',
    }
};

interface AutoBackupSetupProps {
    autoBackup: UseAutoBackupReturn;
    language: string;
}

export const AutoBackupSetup: React.FC<AutoBackupSetupProps> = ({ autoBackup, language }) => {
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');

    const t = translations[language as keyof typeof translations] || translations.en;

    const handleSetup = async () => {
        if (!password.trim()) return;
        const success = await autoBackup.setup(password.trim());
        if (success) {
            setPassword('');
            setMessage('');
        }
    };

    const handleBackupNow = async () => {
        const success = await autoBackup.manualBackup();
        setMessage(success ? t.backup_success : t.backup_failed);
        setTimeout(() => setMessage(''), 3000);
    };

    const handleShare = async () => {
        const success = await autoBackup.shareBackup();
        if (success) {
            setMessage(t.share_success);
            setTimeout(() => setMessage(''), 3000);
        }
    };

    return (
        <Section>
            <SectionTitle>{t.title}</SectionTitle>

            <StatusBadge $active={autoBackup.isSetUp}>
                {autoBackup.isSetUp ? `● ${t.status_active}` : `○ ${t.status_inactive}`}
            </StatusBadge>

            <StatusText style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: 8 }}>
                {autoBackup.isDesktop ? t.platform_desktop : t.platform_mobile}
            </StatusText>

            <StatusText>
                {autoBackup.isDesktop ? t.desktop_desc : t.mobile_desc}
            </StatusText>

            {!autoBackup.isSetUp ? (
                <>
                    <InputGroup>
                        <Input
                            type="password"
                            placeholder={t.password_placeholder}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSetup()}
                        />
                        <Button $primary onClick={handleSetup} disabled={!password.trim() || autoBackup.isProcessing}>
                            {autoBackup.isDesktop ? t.setup_desktop : t.setup}
                        </Button>
                    </InputGroup>
                </>
            ) : (
                <>
                    <InfoRow>
                        <span>{t.last_backup}:</span>
                        <strong>{autoBackup.lastBackupText || t.never}</strong>
                    </InfoRow>

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <Button $primary onClick={handleBackupNow} disabled={autoBackup.isProcessing}>
                            {t.backup_now}
                        </Button>
                        {autoBackup.canShare && !autoBackup.isDesktop && (
                            <Button onClick={handleShare} disabled={autoBackup.isProcessing}>
                                📤 {t.share_backup}
                            </Button>
                        )}
                        {autoBackup.isDesktop && (
                            <Button $small onClick={async () => {
                                const pwd = prompt(language === 'ko' ? '새 비밀번호:' : 'New password:');
                                if (pwd) {
                                    await autoBackup.setup(pwd);
                                }
                            }}>
                                {t.change_folder}
                            </Button>
                        )}
                    </div>

                    {message && (
                        <StatusText style={{ marginTop: 8, color: message.includes('!') ? '#2ecc71' : '#e74c3c' }}>
                            {message}
                        </StatusText>
                    )}
                </>
            )}
        </Section>
    );
};
