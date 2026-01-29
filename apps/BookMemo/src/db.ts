import Dexie, { type Table } from 'dexie';


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
    createdAt: Date;
    updatedAt: Date;
}

export interface Memo {
    id?: number;
    bookId?: number; // Associated Book
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
}

export class BookMemoDatabase extends Dexie {
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
    }
}

export const db = new BookMemoDatabase();