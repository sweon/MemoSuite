import Dexie, { type Table } from 'dexie';

export interface Folder {
    id?: number;
    parentId?: number | null;
    name: string;
    isHome?: boolean;
    isReadOnly: boolean;
    excludeFromGlobalSearch: boolean;
    createdAt: Date;
    updatedAt: Date;
    pinnedAt?: Date;
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
    pinnedAt?: Date;
    iconType?: 'text' | 'drawing' | 'spreadsheet' | 'youtube';
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
            const homeId = await foldersTable.add({
                name: '홈',
                parentId: null,
                isHome: true,
                isReadOnly: true,
                excludeFromGlobalSearch: false,
                createdAt: now,
                updatedAt: now
            });

            // Update all existing memos to belong to the default folder
            if (memosTable) {
                await memosTable.toCollection().modify({ folderId: homeId });
            }
        });

        // Seed default data if not exists (Fresh install)
        this.on('populate', () => {
            const now = new Date();
            this.folders.add({
                name: '홈',
                parentId: null,
                isHome: true,
                isReadOnly: true,
                excludeFromGlobalSearch: false,
                createdAt: now,
                updatedAt: now
            });
        });

        // Version 11: Ensure all existing memos have a folderId
        this.version(11).stores({}).upgrade(async tx => {
            const foldersTable = tx.table('folders');
            const memosTable = tx.table('memos');

            let homeFolder = await foldersTable.where('isHome').equals(1).first();
            if (!homeFolder) {
                homeFolder = await foldersTable.toCollection().first();
            }

            if (!homeFolder) {
                const now = new Date();
                const id = await foldersTable.add({
                    name: '홈',
                    parentId: null,
                    isHome: true,
                    isReadOnly: true,
                    excludeFromGlobalSearch: false,
                    createdAt: now,
                    updatedAt: now
                }) as number;
                homeFolder = { id };
            }

            // Update memos that don't have a folderId
            await memosTable.toCollection().modify(memo => {
                if (!memo.folderId) {
                    memo.folderId = homeFolder.id;
                }
            });
        });

        // Version 12: Add pinnedAt to folders and memos
        this.version(12).stores({
            folders: '++id, name, createdAt, updatedAt, pinnedAt',
            memos: '++id, bookId, folderId, title, *tags, createdAt, updatedAt, threadId, type, pinnedAt'
        });

        // Version 13: Add hierarchical folder support
        this.version(13).stores({
            folders: '++id, parentId, name, isHome, createdAt, updatedAt, pinnedAt',
            memos: '++id, bookId, folderId, title, *tags, createdAt, updatedAt, threadId, type, pinnedAt'
        }).upgrade(async tx => {
            const foldersTable = tx.table('folders');
            const folders = await foldersTable.toArray();
            const now = new Date();

            let homeFolder = folders.find(f => f.isHome);
            let homeId: number;

            if (!homeFolder) {
                homeId = await foldersTable.add({
                    name: '홈',
                    parentId: null,
                    isHome: true,
                    isReadOnly: true,
                    excludeFromGlobalSearch: false,
                    createdAt: now,
                    updatedAt: now
                }) as number;
            } else {
                homeId = homeFolder.id!;
            }

            // Move all other folders under home
            for (const folder of folders) {
                if (folder.id !== homeId && !folder.parentId) {
                    await foldersTable.update(folder.id, {
                        parentId: homeId
                    });
                }
            }
        });
    }
}


export const db = new HandMemoDatabase();

