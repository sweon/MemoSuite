import Dexie, { type Table } from 'dexie';

export interface Folder {
    id?: number;
    name: string;
    isReadOnly: boolean;
    excludeFromGlobalSearch: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export type BookStatus = 'reading' | 'completed' | 'on_hold';

export interface Book {
    id?: number;
    title: string;
    author?: string;
    totalPages: number;
    startPage?: number; // If starting from middle? usually 0.
    currentPage?: number; // Progress
    startDate: Date;
    completedDate?: Date;
    status: BookStatus;
    coverImage?: string; // Base64 or URL
    folderId?: number; // Folder reference
    createdAt: Date;
    updatedAt: Date;
}

export interface Memo {
    id?: number;
    bookId?: number; // Associated Book
    folderId?: number; // Folder reference
    pageNumber?: number; // Page context
    quote?: string; // Selected text from book
    title: string;
    content: string; // Markdown content
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
    threadId?: string;
    threadOrder?: number;
    type?: 'normal' | 'progress';
    // New fields for ThreadableList support
    order?: number;
    parentId?: number;
}

export interface Comment {
    id?: number;
    memoId: number;
    content: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface CommentDraft {
    commentId?: number;
    content: string;
    isNew: boolean;
}

export interface Autosave {
    id?: number;
    originalId?: number;
    bookId?: number;
    pageNumber?: number;
    quote?: string;
    title: string;
    content: string;
    tags: string[];
    createdAt: Date;
    commentDraft?: CommentDraft;
}

export class BookMemoDatabase extends Dexie {
    folders!: Table<Folder>;
    books!: Table<Book>;
    memos!: Table<Memo>;
    comments!: Table<Comment>;
    autosaves!: Table<Autosave>;

    constructor() {
        super('BookMemoDB');
        this.version(1).stores({
            memos: '++id, title, *tags, modelId, createdAt, updatedAt',
            models: '++id, name',
            comments: '++id, memoId, createdAt'
        });

        this.version(2).stores({
            models: '++id, name, order'
        });

        this.version(3).stores({
            memos: '++id, title, *tags, modelId, createdAt, updatedAt, threadId'
        });

        this.version(4).stores({
            books: '++id, title, status, createdAt',
            memos: '++id, bookId, pageNumber, title, *tags, modelId, createdAt, updatedAt, threadId'
        });

        this.version(5).stores({
            memos: '++id, bookId, pageNumber, title, *tags, modelId, createdAt, updatedAt, threadId, type'
        });

        this.version(6).stores({
            memos: '++id, bookId, pageNumber, title, *tags, createdAt, updatedAt, threadId, type',
            models: null // Delete the table
        });

        // 2026-01-25: Add order and parentId for ThreadableList support
        this.version(7).stores({
            memos: '++id, bookId, pageNumber, title, *tags, createdAt, updatedAt, threadId, type, order, parentId'
        });

        this.version(8).stores({
            autosaves: '++id, originalId, bookId, createdAt'
        });

        this.version(9).stores({
            autosaves: '++id, originalId, bookId, createdAt'
        });

        // Version 10: Add folders table and folderId to memos
        this.version(10).stores({
            folders: '++id, name, createdAt, updatedAt',
            memos: '++id, bookId, folderId, pageNumber, title, *tags, createdAt, updatedAt, threadId, type, order, parentId'
        }).upgrade(async tx => {
            // Create default folder and assign all existing memos to it
            const foldersTable = tx.table('folders');
            const memosTable = tx.table('memos');

            const now = new Date();
            const defaultFolderId = await foldersTable.add({
                name: '기본 폴더',
                isReadOnly: false,
                excludeFromGlobalSearch: false,
                createdAt: now,
                updatedAt: now
            });

            // Update all existing memos to belong to the default folder
            await memosTable.toCollection().modify({ folderId: defaultFolderId });
        });

        // Version 11: Add folderId to books and migrate
        this.version(11).stores({
            books: '++id, folderId, title, status, createdAt',
        }).upgrade(async tx => {
            const foldersTable = tx.table('folders');
            const booksTable = tx.table('books');

            // Find or create default folder
            let defaultFolder = await foldersTable.where('name').equals('기본 폴더').first();
            let defaultFolderId: number;

            if (!defaultFolder) {
                const now = new Date();
                defaultFolderId = await foldersTable.add({
                    name: '기본 폴더',
                    isReadOnly: false,
                    excludeFromGlobalSearch: false,
                    createdAt: now,
                    updatedAt: now
                }) as number;
            } else {
                defaultFolderId = defaultFolder.id!;
            }

            // Update all existing books to belong to the default folder
            await booksTable.toCollection().modify({ folderId: defaultFolderId });
        });
    }
}

export const db = new BookMemoDatabase();

// Seed default data if not exists
db.on('populate', () => {
    const now = new Date();
    db.folders.add({
        name: '기본 폴더',
        isReadOnly: false,
        excludeFromGlobalSearch: false,
        createdAt: now,
        updatedAt: now
    });
});

// Version 12: Ensure all existing books and memos have a folderId
db.version(12).stores({}).upgrade(async tx => {
    const foldersTable = tx.table('folders');
    const booksTable = tx.table('books');
    const memosTable = tx.table('memos');

    let defaultFolder = await foldersTable.toCollection().first();
    if (!defaultFolder) {
        const now = new Date();
        const id = await foldersTable.add({
            name: '기본 폴더',
            isReadOnly: false,
            excludeFromGlobalSearch: false,
            createdAt: now,
            updatedAt: now
        }) as number;
        defaultFolder = { id };
    }

    // Update books that don't have a folderId
    await booksTable.toCollection().modify((book: Book) => {
        if (!book.folderId) {
            book.folderId = defaultFolder.id;
        }
    });

    // Update memos that don't have a folderId
    await memosTable.toCollection().modify((memo: Memo) => {
        if (!memo.folderId) {
            memo.folderId = defaultFolder.id;
        }
    });
});