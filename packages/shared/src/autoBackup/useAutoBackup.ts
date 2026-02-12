/**
 * React hook for auto-backup functionality.
 * Provides state and actions for backup/restore operations.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { DataAdapter } from '../data/types';
import {
    isFileSystemAccessSupported,
    isWebShareSupported,
    getAutoBackupState,
    getAutoBackupPassword,
    setAutoBackupPassword,
    pickBackupDirectory,
    downloadBackupFile,
    shareBackupFile,
    restoreFromFile,
    restoreFromDirectory,
    createDesktopAutoBackupScheduler,
    getLastBackupRelativeTime,
    getStoredDirectoryHandle,
    writeBackupToDirectory,
    type AutoBackupState,
} from './AutoBackupManager';

export interface UseAutoBackupOptions {
    adapter: DataAdapter;
    appName: string;
    hasData: () => Promise<boolean>;
    language: string;
}

export interface UseAutoBackupReturn {
    /** Current backup state */
    state: AutoBackupState;
    /** Whether auto-backup setup is complete */
    isSetUp: boolean;
    /** Whether the app has data (false means empty DB, might need restore) */
    hasAppData: boolean | null; // null = checking
    /** Human-readable last backup time */
    lastBackupText: string | null;
    /** Whether a backup/restore operation is in progress */
    isProcessing: boolean;
    /** Whether the platform supports auto-backup (desktop File System Access) */
    isDesktop: boolean;
    /** Whether the platform supports Web Share API with file sharing */
    canShare: boolean;

    // Actions
    /** Set up auto-backup with a password (and directory on desktop) */
    setup: (password: string) => Promise<boolean>;
    /** Trigger a manual backup (desktop: to directory, mobile: download) */
    manualBackup: () => Promise<boolean>;
    /** Share backup file via Web Share API (mobile) */
    shareBackup: () => Promise<boolean>;
    /** Restore from a user-selected file */
    restoreFromSelectedFile: (file: File, password: string) => Promise<{ success: boolean; error?: string }>;
    /** Attempt auto-restore from desktop directory */
    autoRestore: () => Promise<{ success: boolean; error?: string }>;
    /** Refresh the state */
    refresh: () => void;
}

export function useAutoBackup({ adapter, appName, hasData, language }: UseAutoBackupOptions): UseAutoBackupReturn {
    const [state, setState] = useState<AutoBackupState>(() => getAutoBackupState(appName));
    const [hasAppData, setHasAppData] = useState<boolean | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const cleanupRef = useRef<(() => void) | null>(null);

    const isDesktop = isFileSystemAccessSupported();
    const canShare = isWebShareSupported();

    // Check if app has data on mount
    useEffect(() => {
        hasData().then(setHasAppData);
    }, [hasData]);

    // Set up desktop auto-backup scheduler
    useEffect(() => {
        const password = getAutoBackupPassword(appName);
        if (isDesktop && state.isEnabled && password) {
            cleanupRef.current = createDesktopAutoBackupScheduler(
                appName,
                adapter,
                password,
                () => {
                    // Refresh state after backup
                    setState(getAutoBackupState(appName));
                }
            );

            return () => {
                cleanupRef.current?.();
            };
        }
    }, [appName, adapter, isDesktop, state.isEnabled]);

    const refresh = useCallback(() => {
        setState(getAutoBackupState(appName));
        hasData().then(setHasAppData);
    }, [appName, hasData]);

    const setup = useCallback(async (password: string): Promise<boolean> => {
        setIsProcessing(true);
        try {
            setAutoBackupPassword(appName, password);

            if (isDesktop) {
                const handle = await pickBackupDirectory(appName);
                if (!handle) {
                    setIsProcessing(false);
                    return false;
                }
            }

            setState(getAutoBackupState(appName));
            setIsProcessing(false);
            return true;
        } catch {
            setIsProcessing(false);
            return false;
        }
    }, [appName, isDesktop]);

    const manualBackup = useCallback(async (): Promise<boolean> => {
        const password = getAutoBackupPassword(appName);
        if (!password) return false;

        setIsProcessing(true);
        try {
            let success: boolean;
            if (isDesktop) {
                // Try to use stored directory handle
                const handle = await getStoredDirectoryHandle(appName);
                if (handle) {
                    success = await writeBackupToDirectory(handle, appName, adapter, password);
                } else {
                    // Fallback to download
                    success = await downloadBackupFile(appName, adapter, password);
                }
            } else {
                success = await downloadBackupFile(appName, adapter, password);
            }

            setState(getAutoBackupState(appName));
            setIsProcessing(false);
            return success;
        } catch {
            setIsProcessing(false);
            return false;
        }
    }, [appName, adapter, isDesktop]);

    const shareBackup = useCallback(async (): Promise<boolean> => {
        const password = getAutoBackupPassword(appName);
        if (!password) return false;

        setIsProcessing(true);
        try {
            const success = await shareBackupFile(appName, adapter, password);
            setState(getAutoBackupState(appName));
            setIsProcessing(false);
            return success;
        } catch {
            setIsProcessing(false);
            return false;
        }
    }, [appName, adapter]);

    const restoreFromSelectedFile = useCallback(async (file: File, password: string): Promise<{ success: boolean; error?: string }> => {
        setIsProcessing(true);
        const result = await restoreFromFile(file, adapter, password);
        setIsProcessing(false);
        if (result.success) {
            setHasAppData(true);
        }
        return result;
    }, [adapter]);

    const autoRestore = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
        if (!isDesktop) return { success: false, error: 'not_supported' };

        const password = getAutoBackupPassword(appName);
        if (!password) return { success: false, error: 'no_password' };

        setIsProcessing(true);
        try {
            const handle = await getStoredDirectoryHandle(appName);
            if (!handle) {
                setIsProcessing(false);
                return { success: false, error: 'no_directory' };
            }

            const result = await restoreFromDirectory(handle, appName, adapter, password);
            setIsProcessing(false);
            if (result.success) {
                setHasAppData(true);
            }
            return result;
        } catch {
            setIsProcessing(false);
            return { success: false, error: 'restore_failed' };
        }
    }, [appName, adapter, isDesktop]);

    const lastBackupText = getLastBackupRelativeTime(appName, language);

    return {
        state,
        isSetUp: state.isEnabled,
        hasAppData,
        lastBackupText,
        isProcessing,
        isDesktop,
        canShare,
        setup,
        manualBackup,
        shareBackup,
        restoreFromSelectedFile,
        autoRestore,
        refresh,
    };
}
