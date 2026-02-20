import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * RestorePrompt - Shown when the app detects an empty database.
 * Offers the user to restore from a backup file.
 */
import { useState, useRef } from 'react';
import styled from 'styled-components';
const Overlay = styled.div `
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
const Modal = styled.div `
    background: ${({ theme }) => theme.colors.surface};
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: ${({ theme }) => theme.radius.large};
    padding: 32px;
    max-width: 440px;
    width: 100%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
`;
const Title = styled.h2 `
    margin: 0 0 8px 0;
    font-size: 1.3rem;
    color: ${({ theme }) => theme.colors.text};
`;
const Description = styled.p `
    margin: 0 0 24px 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.95rem;
    line-height: 1.5;
`;
const PasswordInput = styled.input `
    width: 100%;
    padding: 10px 14px;
    padding-right: 42px;
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: ${({ theme }) => theme.radius.medium};
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text};
    font-size: 1rem;
    box-sizing: border-box;

    &:focus {
        outline: none;
        border-color: ${({ theme }) => theme.colors.primary};
    }
`;
const PasswordWrapper = styled.div `
    position: relative;
    display: flex;
    align-items: center;
    margin-bottom: 16px;
`;
const VisibilityButton = styled.button `
    position: absolute;
    right: 8px;
    background: none;
    border: none;
    padding: 6px;
    cursor: pointer;
    color: ${({ theme }) => theme.colors.textSecondary};
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.6;
    transition: opacity 0.2s, background-color 0.2s;
    border-radius: 4px;

    &:hover {
        background: rgba(0, 0, 0, 0.05);
        color: ${({ theme }) => theme.colors.text};
        opacity: 1;
    }

    svg {
        width: 18px;
        height: 18px;
    }
`;
const EyeIcon = () => (_jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" }), _jsx("circle", { cx: "12", cy: "12", r: "3" })] }));
const EyeOffIcon = () => (_jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" }), _jsx("line", { x1: "1", y1: "1", x2: "23", y2: "23" })] }));
const ButtonGroup = styled.div `
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
`;
const Button = styled.button `
    flex: 1;
    min-width: 120px;
    padding: 12px 20px;
    border: 1px solid ${({ theme, $primary, $danger }) => $primary ? theme.colors.primary :
    $danger ? '#e74c3c' :
        theme.colors.border};
    border-radius: ${({ theme }) => theme.radius.medium};
    background: ${({ $primary, $danger }) => $primary ? 'var(--primary, #ef8e13)' :
    $danger ? '#e74c3c' :
        'transparent'};
    color: ${({ theme, $primary, $danger }) => $primary || $danger ? '#fff' : theme.colors.text};
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
const ErrorText = styled.p `
    color: #e74c3c;
    font-size: 0.85rem;
    margin: 0 0 12px 0;
`;
const HiddenInput = styled.input `
    display: none;
`;
const translations = {
    ko: {
        title: '처음 시작 또는 데이터 복원',
        description: '앱 데이터가 비어 있습니다. 이전에 저장한 백업 파일로 복원하거나, 건너뛰기를 눌러 빈 상태로 시작할 수 있습니다.',
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
        title: 'Get Started or Restore Data',
        description: 'App data is empty. You can restore from a previously saved backup file. Or click Skip to start with an empty state.',
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
export const RestorePrompt = ({ language, onRestore, onAutoRestore, onSkip, isProcessing, hasDirectoryHandle }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const fileInputRef = useRef(null);
    const t = translations[language] || translations.en;
    const handleFileSelect = (e) => {
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
        }
        else {
            if (result.error === 'invalid_password') {
                setError(t.invalid_password);
            }
            else {
                setError(t.invalid_file);
            }
        }
    };
    const handleAutoRestore = async () => {
        setError('');
        const result = await onAutoRestore?.();
        if (result && result.success) {
            setIsSuccess(true);
        }
        else if (result && !result.success) {
            if (result.error === 'no_backup_found') {
                setError(t.no_backup_found);
            }
            else if (result.error === 'invalid_password') {
                setError(t.invalid_password);
            }
            else {
                setError(t.invalid_file);
            }
        }
    };
    return (_jsx(Overlay, { children: _jsx(Modal, { children: isSuccess ? (_jsxs("div", { style: { textAlign: 'center' }, children: [_jsx("div", { style: { fontSize: '3rem', marginBottom: 16 }, children: "\u2705" }), _jsx(Title, { children: t.restore_success }), _jsx(Description, { children: t.restore_success_desc })] })) : (_jsxs(_Fragment, { children: [_jsx(Title, { children: t.title }), _jsx(Description, { children: t.description }), error && _jsx(ErrorText, { children: error }), _jsx(HiddenInput, { ref: fileInputRef, type: "file", accept: ".json", onChange: handleFileSelect }), _jsx(Button, { onClick: () => fileInputRef.current?.click(), style: { marginBottom: 12, width: '100%' }, disabled: isProcessing, children: selectedFile ? `📄 ${selectedFile.name}` : `📁 ${t.select_file}` }), hasDirectoryHandle && onAutoRestore && (_jsxs(Button, { onClick: handleAutoRestore, style: { marginBottom: 16, width: '100%', borderColor: 'var(--primary, #ef8e13)', color: 'var(--primary, #ef8e13)' }, disabled: isProcessing, children: ["\uD83D\uDD04 ", t.restore_from_folder] })), _jsxs(PasswordWrapper, { children: [_jsx(PasswordInput, { type: showPassword ? "text" : "password", placeholder: t.password_placeholder, value: password, onChange: (e) => setPassword(e.target.value), disabled: isProcessing }), _jsx(VisibilityButton, { type: "button", onClick: () => setShowPassword(!showPassword), title: showPassword ? "Hide password" : "Show password", children: showPassword ? _jsx(EyeOffIcon, {}) : _jsx(EyeIcon, {}) })] }), _jsxs(ButtonGroup, { children: [_jsx(Button, { onClick: onSkip, disabled: isProcessing, children: t.skip }), _jsx(Button, { "$primary": true, onClick: handleRestore, disabled: isProcessing || !selectedFile, children: isProcessing ? t.restoring : t.title })] })] })) }) }));
};
