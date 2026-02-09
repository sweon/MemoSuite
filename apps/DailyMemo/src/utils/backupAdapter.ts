
import type { DataAdapter, SyncAdapter, SyncInfo } from '@memosuite/shared';
import { getBackupData, mergeBackupData } from './backup';
import { db } from '../db';

export const dailyMemoAdapter: DataAdapter = {
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
        const memos = await db.memos.orderBy('createdAt').reverse().toArray();
        return memos.map(m => ({
            id: m.id!,
            title: m.title,
            date: m.createdAt
        }));
    }
};

export const dailyMemoSyncAdapter: SyncAdapter = {
    getBackupData: async (ids?: number[], excludeIds?: number[]) => {
        return await getBackupData(ids, excludeIds);
    },
    mergeBackupData: async (data: any, resolver?: any) => {
        return await mergeBackupData(data, resolver);
    },
    analyzeSyncData: async (initialId?: number): Promise<SyncInfo> => {
        if (initialId) {
            const memo = await db.memos.get(initialId);
            if (memo) {
                if (memo.threadId) {
                    const threadCount = await db.memos.where('threadId').equals(memo.threadId).count();
                    const threadMemos = await db.memos.where('threadId').equals(memo.threadId).sortBy('threadOrder');
                    const isHead = threadMemos[0]?.id === memo.id;

                    if (isHead && threadCount > 1) {
                        return { type: 'thread', count: threadCount, label: memo.title };
                    }
                }
                return { type: 'single', count: 1, label: memo.title };
            }
        }
        const count = await db.memos.count();
        return { type: 'full', count, label: 'All Data' };
    },
    getSyncTargetIds: async (initialId?: number): Promise<number[] | undefined> => {
        if (initialId) {
            const memo = await db.memos.get(initialId);
            if (memo && memo.threadId) {
                const threadMemos = await db.memos.where('threadId').equals(memo.threadId).sortBy('threadOrder');
                if (threadMemos.length > 0 && threadMemos[0].id === memo.id) {
                    return threadMemos.map(m => m.id!);
                }
            }
            return [initialId];
        }
        return undefined;
    }
};
