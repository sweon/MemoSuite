import React from 'react';
interface PasswordModalProps {
    isOpen: boolean;
    title?: string;
    message?: string;
    onConfirm: (password: string) => void;
    onCancel: () => void;
    placeholder?: string;
    confirmText?: string;
    cancelText?: string;
    allowEmpty?: boolean;
}
export declare const PasswordModal: React.FC<PasswordModalProps>;
export {};
