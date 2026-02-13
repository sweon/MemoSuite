/**
 * RestorePrompt - Shown when the app detects an empty database.
 * Offers the user to restore from a backup file.
 */

import React, { useState, useRef } from 'react';
import styled from 'styled-components';

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 20px;
`;

const Modal = styled.div`
    background: ${({ theme }) => theme.colors.surface};
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: ${({ theme }) => theme.radius.large};
    padding: 32px;
    max-width: 440px;
    width: 100%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
`;

const Title = styled.h2`
    margin: 0 0 8px 0;
    font-size: 1.3rem;
    color: ${({ theme }) => theme.colors.text};
`;

const Description = styled.p`
    margin: 0 0 24px 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.95rem;
    line-height: 1.5;
`;

const PasswordInput = styled.input`
    width: 100%;
    padding: 10px 14px;
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: ${({ theme }) => theme.radius.medium};
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text};
    font-size: 1rem;
    margin-bottom: 16px;
    box-sizing: border-box;

    &:focus {
        outline: none;
        border-color: ${({ theme }) => theme.colors.primary};
    }
`;

const ButtonGroup = styled.div`
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
`;

const Button = styled.button<{ $primary?: boolean; $danger?: boolean }>`
    flex: 1;
    min-width: 120px;
    padding: 12px 20px;
    border: 1px solid ${({ theme, $primary, $danger }) =>
        $primary ? theme.colors.primary :
            $danger ? '#e74c3c' :
                theme.colors.border};
    border-radius: ${({ theme }) => theme.radius.medium};
    background: ${({ $primary, $danger }) =>
        $primary ? 'var(--primary, #ef8e13)' :
            $danger ? '#e74c3c' :
                'transparent'};
    color: ${({ theme, $primary, $danger }) =>
        $primary || $danger ? '#fff' : theme.colors.text};
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        opacity: 0.9;
        transform: translateY(-1px);
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
    }
`;

const ErrorText = styled.p`
    color: #e74c3c;
    font-size: 0.85rem;
    margin: 0 0 12px 0;
`;

const HiddenInput = styled.input`
    display: none;
`;

interface RestorePromptProps {
    language: string;
    onRestore: (file: File, password: string) => Promise<{ success: boolean; error?: string }>;
    onAutoRestore?: () => Promise<{ success: boolean; error?: string }>;
    onSkip: () => void;
    isProcessing: boolean;
    hasDirectoryHandle?: boolean;
}

const translations = {
    ko: {
        title: '데이터 복원',
        description: '앱 데이터가 비어 있습니다. 이전에 저장한 백업 파일로 복원할 수 있습니다.',
        password_placeholder: '백업 비밀번호 입력',
        select_file: '백업 파일 선택',
        skip: '건너뛰기',
        restoring: '복원 중...',
        restore_from_folder: '설정된 폴더에서 자동 복원',
        restore_success: '데이터 복원 완료!',
        restore_success_desc: '잠시 후 자동으로 앱이 새로고침됩니다.',
        invalid_password: '잘못된 비밀번호입니다.',
        invalid_file: '유효하지 않은 백업 파일입니다.',
        no_backup_found: '백업 파일을 찾을 수 없습니다.',
        no_file: '파일을 선택해 주세요.',
    },
    en: {
        title: 'Restore Data',
        description: 'App data is empty. You can restore from a previously saved backup file.',
        password_placeholder: 'Enter backup password',
        select_file: 'Select Backup File',
        skip: 'Skip',
        restoring: 'Restoring...',
        restore_from_folder: 'Auto-restore from Folder',
        restore_success: 'Restore Successful!',
        restore_success_desc: 'The app will reload automatically in a moment.',
        invalid_password: 'Invalid password.',
        invalid_file: 'Invalid backup file.',
        no_backup_found: 'Backup file not found.',
        no_file: 'Please select a file.',
    }
};

export const RestorePrompt: React.FC<RestorePromptProps> = ({
    language,
    onRestore,
    onAutoRestore,
    onSkip,
    isProcessing,
    hasDirectoryHandle
}) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const t = translations[language as keyof typeof translations] || translations.en;

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setError('');
        }
    };

    const handleRestore = async () => {
        if (!selectedFile) {
            setError(t.no_file);
            return;
        }

        setError('');
        const result = await onRestore(selectedFile, password);
        if (result.success) {
            setIsSuccess(true);
        } else {
            if (result.error === 'invalid_password') {
                setError(t.invalid_password);
            } else {
                setError(t.invalid_file);
            }
        }
    };

    const handleAutoRestore = async () => {
        setError('');
        const result = await onAutoRestore?.();
        if (result && result.success) {
            setIsSuccess(true);
        } else if (result && !result.success) {
            if (result.error === 'no_backup_found') {
                setError(t.no_backup_found);
            } else if (result.error === 'invalid_password') {
                setError(t.invalid_password);
            } else {
                setError(t.invalid_file);
            }
        }
    };

    return (
        <Overlay>
            <Modal>
                {isSuccess ? (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', marginBottom: 16 }}>✅</div>
                        <Title>{t.restore_success}</Title>
                        <Description>{t.restore_success_desc}</Description>
                    </div>
                ) : (
                    <>
                        <Title>{t.title}</Title>
                        <Description>{t.description}</Description>

                        {error && <ErrorText>{error}</ErrorText>}

                        <HiddenInput
                            ref={fileInputRef}
                            type="file"
                            accept=".json"
                            onChange={handleFileSelect}
                        />

                        <Button
                            onClick={() => fileInputRef.current?.click()}
                            style={{ marginBottom: 12, width: '100%' }}
                            disabled={isProcessing}
                        >
                            {selectedFile ? `📄 ${selectedFile.name}` : `📁 ${t.select_file}`}
                        </Button>

                        {hasDirectoryHandle && onAutoRestore && (
                            <Button
                                onClick={handleAutoRestore}
                                style={{ marginBottom: 16, width: '100%', borderColor: 'var(--primary, #ef8e13)', color: 'var(--primary, #ef8e13)' }}
                                disabled={isProcessing}
                            >
                                🔄 {t.restore_from_folder}
                            </Button>
                        )}

                        <PasswordInput
                            type="password"
                            placeholder={t.password_placeholder}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isProcessing}
                        />

                        <ButtonGroup>
                            <Button onClick={onSkip} disabled={isProcessing}>
                                {t.skip}
                            </Button>
                            <Button
                                $primary
                                onClick={handleRestore}
                                disabled={isProcessing || !selectedFile}
                            >
                                {isProcessing ? t.restoring : t.title}
                            </Button>
                        </ButtonGroup>
                    </>
                )}
            </Modal>
        </Overlay>
    );
};
