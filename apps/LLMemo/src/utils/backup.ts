import { db } from '../db';
import { decryptData, encryptData, saveFile } from '@memosuite/shared';

export const getBackupData = async (logIds?: number[]) => {
    let logs = await db.logs.toArray();
    const models = await db.models.toArray();
    let comments = await db.comments.toArray();
    const folders = await db.folders.toArray();

    if (logIds && logIds.length > 0) {
        logs = logs.filter(l => l.id !== undefined && logIds.includes(l.id));
        comments = comments.filter(c => logIds.includes(c.logId));
        // Keep all models and folders to ensure references work
    }

    return {
        version: 1,
        timestamp: new Date().toISOString(),
        logs,
        models,
        comments,
        folders
    };
};

export const exportData = async (selectedLogIds?: number[], customFileName?: string, password?: string) => {
    let data: any = await getBackupData(selectedLogIds);

    if (password) {
        const jsonStr = JSON.stringify(data);
        const encryptedContent = await encryptData(jsonStr, password);
        data = {
            version: 1,
            isEncrypted: true,
            encryptedContent
        };
    }

    let fileName = customFileName;
    if (!fileName) {
        fileName = selectedLogIds && selectedLogIds.length > 0
            ? `llmemo-partial-${new Date().toISOString().slice(0, 10)}.json`
            : `llmemo-backup-${new Date().toISOString().slice(0, 10)}.json`;
    }

    if (!fileName.toLowerCase().endsWith('.json')) {
        fileName += '.json';
    }

    await saveFile(JSON.stringify(data, null, 2), fileName, 'application/json');
};

export const importData = async (file: File, password?: string) => {
    const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
    });

    let data = JSON.parse(text);

    if (data.isEncrypted && data.encryptedContent) {
        if (!password) {
            throw new Error("PASSWORD_REQUIRED");
        }
        try {
            const decryptedJSON = await decryptData(data.encryptedContent, password);
            data = JSON.parse(decryptedJSON);
        } catch (e) {
            throw new Error("INVALID_PASSWORD");
        }
    }

    await mergeBackupData(data);
};

export const mergeBackupData = async (data: any) => {
    if (!data.logs || !data.models) {
        throw new Error('Invalid backup file format');
    }

    await db.transaction('rw', db.logs, db.models, db.comments, db.folders, async () => {
        const folderIdMap = new Map<number, number>();

        // Merge Folders first
        if (data.folders) {
            for (const f of data.folders) {
                const oldId = f.id;
                const existing = await db.folders.where('name').equals(f.name).first();

                if (existing) {
                    folderIdMap.set(oldId, existing.id!);
                } else {
                    const { id, ...folderData } = f;
                    folderData.createdAt = typeof f.createdAt === 'string' ? new Date(f.createdAt) : f.createdAt;
                    folderData.updatedAt = typeof f.updatedAt === 'string' ? new Date(f.updatedAt) : f.updatedAt;
                    if (f.pinnedAt) {
                        folderData.pinnedAt = typeof f.pinnedAt === 'string' ? new Date(f.pinnedAt) : f.pinnedAt;
                    }
                    const newId = await db.folders.add(folderData);
                    folderIdMap.set(oldId, newId as number);
                }
            }
        }

        const modelIdMap = new Map<number, number>();

        for (const m of data.models) {
            const oldId = m.id;
            const existing = await db.models.where('name').equals(m.name).first();

            if (existing) {
                modelIdMap.set(oldId, existing.id!);
            } else {
                // Ensure we don't try to add with an ID if it's auto-increment, though we should strip it
                // Actually, let's just strip ID to be safe and let Dexie assign
                const { id, ...modelData } = m;
                const newId = await db.models.add(modelData);
                modelIdMap.set(oldId, newId as number);
            }
        }

        const logIdMap = new Map<number, number>();

        // Get default folder if we still need a fallback
        const defaultFolder = await db.folders.toCollection().first();
        const defaultFolderId = defaultFolder?.id;

        for (const l of data.logs) {
            const oldId = l.id; // Store old ID for mapping comments

            // Hydrate dates first for comparison
            const createdAt = typeof l.createdAt === 'string' ? new Date(l.createdAt) : l.createdAt;

            // Try to find exact match
            const potentialMatches = await db.logs.where('title').equals(l.title).toArray();
            const existingLog = potentialMatches.find(pl => Math.abs(pl.createdAt.getTime() - createdAt.getTime()) < 1000); // 1s tolerance

            if (existingLog) {
                logIdMap.set(oldId, existingLog.id!);
            } else {
                const { id, ...logData } = l;
                logData.createdAt = createdAt;
                logData.updatedAt = typeof l.updatedAt === 'string' ? new Date(l.updatedAt) : l.updatedAt;
                if (l.pinnedAt) {
                    logData.pinnedAt = typeof l.pinnedAt === 'string' ? new Date(l.pinnedAt) : l.pinnedAt;
                }

                // Handle folderId mapping
                if (logData.folderId && folderIdMap.has(logData.folderId)) {
                    logData.folderId = folderIdMap.get(logData.folderId);
                } else if (!logData.folderId) {
                    logData.folderId = defaultFolderId;
                }

                if (logData.modelId !== undefined) {
                    if (modelIdMap.has(logData.modelId)) {
                        logData.modelId = modelIdMap.get(logData.modelId);
                    } else {
                        logData.modelId = undefined;
                    }
                }
                const newId = await db.logs.add(logData);
                logIdMap.set(oldId, newId as number);
            }
        }

        if (data.comments) {
            for (const c of data.comments) {
                const { id, ...commentData } = c;
                commentData.createdAt = typeof c.createdAt === 'string' ? new Date(c.createdAt) : c.createdAt;
                commentData.updatedAt = typeof c.updatedAt === 'string' ? new Date(c.updatedAt) : c.updatedAt;

                if (commentData.logId && logIdMap.has(commentData.logId)) {
                    commentData.logId = logIdMap.get(commentData.logId);

                    // Check for duplicates? Content + Date + LogId
                    const duplicates = await db.comments.where('logId').equals(commentData.logId).toArray();
                    const exists = duplicates.some(d =>
                        d.content === commentData.content &&
                        Math.abs(d.createdAt.getTime() - commentData.createdAt.getTime()) < 1000
                    );

                    if (!exists) {
                        await db.comments.add(commentData);
                    }
                }
            }
        }
    });
};