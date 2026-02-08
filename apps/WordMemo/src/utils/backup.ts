import { db } from '../db';
import { decryptData, encryptData, saveFile } from '@memosuite/shared';

export const getBackupData = async (wordIds?: number[]) => {
    let logs;
    let comments;

    // Use fast index-based retrieval if IDs are provided
    if (wordIds && wordIds.length > 0) {
        logs = await db.words.where('id').anyOf(wordIds).toArray();
        comments = await db.comments.where('wordId').anyOf(wordIds).toArray();
    } else {
        logs = await db.words.toArray();
        comments = await db.comments.toArray();
    }

    const sources = await db.sources.toArray();
    const folders = await db.folders.toArray();

    return {
        version: 1,
        timestamp: new Date().toISOString(),
        logs,
        sources,
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
            ? `wordmemo-partial-${new Date().toISOString().slice(0, 10)}.json`
            : `wordmemo-backup-${new Date().toISOString().slice(0, 10)}.json`;
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
    if (!data.logs || (!data.sources && !data.models)) {
        throw new Error('Invalid backup file format');
    }

    await db.transaction('rw', db.words, db.sources, db.comments, db.folders, async () => {
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

        const sourceIdMap = new Map<number, number>();
        const sourcesToProcess = data.sources || data.models || [];

        for (const s of sourcesToProcess) {
            const oldId = s.id;
            const existing = await db.sources.where('name').equals(s.name).first();

            if (existing) {
                // Update order if provided in backup
                if (s.order !== undefined) {
                    await db.sources.update(existing.id!, { order: s.order });
                }
                sourceIdMap.set(oldId, existing.id!);
            } else {
                const { id, ...sourceData } = s;
                const newId = await db.sources.add(sourceData);
                sourceIdMap.set(oldId, newId as number);
            }
        }

        const wordIdMap = new Map<number, number>();

        // Get default folder if we still need a fallback
        const defaultFolder = await db.folders.toCollection().first();
        const defaultFolderId = defaultFolder?.id;

        for (const l of data.logs) {
            const oldId = l.id;
            const createdAt = typeof l.createdAt === 'string' ? new Date(l.createdAt) : l.createdAt;

            // Duplicate detection: Title + approximate CreatedAt
            const potentialMatches = await db.words.where('title').equals(l.title).toArray();
            const existingLog = potentialMatches.find(pl =>
                Math.abs(pl.createdAt.getTime() - createdAt.getTime()) < 1000
            );

            if (existingLog) {
                wordIdMap.set(oldId, existingLog.id!);
                // Optionally update fields like isStarred if they differ
                if (l.isStarred !== undefined && l.isStarred !== existingLog.isStarred) {
                    await db.words.update(existingLog.id!, { isStarred: l.isStarred });
                }
            } else {
                const { id, ...logData } = l;
                logData.createdAt = createdAt;
                logData.updatedAt = typeof l.updatedAt === 'string' ? new Date(l.updatedAt) : l.updatedAt;
                if (l.pinnedAt) {
                    logData.pinnedAt = typeof l.pinnedAt === 'string' ? new Date(l.pinnedAt) : l.pinnedAt;
                }

                // Handle folderId mapping
                if (logData.folderId) {
                    logData.folderId = folderIdMap.get(logData.folderId) ?? defaultFolderId;
                } else {
                    logData.folderId = defaultFolderId;
                }

                const sId = l.sourceId !== undefined ? l.sourceId : l.modelId;
                if (sId !== undefined && sourceIdMap.has(sId)) {
                    logData.sourceId = sourceIdMap.get(sId);
                }

                // Dexie.add will use the auto-incrementing ID unless specified
                const newId = await db.words.add(logData);
                wordIdMap.set(oldId, newId as number);
            }
        }

        if (data.comments) {
            for (const c of data.comments) {
                const { id, ...commentData } = c;
                if (commentData.wordId && wordIdMap.has(commentData.wordId)) {
                    commentData.wordId = wordIdMap.get(commentData.wordId);
                    commentData.createdAt = typeof c.createdAt === 'string' ? new Date(c.createdAt) : c.createdAt;
                    commentData.updatedAt = typeof c.updatedAt === 'string' ? new Date(c.updatedAt) : c.updatedAt;

                    // Deduplicate comments
                    const duplicates = await db.comments.where('wordId').equals(commentData.wordId).toArray();
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