/**
 * React hook for auto-backup functionality.
 * Provides state and actions for backup/restore operations.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { 
// isFileSystemAccessSupported,
getAutoBackupState, getAutoBackupPassword, setAutoBackupPassword, pickBackupDirectory, downloadBackupFile, restoreFromFile, restoreFromDirectory, createDesktopAutoBackupScheduler, getLastBackupRelativeTime, getStoredDirectoryHandle, writeBackupToDirectory, setAutoBackupEnabled, stopAutoBackup, setMobileWarningInterval, } from './AutoBackupManager';
export function useAutoBackup({ adapter, appName, hasData, language }) {
    const [state, setState] = useState(() => getAutoBackupState(appName));
    const [hasAppData, setHasAppData] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [skipRestore, setSkipRestoreInternal] = useState(() => {
        // Detect if app was opened from landing page with ?install=true
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('install') === 'true') {
            localStorage.setItem(`MS_SKIP_RESTORE_${appName}`, 'true');
            // Clean up the URL to avoid skipping restore on every reload if the user keeps the parameter
            const newUrl = window.location.pathname + window.location.hash;
            window.history.replaceState({}, '', newUrl);
            return true;
        }
        return localStorage.getItem(`MS_SKIP_RESTORE_${appName}`) === 'true';
    });
    const cleanupRef = useRef(null);
    const isDesktop = state.isDesktop;
    // Check if app has data on mount
    useEffect(() => {
        hasData().then(setHasAppData);
    }, [hasData]);
    // Set up desktop auto-backup scheduler
    useEffect(() => {
        if (isDesktop && state.isEnabled) {
            cleanupRef.current = createDesktopAutoBackupScheduler(appName, adapter, () => {
                // Refresh state after backup
                setState(getAutoBackupState(appName));
            });
            return () => {
                cleanupRef.current?.();
            };
        }
    }, [appName, adapter, isDesktop, state.isEnabled]);
    const refresh = useCallback(() => {
        setState(getAutoBackupState(appName));
        hasData().then(setHasAppData);
    }, [appName, hasData]);
    const setSkipRestore = useCallback((skip) => {
        setSkipRestoreInternal(skip);
        if (skip) {
            localStorage.setItem(`MS_SKIP_RESTORE_${appName}`, 'true');
        }
        else {
            localStorage.removeItem(`MS_SKIP_RESTORE_${appName}`);
        }
    }, [appName]);
    const setup = useCallback(async (password) => {
        setIsProcessing(true);
        try {
            setAutoBackupPassword(appName, password || null);
            if (isDesktop) {
                const handle = await pickBackupDirectory(appName);
                if (!handle) {
                    setIsProcessing(false);
                    return false;
                }
            }
            setAutoBackupEnabled(appName, true);
            setState(getAutoBackupState(appName));
            setIsProcessing(false);
            return true;
        }
        catch {
            setIsProcessing(false);
            return false;
        }
    }, [appName, isDesktop]);
    const manualBackup = useCallback(async () => {
        setIsProcessing(true);
        try {
            let success;
            const password = getAutoBackupPassword(appName) || undefined;
            if (isDesktop) {
                const handle = await getStoredDirectoryHandle(appName);
                if (handle) {
                    success = await writeBackupToDirectory(handle, appName, adapter, password);
                }
                else {
                    success = await downloadBackupFile(appName, adapter, password);
                }
            }
            else {
                success = await downloadBackupFile(appName, adapter, password);
            }
            setState(getAutoBackupState(appName));
            setIsProcessing(false);
            return success;
        }
        catch {
            setIsProcessing(false);
            return false;
        }
    }, [appName, adapter, isDesktop]);
    const restoreFromSelectedFile = useCallback(async (file, password) => {
        setIsProcessing(true);
        const result = await restoreFromFile(file, adapter, password);
        setIsProcessing(false);
        if (result.success) {
            setHasAppData(true);
            setSkipRestore(false);
        }
        return result;
    }, [adapter, setSkipRestore]);
    const autoRestore = useCallback(async () => {
        if (!isDesktop)
            return { success: false, error: 'not_supported' };
        setIsProcessing(true);
        try {
            const handle = await getStoredDirectoryHandle(appName);
            if (!handle) {
                setIsProcessing(false);
                return { success: false, error: 'no_directory' };
            }
            const password = getAutoBackupPassword(appName) || undefined;
            const result = await restoreFromDirectory(handle, appName, adapter, password);
            setIsProcessing(false);
            if (result.success) {
                setHasAppData(true);
                setSkipRestore(false);
            }
            return result;
        }
        catch {
            setIsProcessing(false);
            return { success: false, error: 'restore_failed' };
        }
    }, [appName, adapter, isDesktop, setSkipRestore]);
    const stop = useCallback(async () => {
        await stopAutoBackup(appName);
        refresh();
    }, [appName, refresh]);
    const lastBackupText = getLastBackupRelativeTime(appName, language);
    const setMobileInterval = useCallback((days) => {
        setMobileWarningInterval(appName, days);
        refresh();
    }, [appName, refresh]);
    return {
        state,
        isSetUp: state.isEnabled,
        hasAppData,
        lastBackupText,
        isProcessing,
        isDesktop,
        skipRestore,
        setSkipRestore,
        setup,
        manualBackup,
        restoreFromSelectedFile,
        autoRestore,
        stop,
        refresh,
        setMobileInterval,
    };
}
