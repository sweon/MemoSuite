/**
 * RestorePrompt - Shown when the app detects an empty database.
 * Offers the user to restore from a backup file.
 */
import React from 'react';
interface RestorePromptProps {
    language: string;
    onRestore: (file: File, password: string) => Promise<{
        success: boolean;
        error?: string;
    }>;
    onAutoRestore?: () => Promise<{
        success: boolean;
        error?: string;
    }>;
    onSkip: () => void;
    isProcessing: boolean;
    hasDirectoryHandle?: boolean;
}
export declare const RestorePrompt: React.FC<RestorePromptProps>;
export {};
