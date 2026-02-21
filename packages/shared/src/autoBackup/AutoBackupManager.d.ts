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
import type { DataAdapter } from '../data/types';
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
    /** Debugging/Explicit check: is this running on mobile? */
    isMobile: boolean;
    /** Mobile backup warning interval (in days) */
    mobileWarningInterval: number;
    /** Whether a backup warning is active (mobile only) */
    isWarning: boolean;
}
/**
 * Detect if the current device is a mobile device (phone or tablet).
 */
export declare function isMobileDevice(): boolean;
/**
 * Check if the File System Access API (showDirectoryPicker) is available.
 */
export declare function isFileSystemAccessSupported(): boolean;
/**
 * Store a value in localStorage with app-specific prefix
 */
export declare function setStorageValue(appName: string, key: string, value: string): void;
/**
 * Get a value from localStorage with app-specific prefix
 */
export declare function getStorageValue(appName: string, key: string): string | null;
/**
 * Generates an internal backup key for a specific app.
 * This allows "password-less" encryption that still provides a layer of obfuscation
 * and security against accidental exposure, while remaining persistent after data wipes.
 */
export declare function getInternalKey(appName: string): string;
/**
 * Store the directory handle in IndexedDB for persistence across sessions.
 * We use a dedicated IDB store separate from the app's DB.
 */
export declare function storeDirectoryHandle(appName: string, handle: FileSystemDirectoryHandle): Promise<void>;
/**
 * Retrieve the stored directory handle from IndexedDB.
 */
export declare function getStoredDirectoryHandle(appName: string): Promise<FileSystemDirectoryHandle | null>;
/**
 * Desktop: Let user pick a directory for auto-backups.
 */
export declare function pickBackupDirectory(appName: string): Promise<FileSystemDirectoryHandle | null>;
/**
 * Desktop: Write encrypted backup to the chosen directory, overwriting the previous file.
 */
export declare function writeBackupToDirectory(handle: FileSystemDirectoryHandle, appName: string, adapter: DataAdapter, password?: string): Promise<boolean>;
/**
 * Mobile: Download encrypted backup file.
 * This creates a new file in the Downloads folder each time.
 */
export declare function downloadBackupFile(appName: string, adapter: DataAdapter, password?: string): Promise<boolean>;
/**
 * Restore data from a user-selected backup file.
 */
export declare function restoreFromFile(file: File, adapter: DataAdapter, password?: string): Promise<{
    success: boolean;
    error?: string;
}>;
/**
 * Desktop: Restore from the auto-backup file in the chosen directory.
 */
export declare function restoreFromDirectory(directoryHandle: FileSystemDirectoryHandle, appName: string, adapter: DataAdapter, password?: string): Promise<{
    success: boolean;
    error?: string;
}>;
/**
 * Get the current auto-backup state for an app.
 */
export declare function getAutoBackupState(appName: string): AutoBackupState;
/**
 * Explicitly enable or disable auto-backup.
 */
export declare function setAutoBackupEnabled(appName: string, enabled: boolean): void;
/**
 * Stop and clear all auto-backup settings for an app.
 */
export declare function stopAutoBackup(appName: string): Promise<void>;
/**
 * Get the stored auto-backup password.
 */
export declare function getAutoBackupPassword(appName: string): string | null;
/**
 * Store the auto-backup password (used for both desktop and mobile).
 */
export declare function setAutoBackupPassword(appName: string, password: string | null): void;
/**
 * Get the mobile warning interval (days). Default is 3.
 */
export declare function getMobileWarningInterval(appName: string): number;
/**
 * Set the mobile warning interval (days).
 */
export declare function setMobileWarningInterval(appName: string, days: number): void;
/**
 * Check if a mobile backup warning should be shown.
 */
export declare function checkMobileBackupWarning(appName: string, intervalDays: number): boolean;
/**
 * Create an auto-backup scheduler for desktop.
 * Returns a cleanup function.
 */
export declare function createDesktopAutoBackupScheduler(appName: string, adapter: DataAdapter, onBackupComplete?: (success: boolean) => void): () => void;
/**
 * Trigger a debounced backup (call this when data changes on desktop).
 */
export declare function triggerDebouncedBackup(appName: string, adapter: DataAdapter, debounceTimerRef: {
    current: ReturnType<typeof setTimeout> | null;
}, onBackupComplete?: (success: boolean) => void): void;
/**
 * Get a human-readable relative time for the last backup.
 */
export declare function getLastBackupRelativeTime(appName: string, language: string): string | null;
