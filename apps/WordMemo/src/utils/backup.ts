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
    if (!data.logs && !data.memos && !data.books) {
        throw new Error('Invalid backup file format');
    }

    const words = data.logs || data.memos || data.books || [];
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
        const localFolderByName = new Map<string, number>();
        const folderIdMap = new Map<number, number>();

        const getParentName = (parentId: number | null | undefined) => {
            if (!parentId) return '';
            const p = allLocalFolders.find(f => f.id === parentId);
            if (!p) return '';
            if (p.isHome || p.name.normalize('NFC') === '홈' || p.name.normalize('NFC') === '기본 폴더') return '__HOME__';
            return p.name.normalize('NFC');
        };

        allLocalFolders.forEach(f => {
            const name = f.name.normalize('NFC');
            const parentName = getParentName(f.parentId);
            const key = `${parentName}|${name}`;
            if (!localFolderByName.has(key) || f.isHome) {
                localFolderByName.set(key, f.id!);
            }
        });

        const realHome = allLocalFolders.find(f => f.isHome);
        const homeId = realHome?.id;
        if (realHome) {
            localFolderByName.set('|' + realHome.name.normalize('NFC'), realHome.id!);
            localFolderByName.set('__HOME__|' + realHome.name.normalize('NFC'), realHome.id!);
        }

        if (data.folders) {
            const newFolderIds = new Set<number>();
            for (const f of data.folders) {
                const oldId = f.id;
                const normalizedName = f.name.normalize('NFC');
                if ((normalizedName === '기본 폴더' || f.isHome) && homeId) {
                    folderIdMap.set(oldId, homeId);
                    continue;
                }
                const isHomeFolder = (folder: any) => folder.isHome || folder.name.normalize('NFC') === '홈' || folder.name.normalize('NFC') === '기본 폴더';
                let importParentName = '';
                if (f.parentId) {
                    const parentFolder = data.folders.find((df: any) => df.id === f.parentId);
                    if (parentFolder) {
                        importParentName = isHomeFolder(parentFolder) ? '__HOME__' : parentFolder.name.normalize('NFC');
                    }
                }
                const key = `${importParentName}|${normalizedName}`;
                let existingId = localFolderByName.get(key);
                if (!existingId && (normalizedName === '홈' || normalizedName === '기본 폴더')) {
                    existingId = homeId;
                }
                const createdAt = typeof f.createdAt === 'string' ? new Date(f.createdAt) : f.createdAt;
                const updatedAt = typeof f.updatedAt === 'string' ? new Date(f.updatedAt) : f.updatedAt;
                if (existingId) {
                    folderIdMap.set(oldId, existingId);
                    const existingFolder = allLocalFolders.find(lf => lf.id === existingId);
                    const localTime = existingFolder?.updatedAt.getTime() || 0;
                    if (updatedAt.getTime() > localTime) {
                        const folderUpdates: any = { color: f.color, updatedAt };
                        if (f.pinnedAt) folderUpdates.pinnedAt = typeof f.pinnedAt === 'string' ? new Date(f.pinnedAt) : f.pinnedAt;
                        await db.folders.update(existingId, folderUpdates);
                    }
                } else {
                    const { id: _, parentId, ...folderData } = f;
                    folderData.createdAt = createdAt;
                    folderData.updatedAt = updatedAt;
                    const newId = await db.folders.add(folderData);
                    folderIdMap.set(oldId, newId as number);
                    localFolderByName.set(`${importParentName}|${normalizedName}`, newId as number);
                    newFolderIds.add(newId as number);
                    allLocalFolders.push({ ...folderData, id: newId as number, name: f.name, parentId: parentId } as any);
                }
            }
            for (const f of data.folders) {
                const currentId = folderIdMap.get(f.id);
                if (!currentId) continue;
                let targetParentId: number | undefined;
                if (f.parentId !== undefined && f.parentId !== null) targetParentId = folderIdMap.get(f.parentId);
                if (targetParentId === undefined && !f.isHome && homeId && currentId !== homeId) targetParentId = homeId;
                if (targetParentId) {
                    const isNew = newFolderIds.has(currentId);
                    if (isNew) {
                        await db.folders.update(currentId, { parentId: targetParentId });
                    } else {
                        const existingFolder = allLocalFolders.find(lf => lf.id === currentId);
                        const updatedAt = typeof f.updatedAt === 'string' ? new Date(f.updatedAt) : f.updatedAt;
                        const localTime = existingFolder?.updatedAt.getTime() || 0;
                        if (updatedAt.getTime() > localTime) await db.folders.update(currentId, { parentId: targetParentId });
                    }
                }
            }
        }

        const sourceIdMap = new Map<number, number>();
        if (data.sources) {
            for (const s of data.sources) {
                const oldId = s.id;
                let existing;
                if (s.url) existing = await db.sources.where('url').equals(s.url).first();
                else if (s.name) existing = await db.sources.where('name').equals(s.name).first();
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
        let defaultFolderId = localFolderByName.get('__HOME__|기본 폴더'.normalize('NFC')) || localFolderByName.get('|기본 폴더'.normalize('NFC')) || (allLocalFolders.length > 0 ? allLocalFolders[0].id : undefined);
        if (defaultFolderId === undefined) defaultFolderId = homeId;

        for (let i = 0; i < words.length; i++) {
            const l = words[i];
            const oldId = l.id;
            const createdAt = typeof l.createdAt === 'string' ? new Date(l.createdAt) : l.createdAt;
            const updatedAt = typeof l.updatedAt === 'string' ? new Date(l.updatedAt) : l.updatedAt;
            const existingWord = allLocalWords.find(pl =>
                pl.title === l.title && Math.abs(pl.createdAt.getTime() - createdAt.getTime()) < 5000
            );
            let targetFolderId = defaultFolderId;
            const importFolderId = typeof l.folderId === 'string' ? parseInt(l.folderId, 10) : l.folderId;
            if (importFolderId) targetFolderId = folderIdMap.get(importFolderId) ?? defaultFolderId;
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
                    else logData.sourceId = undefined;
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
                        tags: Array.isArray(l.tags) ? l.tags : [],
                        title: l.title
                    };
                    if (l.pinnedAt) updates.pinnedAt = typeof l.pinnedAt === 'string' ? new Date(l.pinnedAt) : l.pinnedAt;
                    const sId = l.sourceId !== undefined ? l.sourceId : l.modelId;
                    if (sId !== undefined && sourceIdMap.has(sId)) updates.sourceId = sourceIdMap.get(sId);
                    if (l.isStarred !== undefined) updates.isStarred = l.isStarred;
                    await db.words.update(existingWord.id!, updates);
                    mirrorIds.push(existingWord.id!);
                } else if (Math.abs(incomingTime - localTime) < 5000 && existingWord.folderId !== targetFolderId) {
                    await db.words.update(existingWord.id!, { folderId: targetFolderId });
                    mirrorIds.push(existingWord.id!);
                } else {
                    mirrorIds.push(existingWord.id!);
                }
            } else {
                const { id, ...logData } = l;
                logData.createdAt = createdAt instanceof Date && !isNaN(createdAt.getTime()) ? createdAt : new Date();
                logData.updatedAt = updatedAt instanceof Date && !isNaN(updatedAt.getTime()) ? updatedAt : new Date();
                if (l.pinnedAt) {
                    const pDate = typeof l.pinnedAt === 'string' ? new Date(l.pinnedAt) : l.pinnedAt;
                    logData.pinnedAt = pDate instanceof Date && !isNaN(pDate.getTime()) ? pDate : undefined;
                }
                logData.folderId = targetFolderId;
                const sId = l.sourceId !== undefined ? l.sourceId : l.modelId;
                const { modelId, ...cleanLogData } = logData;
                if (sId !== undefined && sourceIdMap.has(sId)) (cleanLogData as any).sourceId = sourceIdMap.get(sId);
                cleanLogData.tags = Array.isArray(l.tags) ? l.tags : [];
                const newId = await db.words.add(cleanLogData);
                wordIdMap.set(oldId, newId as number);
                mirrorIds.push(newId as number);
            }
        }
        if (data.comments) {
            for (const c of data.comments) {
                const { id, ...commentData } = c;
                const oldOwnerId = c.wordId !== undefined ? c.wordId : c.logId;
                if (oldOwnerId && wordIdMap.has(oldOwnerId)) {
                    commentData.wordId = wordIdMap.get(oldOwnerId);
                    commentData.createdAt = typeof c.createdAt === 'string' ? new Date(c.createdAt) : c.createdAt;
                    commentData.updatedAt = typeof c.updatedAt === 'string' ? new Date(c.updatedAt) : c.updatedAt;
                    const duplicates = await db.comments.where('wordId').equals(commentData.wordId).toArray();
                    const exists = duplicates.some(d =>
                        d.content === commentData.content &&
                        Math.abs(d.createdAt.getTime() - commentData.createdAt.getTime()) < 5000
                    );
                    if (!exists) await db.comments.add(commentData);
                }
            }
        }
    });
    return mirrorIds;
};