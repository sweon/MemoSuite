import React from 'react';
interface ConfirmModalProps {
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    onNeutral?: () => void;
    confirmText?: string;
    cancelText?: string | null;
    neutralText?: string;
    isDestructive?: boolean;
}
export declare const ConfirmModal: React.FC<ConfirmModalProps>;
export {};
