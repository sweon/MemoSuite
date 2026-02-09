
export type SyncStatus = 'idle' | 'disconnected' | 'connecting' | 'connected' | 'syncing' | 'merging' | 'completed' | 'error' | 'ready';

export interface SyncInfo {
    type: 'full' | 'single' | 'thread';
    count: number;
    label?: string;
}

export interface SyncConflict {
    id: string | number;
    type: 'memo' | 'folder' | 'log' | 'word' | 'book';
    title: string;
    localDate: Date;
    remoteDate: Date;
    localContent?: string;
    remoteContent?: string;
}

export type SyncResolution = 'local' | 'remote' | 'both';

export type SyncConflictResolver = (conflicts: SyncConflict[]) => Promise<SyncResolution[]>;

export interface SyncAdapter {
    /**
     * Get data for backup/export.
     * @param ids - Optional list of IDs to export. If undefined, export all.
     * @param excludeIds - Optional list of IDs to exclude from export.
     */
    getBackupData: (ids?: number[], excludeIds?: number[]) => Promise<any>;

    /**
     * Merge incoming backup data into the database.
     * @param data - The data object received from sync.
     * @param resolver - Optional callback to resolve conflicts.
     * @returns List of local IDs that were created or updated as direct mirrors of remote data and should not be re-sent.
     */
    mergeBackupData: (data: any, resolver?: SyncConflictResolver) => Promise<number[] | void>;

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
}

export interface SyncServiceOptions {
    adapter: SyncAdapter;
    onStatusChange: (status: SyncStatus, message?: string) => void;
    onConflict?: SyncConflictResolver;
    onDataReceived: () => void;
    onSyncInfo?: (info: SyncInfo) => void;
    initialDataLogId?: number; // Context specific ID
}
