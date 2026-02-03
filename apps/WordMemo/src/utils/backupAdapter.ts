
import type { DataAdapter, SyncAdapter, SyncInfo } from '@memosuite/shared';
import { getBackupData, mergeBackupData } from './backup';
import { db } from '../db';

export const wordMemoAdapter: DataAdapter = {
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
        const logs = await db.words.orderBy('createdAt').reverse().toArray();
        return logs.map(l => ({
            id: l.id!,
            title: l.title,
            date: l.createdAt
        }));
    }
};

export const wordMemoSyncAdapter: SyncAdapter = {
    getBackupData: async (ids?: number[]) => {
        return await getBackupData(ids);
    },
    mergeBackupData: async (data: any) => {
        await mergeBackupData(data);
    },
    analyzeSyncData: async (initialId?: number): Promise<SyncInfo> => {
        if (initialId) {
            const log = await db.words.get(initialId);
            if (log) {
                if (log.threadId) {
                    const threadCount = await db.words.where('threadId').equals(log.threadId).count();
                    const threadLogs = await db.words.where('threadId').equals(log.threadId).sortBy('threadOrder');
                    const isHead = threadLogs[0]?.id === log.id;

                    if (isHead && threadCount > 1) {
                        return { type: 'thread', count: threadCount, label: log.title };
                    }
                }
                return { type: 'single', count: 1, label: log.title };
            }
        }
        const count = await db.words.count();
        return { type: 'full', count, label: 'All Data' };
    },
    getSyncTargetIds: async (initialId?: number): Promise<number[] | undefined> => {
        if (initialId) {
            const log = await db.words.get(initialId);
            if (log && log.threadId) {
                const threadLogs = await db.words.where('threadId').equals(log.threadId).sortBy('threadOrder');
                if (threadLogs.length > 0 && threadLogs[0].id === log.id) {
                    return threadLogs.map(l => l.id!);
                }
            }
            return [initialId];
        }
        return undefined;
    }
};
