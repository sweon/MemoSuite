import { db } from '../db';
import { decryptData, encryptData, saveFile, type SyncConflict, type SyncConflictResolver, type SyncResolution } from '@memosuite/shared';

export const getBackupData = async (logIds?: number[], excludeIds?: number[]) => {
    let logs = await db.logs.toArray();
    const models = await db.models.toArray();
    let comments = await db.comments.toArray();
    const folders = await db.folders.toArray();

    if (logIds && logIds.length > 0) {
        logs = logs.filter(l => l.id !== undefined && logIds.includes(l.id));
        comments = comments.filter(c => logIds.includes(c.logId));
    }

    if (excludeIds && excludeIds.length > 0) {
        logs = logs.filter(l => l.id !== undefined && !excludeIds.includes(l.id));
        comments = comments.filter(c => !excludeIds.includes(c.logId));
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

export const mergeBackupData = async (data: any, resolver?: SyncConflictResolver) => {
    if (!data.logs || !data.models) {
        throw new Error('Invalid backup file format');
    }

    const logs = data.logs || [];
    const allLocalFolders = await db.folders.toArray();
    const allLocalLogs = await db.logs.toArray();

    const conflicts: SyncConflict[] = [];
    const logConflictMap = new Map<number, number>();
    const mirrorIds: number[] = [];

    if (resolver) {
        logs.forEach((l: any, index: number) => {
            const createdAt = typeof l.createdAt === 'string' ? new Date(l.createdAt) : l.createdAt;
            const updatedAt = typeof l.updatedAt === 'string' ? new Date(l.updatedAt) : l.updatedAt;

            const existingLog = allLocalLogs.find(pl =>
                pl.title === l.title && Math.abs(pl.createdAt.getTime() - createdAt.getTime()) < 5000
            );

            if (existingLog && l.content !== existingLog.content) {
                conflicts.push({
                    id: l.id,
                    type: 'log',
                    title: l.title,
                    localDate: existingLog.updatedAt,
                    remoteDate: updatedAt,
                    localContent: existingLog.content,
                    remoteContent: l.content
                });
                logConflictMap.set(index, conflicts.length - 1);
            }
        });
    }

    let resolutions: SyncResolution[] = [];
    if (conflicts.length > 0 && resolver) resolutions = await resolver(conflicts);

    await db.transaction('rw', db.logs, db.models, db.comments, db.folders, async () => {
        const localFolderByName = new Map(allLocalFolders.map(f => [f.name, f.id!]));
        const folderIdMap = new Map<number, number>();

        if (data.folders) {
            const newFolderIds = new Set<number>();

            // Pass 1: Create folders and map IDs (ignoring parentId initially)
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

            // Pass 2: Restore hierarchy (update parentId)
            for (const f of data.folders) {
                const currentId = folderIdMap.get(f.id);
                if (!currentId) continue;

                if (f.parentId !== undefined && f.parentId !== null) {
                    const mappedParentId = folderIdMap.get(f.parentId);
                    if (mappedParentId) {
                        const isNew = newFolderIds.has(currentId);

                        // For new folders, always set parent. For existing, only if remote is newer.
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

        const modelIdMap = new Map<number, number>();
        for (const m of data.models) {
            const oldId = m.id;
            const existing = await db.models.where('name').equals(m.name).first();
            if (existing) {
                modelIdMap.set(oldId, existing.id!);
            } else {
                const { id, ...modelData } = m;
                const newId = await db.models.add(modelData);
                modelIdMap.set(oldId, newId as number);
            }
        }

        const logIdMap = new Map<number, number>();
        const defaultFolderId = localFolderByName.get('기본 폴더') || (allLocalFolders.length > 0 ? allLocalFolders[0].id : undefined);

        for (let i = 0; i < logs.length; i++) {
            const l = logs[i];
            const oldId = l.id;
            const createdAt = typeof l.createdAt === 'string' ? new Date(l.createdAt) : l.createdAt;
            const updatedAt = typeof l.updatedAt === 'string' ? new Date(l.updatedAt) : l.updatedAt;

            const existingLog = allLocalLogs.find(pl =>
                pl.title === l.title && Math.abs(pl.createdAt.getTime() - createdAt.getTime()) < 5000
            );

            let targetFolderId = defaultFolderId;
            if (l.folderId) targetFolderId = folderIdMap.get(l.folderId) ?? defaultFolderId;

            const resolution = logConflictMap.has(i) ? resolutions[logConflictMap.get(i)!] : null;

            if (existingLog) {
                if (resolution === 'local') {
                    logIdMap.set(oldId, existingLog.id!);
                    continue;
                }
                if (resolution === 'both') {
                    const { id, ...logData } = l;
                    logData.title = `${l.title} (Synced)`;
                    logData.createdAt = createdAt;
                    logData.updatedAt = updatedAt;
                    logData.folderId = targetFolderId;
                    const mId = l.modelId;
                    if (mId !== undefined && modelIdMap.has(mId)) logData.modelId = modelIdMap.get(mId);
                    else logData.modelId = undefined;
                    const newId = await db.logs.add(logData);
                    logIdMap.set(oldId, newId as number);
                    mirrorIds.push(newId as number);
                    continue;
                }

                logIdMap.set(oldId, existingLog.id!);
                const incomingTime = updatedAt.getTime();
                const localTime = existingLog.updatedAt.getTime();

                if (resolution === 'remote' || incomingTime > localTime) {
                    const updates: any = {
                        folderId: targetFolderId,
                        content: l.content,
                        updatedAt: updatedAt,
                        tags: l.tags,
                        title: l.title
                    };
                    if (l.pinnedAt) updates.pinnedAt = typeof l.pinnedAt === 'string' ? new Date(l.pinnedAt) : l.pinnedAt;
                    if (l.threadId) updates.threadId = l.threadId;
                    const mId = l.modelId;
                    if (mId !== undefined && modelIdMap.has(mId)) updates.modelId = modelIdMap.get(mId);
                    await db.logs.update(existingLog.id!, updates);
                    mirrorIds.push(existingLog.id!);
                }
            } else {
                const { id, ...logData } = l;
                logData.createdAt = createdAt;
                logData.updatedAt = updatedAt;
                if (l.pinnedAt) logData.pinnedAt = typeof l.pinnedAt === 'string' ? new Date(l.pinnedAt) : l.pinnedAt;
                logData.folderId = targetFolderId;
                const mId = l.modelId;
                if (mId !== undefined && modelIdMap.has(mId)) logData.modelId = modelIdMap.get(mId);
                else logData.modelId = undefined;
                const newId = await db.logs.add(logData);
                logIdMap.set(oldId, newId as number);
                mirrorIds.push(newId as number);
            }
        }

        if (data.comments) {
            for (const c of data.comments) {
                const { id, ...commentData } = c;
                commentData.createdAt = typeof c.createdAt === 'string' ? new Date(c.createdAt) : c.createdAt;
                commentData.updatedAt = typeof c.updatedAt === 'string' ? new Date(c.updatedAt) : c.updatedAt;
                if (commentData.logId && logIdMap.has(commentData.logId)) {
                    commentData.logId = logIdMap.get(commentData.logId);
                    const duplicates = await db.comments.where('logId').equals(commentData.logId).toArray();
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