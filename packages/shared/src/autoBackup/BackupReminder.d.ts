/**
 * BackupReminder - Non-intrusive floating banner for mobile users.
 * Shows when auto-backup is set up but the last backup is older than a threshold.
 * Only shows on mobile (non-desktop) since desktop has automatic backup.
 */
import React from 'react';
import type { UseAutoBackupReturn } from './useAutoBackup';
interface BackupReminderProps {
    autoBackup: UseAutoBackupReturn;
    language: string;
}
export declare const BackupReminder: React.FC<BackupReminderProps>;
export {};
