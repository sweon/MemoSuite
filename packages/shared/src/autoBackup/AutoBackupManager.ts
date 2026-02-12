/**
 * AutoBackupManager - Automatic backup/restore system for MemoSuite apps
 * 
 * Desktop (Chrome/Edge): Uses File System Access API (showDirectoryPicker) 
 *   to auto-backup to a user-chosen folder, overwriting the same file.
 * Mobile: Manual backup via <a download> to Downloads folder.
 * 
 * Restore: On startup, detects empty DB and offers to restore from file.
 * All backups are AES-256-GCM encrypted.
 */

import { encryptData, decryptData } from '../utils/crypto';
import type { DataAdapter } from '../data/types';

const STORAGE_KEY_PREFIX = 'autoBackup_';
const BACKUP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const DEBOUNCE_MS = 5000; // 5 seconds debounce for change-triggered backups

export interface AutoBackupConfig {
    /** The DataAdapter for this app */
    adapter: DataAdapter;
    /** App name prefix for backup files, e.g. 'llmemo' */
    appName: string;
    /** The encryption password for backups */
    password: string;
    /** Function to check if the DB has any data */
    hasData: () => Promise<boolean>;
    /** Callback when data is changed (for triggering backups) */
    onDataChanged?: () => void;
}

export interface AutoBackupState {
    /** Whether auto-backup is configured/enabled */
    isEnabled: boolean;
    /** Whether File System Access API is available (desktop) */
    isDesktop: boolean;
    /** Last backup timestamp */
    lastBackupTime: string | null;
    /** Whether the directory handle is stored */
    hasDirectoryHandle: boolean;
}

/**
 * Check if the File System Access API (showDirectoryPicker) is available.
 * This is only available on desktop Chrome/Edge.
 */
export function isFileSystemAccessSupported(): boolean {
    return 'showDirectoryPicker' in window;
}

/**
 * Store a value in localStorage with app-specific prefix
 */
export function setStorageValue(appName: string, key: string, value: string): void {
    try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}${appName}_${key}`, value);
    } catch {
        // localStorage may be unavailable
    }
}

/**
 * Get a value from localStorage with app-specific prefix
 */
export function getStorageValue(appName: string, key: string): string | null {
    try {
        return localStorage.getItem(`${STORAGE_KEY_PREFIX}${appName}_${key}`);
    } catch {
        return null;
    }
}

/**
 * Store the directory handle in IndexedDB for persistence across sessions.
 * We use a dedicated IDB store separate from the app's DB.
 */
export async function storeDirectoryHandle(appName: string, handle: FileSystemDirectoryHandle): Promise<void> {
    const dbName = `${appName}_autoBackupHandles`;
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);
        request.onupgradeneeded = () => {
            request.result.createObjectStore('handles');
        };
        request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction('handles', 'readwrite');
            tx.objectStore('handles').put(handle, 'directoryHandle');
            tx.oncomplete = () => { db.close(); resolve(); };
            tx.onerror = () => { db.close(); reject(tx.error); };
        };
        request.onerror = () => reject(request.error);
    });
}

/**
 * Retrieve the stored directory handle from IndexedDB.
 */
export async function getStoredDirectoryHandle(appName: string): Promise<FileSystemDirectoryHandle | null> {
    const dbName = `${appName}_autoBackupHandles`;
    return new Promise((resolve) => {
        const request = indexedDB.open(dbName, 1);
        request.onupgradeneeded = () => {
            request.result.createObjectStore('handles');
        };
        request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction('handles', 'readonly');
            const getReq = tx.objectStore('handles').get('directoryHandle');
            getReq.onsuccess = () => { db.close(); resolve(getReq.result || null); };
            getReq.onerror = () => { db.close(); resolve(null); };
        };
        request.onerror = () => resolve(null);
    });
}

/**
 * Desktop: Let user pick a directory for auto-backups.
 */
export async function pickBackupDirectory(appName: string): Promise<FileSystemDirectoryHandle | null> {
    if (!isFileSystemAccessSupported()) return null;

    try {
        const handle = await (window as any).showDirectoryPicker({
            mode: 'readwrite',
            startIn: 'documents',
        });
        await storeDirectoryHandle(appName, handle);
        setStorageValue(appName, 'hasDirectory', 'true');
        return handle;
    } catch (err: any) {
        if (err.name === 'AbortError') return null; // User cancelled
        console.error('Failed to pick directory:', err);
        return null;
    }
}

/**
 * Desktop: Write encrypted backup to the chosen directory, overwriting the previous file.
 */
export async function writeBackupToDirectory(
    handle: FileSystemDirectoryHandle,
    appName: string,
    adapter: DataAdapter,
    password: string
): Promise<boolean> {
    try {
        // Verify we still have permission
        const permStatus = await (handle as any).queryPermission({ mode: 'readwrite' });
        if (permStatus !== 'granted') {
            const reqStatus = await (handle as any).requestPermission({ mode: 'readwrite' });
            if (reqStatus !== 'granted') return false;
        }

        const data = await adapter.getBackupData();
        const backupPayload = {
            version: 1,
            timestamp: new Date().toISOString(),
            data
        };
        const jsonStr = JSON.stringify(backupPayload);
        const encryptedContent = await encryptData(jsonStr, password);
        const finalPayload = JSON.stringify({
            version: 1,
            isEncrypted: true,
            appName,
            encryptedContent
        }, null, 2);

        const fileName = `${appName}-autobackup.json`;
        const fileHandle = await handle.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(finalPayload);
        await writable.close();

        const now = new Date().toISOString();
        setStorageValue(appName, 'lastBackup', now);
        return true;
    } catch (err) {
        console.error('Auto-backup write failed:', err);
        return false;
    }
}

/**
 * Mobile: Download encrypted backup file.
 * This creates a new file in the Downloads folder each time.
 */
export async function downloadBackupFile(
    appName: string,
    adapter: DataAdapter,
    password: string
): Promise<boolean> {
    try {
        const data = await adapter.getBackupData();
        const backupPayload = {
            version: 1,
            timestamp: new Date().toISOString(),
            data
        };
        const jsonStr = JSON.stringify(backupPayload);
        const encryptedContent = await encryptData(jsonStr, password);
        const finalPayload = JSON.stringify({
            version: 1,
            isEncrypted: true,
            appName,
            encryptedContent
        }, null, 2);

        const fileName = `${appName}-backup-${new Date().toISOString().slice(0, 10)}.json`;

        const a = document.createElement('a');
        const file = new Blob([finalPayload], { type: 'application/json' });
        a.href = URL.createObjectURL(file);
        a.download = fileName;
        document.body.appendChild(a);
        a.click();

        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(a.href);
        }, 100);

        const now = new Date().toISOString();
        setStorageValue(appName, 'lastBackup', now);
        return true;
    } catch (err) {
        console.error('Backup download failed:', err);
        return false;
    }
}

/**
 * Check if the Web Share API with file sharing is available.
 */
export function isWebShareSupported(): boolean {
    return 'share' in navigator && 'canShare' in navigator;
}

/**
 * Mobile: Share encrypted backup file via Web Share API.
 * Uses the native share sheet so users can save to Google Drive, iCloud, etc.
 * Returns false if sharing was cancelled or failed.
 */
export async function shareBackupFile(
    appName: string,
    adapter: DataAdapter,
    password: string
): Promise<boolean> {
    try {
        const data = await adapter.getBackupData();
        const backupPayload = {
            version: 1,
            timestamp: new Date().toISOString(),
            data
        };
        const jsonStr = JSON.stringify(backupPayload);
        const encryptedContent = await encryptData(jsonStr, password);
        const finalPayload = JSON.stringify({
            version: 1,
            isEncrypted: true,
            appName,
            encryptedContent
        }, null, 2);

        const fileName = `${appName}-backup-${new Date().toISOString().slice(0, 10)}.json`;
        const file = new File([finalPayload], fileName, { type: 'application/json' });

        const shareData = { files: [file] };

        if (navigator.canShare && navigator.canShare(shareData)) {
            await navigator.share(shareData);
            const now = new Date().toISOString();
            setStorageValue(appName, 'lastBackup', now);
            return true;
        } else {
            // Fallback to download if file sharing is not supported
            return await downloadBackupFile(appName, adapter, password);
        }
    } catch (err: any) {
        if (err.name === 'AbortError') {
            // User cancelled the share — still counts as intent to backup
            return false;
        }
        console.error('Share backup failed, falling back to download:', err);
        // Fallback to download
        return await downloadBackupFile(appName, adapter, password);
    }
}

/**
 * Restore data from a user-selected backup file.
 */
export async function restoreFromFile(
    file: File,
    adapter: DataAdapter,
    password: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const text = await file.text();
        const content = JSON.parse(text);

        if (content.isEncrypted && content.encryptedContent) {
            try {
                const decryptedJSON = await decryptData(content.encryptedContent, password);
                const parsed = JSON.parse(decryptedJSON);
                const dataToMerge = parsed.data || parsed;
                await adapter.mergeBackupData(dataToMerge);
                return { success: true };
            } catch {
                return { success: false, error: 'invalid_password' };
            }
        } else {
            const dataToMerge = content.data || content;
            await adapter.mergeBackupData(dataToMerge);
            return { success: true };
        }
    } catch (err) {
        return { success: false, error: 'invalid_file' };
    }
}

/**
 * Desktop: Restore from the auto-backup file in the chosen directory.
 */
export async function restoreFromDirectory(
    handle: FileSystemDirectoryHandle,
    appName: string,
    adapter: DataAdapter,
    password: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const permStatus = await (handle as any).queryPermission({ mode: 'read' });
        if (permStatus !== 'granted') {
            const reqStatus = await (handle as any).requestPermission({ mode: 'read' });
            if (reqStatus !== 'granted') return { success: false, error: 'permission_denied' };
        }

        const fileName = `${appName}-autobackup.json`;
        let fileHandle: FileSystemFileHandle;
        try {
            fileHandle = await handle.getFileHandle(fileName);
        } catch {
            return { success: false, error: 'no_backup_found' };
        }

        const file = await fileHandle.getFile();
        return await restoreFromFile(file, adapter, password);
    } catch (err) {
        return { success: false, error: 'restore_failed' };
    }
}

/**
 * Get the current auto-backup state for an app.
 */
export function getAutoBackupState(appName: string): AutoBackupState {
    const isDesktop = isFileSystemAccessSupported();
    const hasDirectory = getStorageValue(appName, 'hasDirectory') === 'true';
    const lastBackup = getStorageValue(appName, 'lastBackup');
    const password = getStorageValue(appName, 'password');

    return {
        isEnabled: !!password && (isDesktop ? hasDirectory : true),
        isDesktop,
        lastBackupTime: lastBackup,
        hasDirectoryHandle: hasDirectory,
    };
}

/**
 * Store the auto-backup password (used for both desktop and mobile).
 */
export function setAutoBackupPassword(appName: string, password: string): void {
    setStorageValue(appName, 'password', password);
}

/**
 * Get the stored auto-backup password.
 */
export function getAutoBackupPassword(appName: string): string | null {
    return getStorageValue(appName, 'password');
}

/**
 * Create an auto-backup scheduler for desktop.
 * Returns a cleanup function.
 */
export function createDesktopAutoBackupScheduler(
    appName: string,
    adapter: DataAdapter,
    password: string,
    onBackupComplete?: (success: boolean) => void
): () => void {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let lastDataHash = '';
    let isRunning = false;

    const performBackup = async () => {
        if (isRunning) return;
        isRunning = true;

        try {
            const handle = await getStoredDirectoryHandle(appName);
            if (!handle) {
                isRunning = false;
                return;
            }

            // Simple change detection: compare data hash
            const data = await adapter.getBackupData();
            const currentHash = JSON.stringify(data).length.toString(); // Simple size-based check

            if (currentHash === lastDataHash) {
                isRunning = false;
                return; // No changes
            }

            const success = await writeBackupToDirectory(handle, appName, adapter, password);
            if (success) {
                lastDataHash = currentHash;
            }
            onBackupComplete?.(success);
        } catch (err) {
            console.error('Scheduled backup failed:', err);
            onBackupComplete?.(false);
        }

        isRunning = false;
    };

    // Periodic backup
    intervalId = setInterval(performBackup, BACKUP_INTERVAL_MS);

    // Backup on visibility change (user leaving the tab/app)
    const handleVisibilityChange = () => {
        if (document.hidden) {
            performBackup();
        }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup function
    return () => {
        if (intervalId) clearInterval(intervalId);
        if (debounceTimer) clearTimeout(debounceTimer);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
}

/**
 * Trigger a debounced backup (call this when data changes on desktop).
 */
export function triggerDebouncedBackup(
    appName: string,
    adapter: DataAdapter,
    password: string,
    debounceTimerRef: { current: ReturnType<typeof setTimeout> | null }
): void {
    if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(async () => {
        const handle = await getStoredDirectoryHandle(appName);
        if (handle) {
            await writeBackupToDirectory(handle, appName, adapter, password);
        }
    }, DEBOUNCE_MS);
}

/**
 * Get a human-readable relative time for the last backup.
 */
export function getLastBackupRelativeTime(appName: string, language: string): string | null {
    const lastBackup = getStorageValue(appName, 'lastBackup');
    if (!lastBackup) return null;

    const diff = Date.now() - new Date(lastBackup).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (language === 'ko') {
        if (minutes < 1) return '방금 전';
        if (minutes < 60) return `${minutes}분 전`;
        if (hours < 24) return `${hours}시간 전`;
        return `${days}일 전`;
    } else {
        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    }
}
