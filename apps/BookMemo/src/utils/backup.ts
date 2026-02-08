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
        const folderIdMap = new Map<number, number>();

        // 0. Merge Folders first
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

        const bookIdMap = new Map<number, number>();
        const memoIdMap = new Map<number, number>();

        // Get default folder explicitly by name
        let defaultFolder = await db.folders.where('name').equals('기본 폴더').first();
        if (!defaultFolder) {
            defaultFolder = await db.folders.toCollection().first();
        }
        const defaultFolderId = defaultFolder?.id;

        // 1. Merge Books first
        for (const b of books) {
            const oldBookId = b.id;

            // Find match by title and author
            const existingBook = await db.books
                .where('title').equals(b.title)
                .filter(eb => eb.author === b.author)
                .first();

            // Resolve target folderId
            let targetFolderId = defaultFolderId;
            if (b.folderId) {
                targetFolderId = folderIdMap.get(b.folderId) ?? defaultFolderId;
            }

            if (existingBook) {
                bookIdMap.set(oldBookId, existingBook.id!);

                // Update progress, status, AND folder
                const updates: any = {
                    folderId: targetFolderId,
                    updatedAt: typeof b.updatedAt === 'string' ? new Date(b.updatedAt) : b.updatedAt
                };
                if ((b.currentPage || 0) > (existingBook.currentPage || 0)) {
                    updates.currentPage = b.currentPage;
                }
                if (b.status === 'completed' && existingBook.status !== 'completed') {
                    updates.status = 'completed';
                    updates.completedDate = typeof b.completedDate === 'string' ? new Date(b.completedDate) : b.completedDate;
                }

                await db.books.update(existingBook.id!, updates);
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

                // Update folder and metadata
                const updates: any = {
                    folderId: targetFolderId,
                    updatedAt: typeof l.updatedAt === 'string' ? new Date(l.updatedAt) : l.updatedAt,
                    tags: l.tags
                };
                if (l.pinnedAt) updates.pinnedAt = typeof l.pinnedAt === 'string' ? new Date(l.pinnedAt) : l.pinnedAt;

                // Map bookId if it was changed during book merge
                if (l.bookId && bookIdMap.has(l.bookId)) {
                    updates.bookId = bookIdMap.get(l.bookId);
                }

                await db.memos.update(existingMemo.id!, updates);
            } else {
                const { id, ...memoData } = l;
                memoData.createdAt = createdAt;
                memoData.updatedAt = typeof l.updatedAt === 'string' ? new Date(l.updatedAt) : l.updatedAt;
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