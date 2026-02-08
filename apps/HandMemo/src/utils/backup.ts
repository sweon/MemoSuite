import { db } from '../db';
import { decryptData, encryptData, saveFile } from '@memosuite/shared';

export const getBackupData = async (memoIds?: number[]) => {
    let memos = await db.memos.toArray();
    let comments = await db.comments.toArray();
    const folders = await db.folders.toArray();

    if (memoIds && memoIds.length > 0) {
        memos = memos.filter(l => l.id !== undefined && memoIds.includes(l.id));
        comments = comments.filter(c => memoIds.includes(c.memoId));
        // Keep all folders to ensure references work, and empty folders are synced in full backup
    }

    return {
        version: 1,
        timestamp: new Date().toISOString(),
        memos,
        comments,
        folders
    };
};

export const exportData = async (selectedMemoIds?: number[], customFileName?: string, password?: string) => {
    let data: any = await getBackupData(selectedMemoIds);

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
        fileName = selectedMemoIds && selectedMemoIds.length > 0
            ? `handmemo-partial-${new Date().toISOString().slice(0, 10)}.json`
            : `handmemo-backup-${new Date().toISOString().slice(0, 10)}.json`;
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
    if (!data.memos && !data.logs && !data.books) {
        throw new Error('Invalid backup file format');
    }

    const memos = data.memos || data.logs || []; // Support legacy migration if needed, but primarily memos

    await db.transaction('rw', db.memos, db.comments, db.folders, async () => {
        const folderIdMap = new Map<number, number>();

        // Pre-fetch folders for performance
        const allLocalFolders = await db.folders.toArray();
        const localFolderByName = new Map(allLocalFolders.map(f => [f.name, f.id]));

        // Merge Folders first
        if (data.folders) {
            for (const f of data.folders) {
                const oldId = f.id;
                const existingId = localFolderByName.get(f.name);

                if (existingId) {
                    folderIdMap.set(oldId, existingId);
                } else {
                    const { id: _, ...folderData } = f;
                    const newId = await db.folders.add(folderData);
                    folderIdMap.set(oldId, newId as number);
                    localFolderByName.set(f.name, newId as number);
                }
            }
        }

        const memoIdMap = new Map<number, number>();

        // Resolve default folder ID safely from our pre-fetched map
        const defaultFolderId = localFolderByName.get('기본 폴더') || (allLocalFolders.length > 0 ? allLocalFolders[0].id : undefined);

        for (const l of memos) {
            const oldId = l.id;
            const createdAt = typeof l.createdAt === 'string' ? new Date(l.createdAt) : l.createdAt;

            // Try to find exact match
            const potentialMatches = await db.memos.where('title').equals(l.title).toArray();
            let existingMemo = potentialMatches.find(pl => Math.abs(pl.createdAt.getTime() - createdAt.getTime()) < 5000); // 5s tolerance

            // Resolve target folderId
            let targetFolderId = defaultFolderId;
            if (l.folderId) {
                targetFolderId = folderIdMap.get(l.folderId) ?? defaultFolderId;
            }

            if (existingMemo) {
                memoIdMap.set(oldId, existingMemo.id!);

                // Update folder and metadata even if it exists, to sync moves/changes
                const updates: any = {
                    folderId: targetFolderId,
                    updatedAt: typeof l.updatedAt === 'string' ? new Date(l.updatedAt) : l.updatedAt,
                    tags: l.tags
                };
                if (l.pinnedAt) updates.pinnedAt = typeof l.pinnedAt === 'string' ? new Date(l.pinnedAt) : l.pinnedAt;

                await db.memos.update(existingMemo.id!, updates);
            } else {
                const { id, ...memoData } = l;
                memoData.createdAt = createdAt;
                memoData.updatedAt = typeof l.updatedAt === 'string' ? new Date(l.updatedAt) : l.updatedAt;
                if (l.pinnedAt) {
                    memoData.pinnedAt = typeof l.pinnedAt === 'string' ? new Date(l.pinnedAt) : l.pinnedAt;
                }

                // Apply mapped folderId
                memoData.folderId = targetFolderId;

                // Remove bookId if present as we are detaching from books
                delete memoData.bookId;

                const newId = await db.memos.add(memoData);
                memoIdMap.set(oldId, newId as number);
            }
        }

        // Merge Comments
        if (data.comments) {
            for (const c of data.comments) {
                const { id, ...commentData } = c;
                commentData.createdAt = typeof c.createdAt === 'string' ? new Date(c.createdAt) : c.createdAt;
                commentData.updatedAt = typeof c.updatedAt === 'string' ? new Date(c.updatedAt) : c.updatedAt;

                const oldOwnerId = c.memoId !== undefined ? c.memoId : c.logId;

                if (oldOwnerId && memoIdMap.has(oldOwnerId)) {
                    commentData.memoId = memoIdMap.get(oldOwnerId);
                    delete commentData.logId;

                    const duplicates = await db.comments.where('memoId').equals(commentData.memoId).toArray();
                    const exists = duplicates.some(d =>
                        d.content === commentData.content &&
                        Math.abs(d.createdAt.getTime() - commentData.createdAt.getTime()) < 5000
                    );

                    if (!exists) {
                        await db.comments.add(commentData);
                    }
                }
            }
        }
    });
};