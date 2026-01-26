import Dexie, { type Table } from 'dexie';

export interface Memo {
    id?: number;
    // bookId was removed in v7
    bookId?: number;
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

export class HandMemoDatabase extends Dexie {
    memos!: Table<Memo>;
    comments!: Table<Comment>;

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
    }
}

export const db = new HandMemoDatabase();

