import { db } from '../db';
import { decryptData, encryptData, saveFile } from '@memosuite/shared';

export const getBackupData = async (memoIds?: number[]) => {
    let memos = await db.memos.toArray();
    let comments = await db.comments.toArray();
    let books = await db.books.toArray();
    const folders = await db.folders.toArray();

    if (memoIds && memoIds.length > 0) {
        memos = memos.filter(l => l.id !== undefined && memoIds.includes(l.id));
        comments = comments.filter(c => memoIds.includes(c.memoId));

        // For partial sync, we still might want associated books
        const bookIds = new Set(memos.map(m => m.bookId).filter(Boolean));
        books = books.filter(b => bookIds.has(b.id!));
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

export const mergeBackupData = async (data: any) => {
    if (!data.memos && !data.logs && !data.books) {
        throw new Error('Invalid backup file format');
    }

    const books = data.books || [];
    const memos = data.memos || data.logs || []; // Support legacy migration if needed, but primarily memos

    await db.transaction('rw', db.books, db.memos, db.comments, db.folders, async () => {
        // Optimize folder mapping by pre-fetching
        const allLocalFolders = await db.folders.toArray();
        const localFolderByName = new Map(allLocalFolders.map(f => [f.name, f.id!]));
        const folderIdMap = new Map<number, number>();

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

        const bookIdMap = new Map<number, number>();
        const memoIdMap = new Map<number, number>();

        // Resolve default folder ID safely from our pre-fetched map
        const defaultFolderId = localFolderByName.get('기본 폴더') || (allLocalFolders.length > 0 ? allLocalFolders[0].id : undefined);

        // 1. Merge Books
        for (const b of books) {
            const oldBookId = b.id;
            const createdAt = typeof b.createdAt === 'string' ? new Date(b.createdAt) : b.createdAt;
            const updatedAt = typeof b.updatedAt === 'string' ? new Date(b.updatedAt) : b.updatedAt;

            // Try to find exact match
            const potentialMatches = await db.books.where('title').equals(b.title).toArray();
            let existingBook = potentialMatches.find(pb =>
                pb.author === b.author && Math.abs(pb.createdAt.getTime() - createdAt.getTime()) < 5000
            );

            // Resolve target folderId
            let targetFolderId = defaultFolderId;
            if (b.folderId) {
                targetFolderId = folderIdMap.get(b.folderId) ?? defaultFolderId;
            }

            if (existingBook) {
                bookIdMap.set(oldBookId, existingBook.id!);

                // Update progress, status, AND folder
                const incomingTime = updatedAt.getTime();
                const localTime = existingBook.updatedAt.getTime();

                if (incomingTime > localTime) {
                    const updates: any = {
                        folderId: targetFolderId,
                        updatedAt: updatedAt
                    };
                    if ((b.currentPage || 0) > (existingBook.currentPage || 0)) {
                        updates.currentPage = b.currentPage;
                    }
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
                bookData.createdAt = typeof b.createdAt === 'string' ? new Date(b.createdAt) : b.createdAt;
                bookData.updatedAt = typeof b.updatedAt === 'string' ? new Date(b.updatedAt) : b.updatedAt;
                if (b.completedDate) {
                    bookData.completedDate = typeof b.completedDate === 'string' ? new Date(b.completedDate) : b.completedDate;
                }
                if (b.pinnedAt) {
                    bookData.pinnedAt = typeof b.pinnedAt === 'string' ? new Date(b.pinnedAt) : b.pinnedAt;
                }

                // Apply mapped folderId
                bookData.folderId = targetFolderId;

                const newBookId = await db.books.add(bookData);
                bookIdMap.set(oldBookId, newBookId as number);
            }
        }

        // 2. Merge Memos
        for (const l of memos) {
            const oldId = l.id;
            const createdAt = typeof l.createdAt === 'string' ? new Date(l.createdAt) : l.createdAt;
            const updatedAt = typeof l.updatedAt === 'string' ? new Date(l.updatedAt) : l.updatedAt;

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

                // Update folder and metadata even if it exists, to sync moves/changes/content
                const incomingTime = updatedAt.getTime();
                const localTime = existingMemo.updatedAt.getTime();

                if (incomingTime > localTime || l.content !== existingMemo.content) {
                    const updates: any = {
                        folderId: targetFolderId,
                        content: l.content, // Crucial: sync content changes!
                        updatedAt: updatedAt,
                        tags: l.tags
                    };
                    if (l.pinnedAt) updates.pinnedAt = typeof l.pinnedAt === 'string' ? new Date(l.pinnedAt) : l.pinnedAt;

                    // Map bookId if it was changed during book merge
                    if (l.bookId && bookIdMap.has(l.bookId)) {
                        updates.bookId = bookIdMap.get(l.bookId);
                    }

                    await db.memos.update(existingMemo.id!, updates);
                }
            } else {
                const { id, ...memoData } = l;
                memoData.createdAt = createdAt;
                memoData.updatedAt = updatedAt;
                if (l.pinnedAt) {
                    memoData.pinnedAt = typeof l.pinnedAt === 'string' ? new Date(l.pinnedAt) : l.pinnedAt;
                }

                // Map bookId if it was changed during book merge
                if (l.bookId && bookIdMap.has(l.bookId)) {
                    memoData.bookId = bookIdMap.get(l.bookId);
                }

                // Apply mapped folderId
                memoData.folderId = targetFolderId;

                const newId = await db.memos.add(memoData);
                memoIdMap.set(oldId, newId as number);
            }
        }

        // 3. Merge Comments
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