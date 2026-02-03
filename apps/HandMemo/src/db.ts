import Dexie, { type Table } from 'dexie';

export interface Folder {
    id?: number;
    name: string;
    isReadOnly: boolean;
    excludeFromGlobalSearch: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface Memo {
    id?: number;
    // bookId was removed in v7
    bookId?: number;
    folderId?: number; // Folder reference
    title: string;
    content: string; // Markdown content
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
    threadId?: string;
    threadOrder?: number;
    type?: 'normal' | 'progress';
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
    title: string;
    content: string;
    tags: string[];
    createdAt: Date;
    commentDraft?: CommentDraft;
}

export class HandMemoDatabase extends Dexie {
    folders!: Table<Folder>;
    memos!: Table<Memo>;
    comments!: Table<Comment>;
    autosaves!: Table<Autosave>;

    constructor() {
        super('HandMemoDB');
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
            memos: '++id, bookId, title, *tags, modelId, createdAt, updatedAt, threadId'
        });

        this.version(5).stores({
            memos: '++id, bookId, title, *tags, modelId, createdAt, updatedAt, threadId, type'
        });

        this.version(6).stores({
            memos: '++id, bookId, title, *tags, createdAt, updatedAt, threadId, type',
            models: null // Delete the table
        });

        this.version(7).stores({
            books: null
        });

        this.version(8).stores({
            autosaves: '++id, title, originalId, createdAt'
        });

        this.version(9).stores({
            autosaves: '++id, title, originalId, createdAt'
        });

        // Version 10: Add folders table and folderId to memos
        this.version(10).stores({
            folders: '++id, name, createdAt, updatedAt',
            memos: '++id, bookId, folderId, title, *tags, createdAt, updatedAt, threadId, type'
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
    }
}

export const db = new HandMemoDatabase();

