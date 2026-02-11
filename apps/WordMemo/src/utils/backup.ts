import { db } from '../db';
import { decryptData, encryptData, saveFile, type SyncConflict, type SyncConflictResolver, type SyncResolution } from '@memosuite/shared';

export const getBackupData = async (wordIds?: number[], excludeIds?: number[]) => {
    let logs;
    let comments;

    if (wordIds && wordIds.length > 0) {
        logs = await db.words.where('id').anyOf(wordIds).toArray();
        comments = await db.comments.where('wordId').anyOf(wordIds).toArray();
    } else {
        logs = await db.words.toArray();
        comments = await db.comments.toArray();
    }

    if (excludeIds && excludeIds.length > 0) {
        logs = logs.filter(l => l.id !== undefined && !excludeIds.includes(l.id));
        comments = comments.filter(c => c.wordId !== undefined && !excludeIds.includes(c.wordId));
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

export const mergeBackupData = async (data: any, resolver?: SyncConflictResolver) => {
    if (!data.logs || (!data.sources && !data.models)) {
        throw new Error('Invalid backup file format');
    }

    const words = data.logs || [];
    const allLocalFolders = await db.folders.toArray();
    const allLocalWords = await db.words.toArray();

    const conflicts: SyncConflict[] = [];
    const wordConflictMap = new Map<number, number>();
    const mirrorIds: number[] = [];

    if (resolver) {
        words.forEach((l: any, index: number) => {
            const createdAt = typeof l.createdAt === 'string' ? new Date(l.createdAt) : l.createdAt;
            const updatedAt = typeof l.updatedAt === 'string' ? new Date(l.updatedAt) : l.updatedAt;

            const existingWord = allLocalWords.find(pl =>
                pl.title === l.title && Math.abs(pl.createdAt.getTime() - createdAt.getTime()) < 5000
            );

            if (existingWord && l.content !== existingWord.content) {
                conflicts.push({
                    id: l.id,
                    type: 'word',
                    title: l.title,
                    localDate: existingWord.updatedAt,
                    remoteDate: updatedAt,
                    localContent: existingWord.content,
                    remoteContent: l.content
                });
                wordConflictMap.set(index, conflicts.length - 1);
            }
        });
    }

    let resolutions: SyncResolution[] = [];
    if (conflicts.length > 0 && resolver) resolutions = await resolver(conflicts);

    await db.transaction('rw', db.words, db.sources, db.comments, db.folders, async () => {
        const localFolderByName = new Map(allLocalFolders.map(f => [f.name, f.id!]));
        const folderIdMap = new Map<number, number>();
        const sourceIdMap = new Map<number, number>();

        if (data.folders) {
            const newFolderIds = new Set<number>();

            // Pass 1: Create/Update folders without parentId
            for (const f of data.folders) {
                const oldId = f.id;
                const existingId = localFolderByName.get(f.name);
                const createdAt = typeof f.createdAt === 'string' ? new Date(f.createdAt) : f.createdAt;
                const updatedAt = typeof f.updatedAt === 'string' ? new Date(f.updatedAt) : f.updatedAt;

                if (existingId) {
                    folderIdMap.set(oldId, existingId);
                    const existingFolder = allLocalFolders.find(lf => lf.id === existingId);
                    const localTime = existingFolder?.updatedAt.getTime() || 0;
                    if (updatedAt.getTime() > localTime) {
                        const folderUpdates: any = { color: f.color, updatedAt };
                        if (f.pinnedAt) folderUpdates.pinnedAt = typeof f.pinnedAt === 'string' ? new Date(f.pinnedAt) : f.pinnedAt;
                        // Don't update parentId here
                        await db.folders.update(existingId, folderUpdates);
                    }
                } else {
                    const { id: _, parentId, ...folderData } = f; // Exclude parentId
                    folderData.createdAt = createdAt;
                    folderData.updatedAt = updatedAt;
                    const newId = await db.folders.add(folderData);
                    folderIdMap.set(oldId, newId as number);
                    localFolderByName.set(f.name, newId as number);
                    newFolderIds.add(newId as number);
                }
            }

            // Pass 2: Restore hierarchy
            for (const f of data.folders) {
                const currentId = folderIdMap.get(f.id);
                if (!currentId) continue;

                if (f.parentId !== undefined && f.parentId !== null) {
                    const mappedParentId = folderIdMap.get(f.parentId);
                    if (mappedParentId) {
                        const isNew = newFolderIds.has(currentId);

                        if (isNew) {
                            await db.folders.update(currentId, { parentId: mappedParentId });
                        } else {
                            const existingFolder = allLocalFolders.find(lf => lf.id === currentId);
                            const updatedAt = typeof f.updatedAt === 'string' ? new Date(f.updatedAt) : f.updatedAt;
                            const localTime = existingFolder?.updatedAt.getTime() || 0;

                            if (updatedAt.getTime() > localTime) {
                                await db.folders.update(currentId, { parentId: mappedParentId });
                            }
                        }
                    }
                }
            }
        }

        if (data.sources) {
            for (const s of data.sources) {
                const oldId = s.id;
                const existing = await db.sources.where('url').equals(s.url).first();
                if (existing) sourceIdMap.set(oldId, existing.id!);
                else {
                    const { id, ...sourceData } = s;
                    sourceData.createdAt = typeof s.createdAt === 'string' ? new Date(s.createdAt) : s.createdAt;
                    sourceData.updatedAt = typeof s.updatedAt === 'string' ? new Date(s.updatedAt) : s.updatedAt;
                    const newId = await db.sources.add(sourceData);
                    sourceIdMap.set(oldId, newId as number);
                }
            }
        }

        const wordIdMap = new Map<number, number>();
        let defaultFolderId = localFolderByName.get('기본 폴더') || (allLocalFolders.length > 0 ? allLocalFolders[0].id : undefined);

        // If no default folder found locally, try to use one from the imported folders
        if (defaultFolderId === undefined && folderIdMap.size > 0) {
            defaultFolderId = folderIdMap.values().next().value;
        }

        for (let i = 0; i < words.length; i++) {
            const l = words[i];
            const oldId = l.id;
            const createdAt = typeof l.createdAt === 'string' ? new Date(l.createdAt) : l.createdAt;
            const updatedAt = typeof l.updatedAt === 'string' ? new Date(l.updatedAt) : l.updatedAt;

            const existingWord = allLocalWords.find(pl =>
                pl.title === l.title && Math.abs(pl.createdAt.getTime() - createdAt.getTime()) < 5000
            );

            let targetFolderId = defaultFolderId;
            if (l.folderId) targetFolderId = folderIdMap.get(l.folderId) ?? defaultFolderId;

            const resolution = wordConflictMap.has(i) ? resolutions[wordConflictMap.get(i)!] : null;

            if (existingWord) {
                if (resolution === 'local') {
                    wordIdMap.set(oldId, existingWord.id!);
                    continue;
                }
                if (resolution === 'both') {
                    const { id, ...logData } = l;
                    logData.title = `${l.title} (Synced)`;
                    logData.createdAt = createdAt;
                    logData.updatedAt = updatedAt;
                    logData.folderId = targetFolderId;
                    const sId = l.sourceId !== undefined ? l.sourceId : l.modelId;
                    if (sId !== undefined && sourceIdMap.has(sId)) logData.sourceId = sourceIdMap.get(sId);
                    const newId = await db.words.add(logData);
                    wordIdMap.set(oldId, newId as number);
                    mirrorIds.push(newId as number);
                    continue;
                }

                wordIdMap.set(oldId, existingWord.id!);
                const incomingTime = updatedAt.getTime();
                const localTime = existingWord.updatedAt.getTime();

                if (resolution === 'remote' || incomingTime > localTime) {
                    const updates: any = {
                        folderId: targetFolderId,
                        content: l.content,
                        updatedAt: updatedAt,
                        tags: l.tags,
                        title: l.title
                    };
                    if (l.pinnedAt) updates.pinnedAt = typeof l.pinnedAt === 'string' ? new Date(l.pinnedAt) : l.pinnedAt;
                    const sId = l.sourceId !== undefined ? l.sourceId : l.modelId;
                    if (sId !== undefined && sourceIdMap.has(sId)) updates.sourceId = sourceIdMap.get(sId);
                    if (l.isStarred !== undefined) updates.isStarred = l.isStarred;
                    await db.words.update(existingWord.id!, updates);
                    mirrorIds.push(existingWord.id!);
                }
            } else {
                const { id, ...logData } = l;
                logData.createdAt = createdAt;
                logData.updatedAt = updatedAt;
                if (l.pinnedAt) logData.pinnedAt = typeof l.pinnedAt === 'string' ? new Date(l.pinnedAt) : l.pinnedAt;
                logData.folderId = targetFolderId;
                const sId = l.sourceId !== undefined ? l.sourceId : l.modelId;
                if (sId !== undefined && sourceIdMap.has(sId)) logData.sourceId = sourceIdMap.get(sId);
                const newId = await db.words.add(logData);
                wordIdMap.set(oldId, newId as number);
                mirrorIds.push(newId as number);
            }
        }

        if (data.comments) {
            for (const c of data.comments) {
                const { id, ...commentData } = c;
                if (commentData.wordId && wordIdMap.has(commentData.wordId)) {
                    commentData.wordId = wordIdMap.get(commentData.wordId);
                    commentData.createdAt = typeof c.createdAt === 'string' ? new Date(c.createdAt) : c.createdAt;
                    commentData.updatedAt = typeof c.updatedAt === 'string' ? new Date(c.updatedAt) : c.updatedAt;
                    const duplicates = await db.comments.where('wordId').equals(commentData.wordId).toArray();
                    const exists = duplicates.some(d =>
                        d.content === commentData.content &&
                        Math.abs(d.createdAt.getTime() - commentData.createdAt.getTime()) < 1000
                    );
                    if (!exists) await db.comments.add(commentData);
                }
            }
        }
    });

    return mirrorIds;
};