
import type { DataAdapter, SyncAdapter, SyncInfo } from '@memosuite/shared';
import { getBackupData, mergeBackupData } from './backup';
import { db } from '../db';

export const llmemoAdapter: DataAdapter = {
    getBackupData: async (selectedIds?: (string | number)[]) => {
        const ids = selectedIds ? selectedIds.map(id => Number(id)) : undefined;
        return await getBackupData(ids);
    },
    mergeBackupData: async (data: any) => {
        await mergeBackupData(data);
    },
    clearAllData: async () => {
        await db.delete();
        window.location.reload();
    },
    getExportableItems: async () => {
        const logs = await db.logs.orderBy('createdAt').reverse().toArray();
        return logs.map(log => ({
            id: log.id!,
            title: log.title,
            date: log.createdAt
        }));
    }
};

export const llmemoSyncAdapter: SyncAdapter = {
    getBackupData: async (ids?: number[], excludeIds?: number[]) => {
        return await getBackupData(ids, excludeIds);
    },
    mergeBackupData: async (data: any, resolver?: any) => {
        return await mergeBackupData(data, resolver);
    },
    analyzeSyncData: async (initialId?: number): Promise<SyncInfo> => {
        if (initialId) {
            const log = await db.logs.get(initialId);
            if (log) {
                if (log.threadId) {
                    const threadLogsCount = await db.logs.where('threadId').equals(log.threadId).count();
                    const logsInThread = await db.logs.where('threadId').equals(log.threadId).sortBy('threadOrder');
                    const isHead = logsInThread[0]?.id === log.id;

                    if (isHead && threadLogsCount > 1) {
                        return { type: 'thread', count: threadLogsCount, label: log.title };
                    }
                }
                return { type: 'single', count: 1, label: log.title };
            }
        }
        const count = await db.logs.count();
        return { type: 'full', count, label: 'All Data' };
    },
    getSyncTargetIds: async (initialId?: number): Promise<number[] | undefined> => {
        if (initialId) {
            const log = await db.logs.get(initialId);
            if (log) {
                if (log.threadId) {
                    const logsInThread = await db.logs.where('threadId').equals(log.threadId).sortBy('threadOrder');
                    if (logsInThread.length > 0 && logsInThread[0].id === log.id) {
                        // It is head, share whole thread
                        return logsInThread.map(l => l.id!);
                    }
                }
                return [initialId];
            }
        }
        return undefined; // Full sync
    }
};
