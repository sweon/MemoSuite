/**
 * AutoBackupSetup - UI for setting up auto-backup.
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import type { UseAutoBackupReturn } from './useAutoBackup';

const Container = styled.div`
    padding: 20px;
    background: ${({ theme }) => theme.colors.surface};
    border-radius: ${({ theme }) => theme.radius.large};
    border: 1px solid ${({ theme }) => theme.colors.border};
`;

const Title = styled.h3`
    margin: 0 0 12px 0;
    font-size: 1.1rem;
    display: flex;
    align-items: center;
    gap: 8px;
`;

const StatusText = styled.div<{ $active?: boolean }>`
    font-size: 0.85rem;
    color: ${({ $active, theme }) => $active ? '#2ecc71' : theme.colors.textSecondary};
    margin-bottom: 20px;
    font-weight: 500;
`;

const SetupCard = styled.div`
    background: ${({ theme }) => theme.colors.background};
    padding: 24px;
    border-radius: ${({ theme }) => theme.radius.medium};
    border: 1px dashed ${({ theme }) => theme.colors.border};
`;

const Description = styled.p`
    font-size: 0.9rem;
    line-height: 1.5;
    color: ${({ theme }) => theme.colors.textSecondary};
    margin: 0 0 20px 0;
`;

const FormGroup = styled.div`
    margin-bottom: 16px;
`;

const Label = styled.label`
    display: block;
    font-size: 0.85rem;
    font-weight: 600;
    margin-bottom: 6px;
    color: ${({ theme }) => theme.colors.text};
`;

const Input = styled.input`
    width: 100%;
    padding: 10px 12px;
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: ${({ theme }) => theme.radius.medium};
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.text};
    font-size: 0.95rem;
    box-sizing: border-box;

    &:focus {
        outline: none;
        border-color: ${({ theme }) => theme.colors.primary};
    }
`;

const InfoRow = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
    font-size: 0.9rem;

    &:last-of-type {
        border-bottom: none;
    }
`;

const InfoLabel = styled.span`
    color: ${({ theme }) => theme.colors.textSecondary};
`;

const InfoValue = styled.span`
    font-weight: 500;
    color: ${({ theme }) => theme.colors.text};
`;

const Button = styled.button<{ $primary?: boolean; $small?: boolean }>`
    padding: ${({ $small }) => $small ? '6px 12px' : '10px 20px'};
    font-size: ${({ $small }) => $small ? '0.8rem' : '0.95rem'};
    font-weight: 600;
    border: 1px solid ${({ theme, $primary }) => $primary ? theme.colors.primary : theme.colors.border};
    border-radius: ${({ theme }) => theme.radius.medium};
    background: ${({ $primary }) => $primary ? 'var(--primary, #ef8e13)' : 'transparent'};
    color: ${({ $primary }) => $primary ? '#fff' : 'inherit'};
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        opacity: 0.9;
        transform: translateY(-1px);
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const ActionGroup = styled.div`
    display: flex;
    gap: 8px;
    margin-top: 12px;
`;

const MessageText = styled.div<{ $error?: boolean }>`
    margin-top: 12px;
    padding: 8px 12px;
    border-radius: ${({ theme }) => theme.radius.small};
    background: ${({ $error }) => $error ? 'rgba(231, 76, 60, 0.1)' : 'rgba(46, 204, 113, 0.1)'};
    color: ${({ $error }) => $error ? '#e74c3c' : '#2ecc71'};
    font-size: 0.85rem;
`;

const WarningBox = styled.div`
    margin-top: 16px;
    padding: 12px;
    background: rgba(243, 156, 18, 0.1);
    border-left: 3px solid #f39c12;
    font-size: 0.8rem;
    color: ${({ theme }) => theme.colors.text};
    line-height: 1.4;
`;

interface AutoBackupSetupProps {
    autoBackup: UseAutoBackupReturn;
    language: string;
}

const translations = {
    ko: {
        title: '자동 백업',
        desktop_desc: '데이터가 자동으로 암호화되어 선택한 폴더에 동기화됩니다. 브라우저가 초기화되어도 폴더의 파일은 안전하게 유지됩니다.',
        mobile_desc: '아래 버튼을 눌러 데이터를 암호화된 파일로 내보낼 수 있습니다. 다운로드한 파일을 보관하면 브라우저 초기화 후에도 안전하게 복구할 수 있습니다.',
        password_label: '백업 비밀번호 (선택)',
        password_placeholder: '비워두면 시스템 기본 암호 사용',
        folder_label: '백업 폴더',
        select_folder: '폴더 선택',
        status_enabled: '백업 기능 활성화됨',
        status_disabled: '설정되지 않음',
        last_backup: '마지막 백업',
        never: '없음',
        backup_now: '지금 백업',
        platform_desktop: '데스크톱 모드 (동기화 중)',
        platform_mobile: '모바일 모드 (수동 백업)',
        backup_success: '백업 완료!',
        backup_failed: '백업 실패',
        share_backup: '공유',
        share_success: '공유 완료!',
        change_password: '비밀번호 변경',
        change_folder: '폴더 변경',
        password_optional: '비밀번호 생략 시 자동으로 안전하게 관리됩니다.',
        setup_button: '백업 시작하기',
        desktop_setup_alert: '자동 백업 파일을 저장할 새 폴더를 만드세요.',
        password_warning: '⚠️ 시스템 기본 암호를 사용하면 같은 앱을 가진 다른 사람도 열어볼 수 있습니다.',
        cancel: '취소',
    },
    en: {
        title: 'Auto Backup',
        desktop_desc: 'Data is automatically encrypted and synced to your chosen folder. Files remain safe even if browser data is cleared.',
        mobile_desc: 'Export your data as an encrypted file. Keep the downloaded file safe to restore even after browser data is cleared.',
        password_label: 'Backup Password (Optional)',
        password_placeholder: 'Leave blank for automatic mode',
        folder_label: 'Backup Folder',
        select_folder: 'Select Folder',
        status_enabled: 'Backup is active',
        status_disabled: 'Not set up yet',
        last_backup: 'Last backup',
        never: 'Never',
        backup_now: 'Backup Now',
        platform_desktop: 'Desktop Mode (Syncing)',
        platform_mobile: 'Mobile Mode (Manual)',
        backup_success: 'Backup complete!',
        backup_failed: 'Backup failed',
        share_backup: 'Share',
        share_success: 'Shared!',
        change_password: 'Change Password',
        change_folder: 'Change Folder',
        password_optional: 'If left blank, the system handles it automatically.',
        setup_button: 'Start Backup',
        desktop_setup_alert: 'Please create a new folder to save the auto-backup file.',
        password_warning: '⚠️ Note: Backups using the default system key can be opened by anyone using the same app.',
        cancel: 'Cancel',
    }
};

export const AutoBackupSetup: React.FC<AutoBackupSetupProps> = ({ autoBackup, language }) => {
    const [password, setPassword] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);

    const t = translations[language as keyof typeof translations] || translations.en;

    const handleSetup = async (pwd?: string) => {
        setMessage('');
        if (autoBackup.isDesktop) {
            alert(t.desktop_setup_alert);
        }

        const success = await autoBackup.setup(pwd || '');
        if (success) {
            setPassword('');
        }
    };

    const handleManualBackup = async () => {
        const success = await autoBackup.manualBackup();
        setIsError(!success);
        setMessage(success ? t.backup_success : t.backup_failed);
        setTimeout(() => setMessage(''), 3000);
    };

    const handleShareBackup = async () => {
        const success = await autoBackup.shareBackup();
        if (success) {
            setIsError(false);
            setMessage(t.share_success);
            setTimeout(() => setMessage(''), 3000);
        }
    };

    const handleConfirmPasswordChange = async () => {
        const success = await autoBackup.setup(newPassword);
        if (success) {
            setIsChangingPassword(false);
            setNewPassword('');
            setMessage(t.backup_success); // Or change_success if we add one
            setTimeout(() => setMessage(''), 3000);
        }
    };

    return (
        <Container>
            <Title>
                <span>{autoBackup.isDesktop ? '💻' : '📱'}</span>
                {t.title}
            </Title>

            <StatusText $active={autoBackup.isSetUp}>
                {autoBackup.isSetUp ? `✅ ${t.status_enabled}` : `⚠️ ${t.status_disabled}`}
                <div style={{ fontWeight: 400, opacity: 0.8, marginTop: 4 }}>
                    {autoBackup.isDesktop ? t.platform_desktop : t.platform_mobile}
                </div>
            </StatusText>

            {!autoBackup.isSetUp ? (
                <SetupCard>
                    <Description>
                        {autoBackup.isDesktop ? t.desktop_desc : t.mobile_desc}
                    </Description>

                    <FormGroup>
                        <Label>{t.password_label}</Label>
                        <Input
                            type="password"
                            placeholder={t.password_placeholder}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <div style={{ color: 'var(--text-secondary, #666)', fontSize: '0.75rem', marginTop: 6, opacity: 0.8 }}>
                            {t.password_optional}
                        </div>
                    </FormGroup>

                    {!password.trim() && (
                        <WarningBox>
                            {t.password_warning}
                        </WarningBox>
                    )}

                    <Button
                        onClick={() => handleSetup(password)}
                        $primary
                        style={{ width: '100%', marginTop: 8 }}
                        disabled={autoBackup.isProcessing}
                    >
                        {t.setup_button}
                    </Button>
                </SetupCard>
            ) : (
                <>
                    <InfoRow>
                        <InfoLabel>{t.last_backup}</InfoLabel>
                        <InfoValue>{autoBackup.lastBackupText || t.never}</InfoValue>
                    </InfoRow>

                    {autoBackup.isDesktop && (
                        <InfoRow>
                            <InfoLabel>{t.folder_label}</InfoLabel>
                            <Button $small onClick={() => handleSetup()}>
                                {t.change_folder}
                            </Button>
                        </InfoRow>
                    )}

                    {isChangingPassword ? (
                        <SetupCard style={{ marginTop: 16 }}>
                            <FormGroup>
                                <Label>{t.password_label}</Label>
                                <Input
                                    type="password"
                                    placeholder={t.password_placeholder}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                />
                                {!newPassword.trim() && (
                                    <WarningBox>
                                        {t.password_warning}
                                    </WarningBox>
                                )}
                            </FormGroup>
                            <ActionGroup>
                                <Button $primary onClick={handleConfirmPasswordChange} disabled={autoBackup.isProcessing}>
                                    {t.change_password}
                                </Button>
                                <Button onClick={() => setIsChangingPassword(false)}>
                                    {t.cancel}
                                </Button>
                            </ActionGroup>
                        </SetupCard>
                    ) : (
                        <ActionGroup>
                            <Button $primary onClick={handleManualBackup} disabled={autoBackup.isProcessing}>
                                {t.backup_now}
                            </Button>

                            {autoBackup.canShare && (
                                <Button onClick={handleShareBackup} disabled={autoBackup.isProcessing}>
                                    📤 {t.share_backup}
                                </Button>
                            )}

                            <Button onClick={() => setIsChangingPassword(true)} disabled={autoBackup.isProcessing}>
                                🔑
                            </Button>
                        </ActionGroup>
                    )}

                    {message && (
                        <MessageText $error={isError}>
                            {message}
                        </MessageText>
                    )}
                </>
            )}
        </Container>
    );
};
