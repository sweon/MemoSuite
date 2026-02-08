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
        // Optimize folder mapping by pre-fetching
        const allLocalFolders = await db.folders.toArray();
        const localFolderByName = new Map(allLocalFolders.map(f => [f.name, f.id!]));
        const folderIdMap = new Map<number, number>();
        const sourceIdMap = new Map<number, number>();

        if (data.folders) {
            for (const f of data.folders) {
                const oldId = f.id;
                const existingId = localFolderByName.get(f.name);

                // Hydrate dates for folders
                const createdAt = typeof f.createdAt === 'string' ? new Date(f.createdAt) : f.createdAt;
                const updatedAt = typeof f.updatedAt === 'string' ? new Date(f.updatedAt) : f.updatedAt;

                if (existingId) {
                    folderIdMap.set(oldId, existingId);
                    // Sync folder properties (color/pin/dates)
                    const folderUpdates: any = {
                        color: f.color,
                        updatedAt: updatedAt
                    };
                    if (f.pinnedAt) folderUpdates.pinnedAt = typeof f.pinnedAt === 'string' ? new Date(f.pinnedAt) : f.pinnedAt;
                    await db.folders.update(existingId, folderUpdates);
                } else {
                    const { id: _, ...folderData } = f;
                    folderData.createdAt = createdAt;
                    folderData.updatedAt = updatedAt;
                    const newId = await db.folders.add(folderData);
                    folderIdMap.set(oldId, newId as number);
                    localFolderByName.set(f.name, newId as number);
                }
            }
        }

        if (data.sources) {
            for (const s of data.sources) {
                const oldId = s.id;
                const existing = await db.sources.where('url').equals(s.url).first();
                if (existing) {
                    sourceIdMap.set(oldId, existing.id!);
                } else {
                    const { id, ...sourceData } = s;
                    sourceData.createdAt = typeof s.createdAt === 'string' ? new Date(s.createdAt) : s.createdAt;
                    sourceData.updatedAt = typeof s.updatedAt === 'string' ? new Date(s.updatedAt) : s.updatedAt;
                    const newId = await db.sources.add(sourceData);
                    sourceIdMap.set(oldId, newId as number);
                }
            }
        }

        const wordIdMap = new Map<number, number>();

        // Resolve default folder ID safely from our pre-fetched map
        const defaultFolderId = localFolderByName.get('기본 폴더') || (allLocalFolders.length > 0 ? allLocalFolders[0].id : undefined);

        for (const l of data.logs) {
            const oldId = l.id;
            const createdAt = typeof l.createdAt === 'string' ? new Date(l.createdAt) : l.createdAt;
            const updatedAt = typeof l.updatedAt === 'string' ? new Date(l.updatedAt) : l.updatedAt;

            // Duplicate detection: Title + approximate CreatedAt
            const potentialMatches = await db.words.where('title').equals(l.title).toArray();
            const existingWord = potentialMatches.find(pl =>
                Math.abs(pl.createdAt.getTime() - createdAt.getTime()) < 5000
            );

            // Resolve target folderId
            let targetFolderId = defaultFolderId;
            if (l.folderId) {
                targetFolderId = folderIdMap.get(l.folderId) ?? defaultFolderId;
            }

            if (existingWord) {
                wordIdMap.set(oldId, existingWord.id!);

                // Update content and metadata if incoming is newer
                const incomingTime = updatedAt.getTime();
                const localTime = existingWord.updatedAt.getTime();

                if (incomingTime > localTime || l.content !== existingWord.content || targetFolderId !== existingWord.folderId) {
                    const updates: any = {
                        folderId: targetFolderId,
                        content: l.content, // Crucial: sync content changes!
                        updatedAt: updatedAt,
                        tags: l.tags,
                        title: l.title // Even title can be synced if changed with same createdAt
                    };
                    if (l.pinnedAt) updates.pinnedAt = typeof l.pinnedAt === 'string' ? new Date(l.pinnedAt) : l.pinnedAt;

                    const sId = l.sourceId !== undefined ? l.sourceId : l.modelId;
                    if (sId !== undefined && sourceIdMap.has(sId)) {
                        updates.sourceId = sourceIdMap.get(sId);
                    }

                    if (l.isStarred !== undefined) {
                        updates.isStarred = l.isStarred;
                    }

                    await db.words.update(existingWord.id!, updates);
                }
            } else {
                const { id, ...logData } = l;
                logData.createdAt = createdAt;
                logData.updatedAt = typeof l.updatedAt === 'string' ? new Date(l.updatedAt) : l.updatedAt;
                if (l.pinnedAt) {
                    logData.pinnedAt = typeof l.pinnedAt === 'string' ? new Date(l.pinnedAt) : l.pinnedAt;
                }

                // Apply mapped folderId
                logData.folderId = targetFolderId;

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