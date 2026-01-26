
export type SyncStatus = 'disconnected' | 'connecting' | 'connected' | 'syncing' | 'completed' | 'error' | 'ready';

export interface SyncInfo {
    type: 'full' | 'single' | 'thread';
    count: number;
    label?: string;
}

export interface SyncAdapter {
    /**
     * Get data for backup/export.
     * @param ids - Optional list of IDs to export. If undefined, export all.
     */
    getBackupData: (ids?: number[]) => Promise<any>;

    /**
     * Merge incoming backup data into the database.
     * @param data - The data object received from sync.
     */
    mergeBackupData: (data: any) => Promise<void>;

    /**
     * Analyze what will be synced based on an optional initial item ID.
     * Determines if it's a full sync, single item, or thread.
     * @param initialId - ID of the item being synced (if any)
     */
    analyzeSyncData: (initialId?: number) => Promise<SyncInfo>;

    /**
     * Get the list of IDs to sync based on the initial item ID.
     * Used when sending data.
     * @param initialId - ID of the item being synced (if any)
     * @returns Array of IDs to sync, or undefined for full sync.
     */
    getSyncTargetIds: (initialId?: number) => Promise<number[] | undefined>;

    /**
     * Process received data before merging?
     * Not needed if mergeBackupData handles it.
     */
}

export interface SyncServiceOptions {
    adapter: SyncAdapter;
    onStatusChange: (status: SyncStatus, message?: string) => void;
    onDataReceived: () => void;
    onSyncInfo?: (info: SyncInfo) => void;
    initialDataLogId?: number; // Context specific ID
}
