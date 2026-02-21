/**
 * React hook for auto-backup functionality.
 * Provides state and actions for backup/restore operations.
 */
import type { DataAdapter } from '../data/types';
import { type AutoBackupState } from './AutoBackupManager';
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
    hasAppData: boolean | null;
    /** Human-readable last backup time */
    lastBackupText: string | null;
    /** Whether a backup/restore operation is in progress */
    isProcessing: boolean;
    /** Whether the platform supports auto-backup (desktop File System Access) */
    isDesktop: boolean;
    /** Whether the user has chosen to skip restoration (persists in localStorage until clear) */
    skipRestore: boolean;
    /** Mark restoration as skipped */
    setSkipRestore: (skip: boolean) => void;
    /** Set up auto-backup with a password (optional) and directory (on desktop) */
    setup: (password?: string) => Promise<boolean>;
    /** Trigger a manual backup (desktop: to directory, mobile: download) */
    manualBackup: () => Promise<boolean>;
    /** Restore from a user-selected file with optional password */
    restoreFromSelectedFile: (file: File, password?: string) => Promise<{
        success: boolean;
        error?: string;
    }>;
    /** Attempt auto-restore from desktop directory */
    autoRestore: () => Promise<{
        success: boolean;
        error?: string;
    }>;
    /** Stop auto-backup and clear all settings */
    stop: () => Promise<void>;
    refresh: () => void;
    /** Set the mobile warning interval (days) */
    setMobileInterval: (days: number) => void;
}
export declare function useAutoBackup({ adapter, appName, hasData, language }: UseAutoBackupOptions): UseAutoBackupReturn;
