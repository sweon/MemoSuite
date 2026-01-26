
export interface BackupData<T = any> {
    version: number;
    timestamp: string;
    data: T;
}

export interface DataAdapter<T = any> {
    /**
     * Get all data for backup.
     * @param selectedIds Optional list of IDs to export only specific items.
     */
    getBackupData: (selectedIds?: (string | number)[]) => Promise<T>;

    /**
     * Merge backup data into the current database.
     * @param data The data object from the backup file.
     */
    mergeBackupData: (data: T) => Promise<void>;

    /**
     * Clear all data (Factory reset).
     */
    clearAllData: () => Promise<void>;

    /**
     * Get a list of items that can be selectively exported (e.g. Logs, Memos).
     */
    getExportableItems?: () => Promise<{ id: string | number; title: string; date?: Date }[]>;
}

export interface DataManagementProps {
    adapter: DataAdapter;
    /** Prefix for the default export filename, e.g. "llmemo" -> "llmemo-backup-..." */
    fileNamePrefix: string;
    /** Translation object */
    t: any;
}
