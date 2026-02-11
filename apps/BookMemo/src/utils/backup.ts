import { db } from '../db';
import { decryptData, encryptData, saveFile, type SyncConflict, type SyncConflictResolver, type SyncResolution } from '@memosuite/shared';

export const getBackupData = async (memoIds?: number[], excludeIds?: number[]) => {
    let memos = await db.memos.toArray();
    let comments = await db.comments.toArray();
    let books = await db.books.toArray();
    const folders = await db.folders.toArray();

    if (memoIds && memoIds.length > 0) {
        memos = memos.filter(l => l.id !== undefined && memoIds.includes(l.id));
        comments = comments.filter(c => memoIds.includes(c.memoId));
        const bookIds = new Set(memos.map(m => m.bookId).filter(Boolean));
        books = books.filter(b => bookIds.has(b.id!));
    }

    if (excludeIds && excludeIds.length > 0) {
        memos = memos.filter(l => l.id !== undefined && !excludeIds.includes(l.id));
        comments = comments.filter(c => c.memoId !== undefined && !excludeIds.includes(c.memoId));
        // Note: books are usually small and shared if their memos are shared. 
        // We can exclude books too if they were just synced, but filtering by memos is primary.
    }

    return {
        version: 1,
        timestamp: new Date().toISOString(),
        books,
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
            ? `bookmemo-partial-${new Date().toISOString().slice(0, 10)}.json`
            : `bookmemo-backup-${new Date().toISOString().slice(0, 10)}.json`;
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
    if (!data.memos && !data.logs && !data.books) {
        throw new Error('Invalid backup file format');
    }

    const books = data.books || [];
    const memos = data.memos || data.logs || [];
    const allLocalFolders = await db.folders.toArray();
    const allLocalMemos = await db.memos.toArray();
    const allLocalBooks = await db.books.toArray();

    const conflicts: SyncConflict[] = [];
    const memoConflictMap = new Map<number, number>();
    const mirrorIds: number[] = [];

    if (resolver) {
        memos.forEach((l: any, index: number) => {
            const createdAt = typeof l.createdAt === 'string' ? new Date(l.createdAt) : l.createdAt;
            const updatedAt = typeof l.updatedAt === 'string' ? new Date(l.updatedAt) : l.updatedAt;

            const existingMemo = allLocalMemos.find(pl =>
                pl.title === l.title && Math.abs(pl.createdAt.getTime() - createdAt.getTime()) < 5000
            );

            if (existingMemo && l.content !== existingMemo.content) {
                conflicts.push({
                    id: l.id,
                    type: 'memo',
                    title: l.title,
                    localDate: existingMemo.updatedAt,
                    remoteDate: updatedAt,
                    localContent: existingMemo.content,
                    remoteContent: l.content
                });
                memoConflictMap.set(index, conflicts.length - 1);
            }
        });
    }

    let resolutions: SyncResolution[] = [];
    if (conflicts.length > 0 && resolver) resolutions = await resolver(conflicts);

    await db.transaction('rw', db.books, db.memos, db.comments, db.folders, async () => {
        const localFolderByName = new Map(allLocalFolders.map(f => [f.name, f.id!]));
        const folderIdMap = new Map<number, number>();

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

        const bookIdMap = new Map<number, number>();
        const memoIdMap = new Map<number, number>();
        const defaultFolderId = localFolderByName.get('기본 폴더') || (allLocalFolders.length > 0 ? allLocalFolders[0].id : undefined);

        for (const b of books) {
            const oldBookId = b.id;
            const createdAt = typeof b.createdAt === 'string' ? new Date(b.createdAt) : b.createdAt;
            const updatedAt = typeof b.updatedAt === 'string' ? new Date(b.updatedAt) : b.updatedAt;

            const existingBook = allLocalBooks.find(pb =>
                pb.title === b.title && pb.author === b.author && Math.abs(pb.createdAt.getTime() - createdAt.getTime()) < 5000
            );

            let targetFolderId = defaultFolderId;
            if (b.folderId) targetFolderId = folderIdMap.get(b.folderId) ?? defaultFolderId;

            if (existingBook) {
                bookIdMap.set(oldBookId, existingBook.id!);
                const incomingTime = updatedAt.getTime();
                const localTime = existingBook.updatedAt.getTime();

                if (incomingTime > localTime) {
                    const updates: any = { folderId: targetFolderId, updatedAt };
                    if ((b.currentPage || 0) > (existingBook.currentPage || 0)) updates.currentPage = b.currentPage;
                    if (b.status === 'completed' && existingBook.status !== 'completed') {
                        updates.status = 'completed';
                        updates.completedDate = typeof b.completedDate === 'string' ? new Date(b.completedDate) : b.completedDate;
                    }
                    if (b.pinnedAt) updates.pinnedAt = typeof b.pinnedAt === 'string' ? new Date(b.pinnedAt) : b.pinnedAt;
                    await db.books.update(existingBook.id!, updates);
                }
            } else {
                const { id, ...bookData } = b;
                bookData.startDate = typeof b.startDate === 'string' ? new Date(b.startDate) : b.startDate;
                bookData.createdAt = createdAt;
                bookData.updatedAt = updatedAt;
                if (b.completedDate) bookData.completedDate = typeof b.completedDate === 'string' ? new Date(b.completedDate) : b.completedDate;
                if (b.pinnedAt) bookData.pinnedAt = typeof b.pinnedAt === 'string' ? new Date(b.pinnedAt) : b.pinnedAt;
                bookData.folderId = targetFolderId;
                const newBookId = await db.books.add(bookData);
                bookIdMap.set(oldBookId, newBookId as number);
            }
        }

        for (let i = 0; i < memos.length; i++) {
            const l = memos[i];
            const oldId = l.id;
            const createdAt = typeof l.createdAt === 'string' ? new Date(l.createdAt) : l.createdAt;
            const updatedAt = typeof l.updatedAt === 'string' ? new Date(l.updatedAt) : l.updatedAt;

            const existingMemo = allLocalMemos.find(pl =>
                pl.title === l.title && Math.abs(pl.createdAt.getTime() - createdAt.getTime()) < 5000
            );

            let targetFolderId = defaultFolderId;
            if (l.folderId) targetFolderId = folderIdMap.get(l.folderId) ?? defaultFolderId;

            const resolution = memoConflictMap.has(i) ? resolutions[memoConflictMap.get(i)!] : null;

            if (existingMemo) {
                if (resolution === 'local') {
                    memoIdMap.set(oldId, existingMemo.id!);
                    continue;
                }
                if (resolution === 'both') {
                    const { id, ...memoData } = l;
                    memoData.title = `${l.title} (Synced)`;
                    memoData.createdAt = createdAt;
                    memoData.updatedAt = updatedAt;
                    memoData.folderId = targetFolderId;
                    if (l.bookId && bookIdMap.has(l.bookId)) memoData.bookId = bookIdMap.get(l.bookId);
                    const newId = await db.memos.add(memoData);
                    memoIdMap.set(oldId, newId as number);
                    mirrorIds.push(newId as number);
                    continue;
                }

                memoIdMap.set(oldId, existingMemo.id!);
                const incomingTime = updatedAt.getTime();
                const localTime = existingMemo.updatedAt.getTime();

                if (resolution === 'remote' || incomingTime > localTime) {
                    const updates: any = {
                        folderId: targetFolderId,
                        content: l.content,
                        updatedAt: updatedAt,
                        tags: l.tags,
                        title: l.title
                    };
                    if (l.pinnedAt) updates.pinnedAt = typeof l.pinnedAt === 'string' ? new Date(l.pinnedAt) : l.pinnedAt;
                    if (l.bookId && bookIdMap.has(l.bookId)) updates.bookId = bookIdMap.get(l.bookId);
                    await db.memos.update(existingMemo.id!, updates);
                    mirrorIds.push(existingMemo.id!);
                }
            } else {
                const { id, ...memoData } = l;
                memoData.createdAt = createdAt;
                memoData.updatedAt = updatedAt;
                if (l.pinnedAt) memoData.pinnedAt = typeof l.pinnedAt === 'string' ? new Date(l.pinnedAt) : l.pinnedAt;
                if (l.bookId && bookIdMap.has(l.bookId)) memoData.bookId = bookIdMap.get(l.bookId);
                memoData.folderId = targetFolderId;
                const newId = await db.memos.add(memoData);
                memoIdMap.set(oldId, newId as number);
                mirrorIds.push(newId as number);
            }
        }

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
                    if (!exists) await db.comments.add(commentData);
                }
            }
        }
    });

    return mirrorIds;
};