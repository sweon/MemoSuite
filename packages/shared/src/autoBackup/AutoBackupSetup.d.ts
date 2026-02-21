/**
 * AutoBackupSetup - UI for setting up auto-backup.
 */
import React from 'react';
import type { UseAutoBackupReturn } from './useAutoBackup';
interface AutoBackupSetupProps {
    autoBackup: UseAutoBackupReturn;
    language: string;
}
export declare const AutoBackupSetup: React.FC<AutoBackupSetupProps>;
export {};
