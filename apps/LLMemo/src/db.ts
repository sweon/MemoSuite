import Dexie, { type Table } from 'dexie';

export interface Folder {
    id?: number;
    name: string;
    isReadOnly: boolean;
    excludeFromGlobalSearch: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface Log {
    id?: number;
    folderId?: number; // Folder reference
    title: string;
    content: string; // Markdown content
    modelId?: number;
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
    threadId?: string;
    threadOrder?: number;
}

export interface Model {
    id?: number;
    name: string;
    isDefault?: boolean;
    order?: number;
}

export interface Comment {
    id?: number;
    logId: number;
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
    modelId?: number;
    tags: string[];
    createdAt: Date;
    commentDraft?: CommentDraft;
}

export class LLMLogDatabase extends Dexie {
    folders!: Table<Folder>;
    logs!: Table<Log>;
    models!: Table<Model>;
    comments!: Table<Comment>;
    autosaves!: Table<Autosave>;

    constructor() {
        super('LLMLogDB');
        this.version(1).stores({
            logs: '++id, title, *tags, modelId, createdAt, updatedAt',
            models: '++id, name',
            comments: '++id, logId, createdAt'
        });

        this.version(2).stores({
            models: '++id, name, order'
        });

        this.version(3).stores({
            logs: '++id, title, *tags, modelId, createdAt, updatedAt, threadId'
        });

        this.version(4).stores({
            autosaves: '++id, title, originalId, createdAt'
        });

        this.version(5).stores({
            autosaves: '++id, title, originalId, createdAt'
        });

        this.version(6).stores({
            autosaves: '++id, title, originalId, createdAt'
        });

        // Version 7: Add folders table and folderId to logs
        this.version(7).stores({
            folders: '++id, name, createdAt, updatedAt',
            logs: '++id, folderId, title, *tags, modelId, createdAt, updatedAt, threadId'
        }).upgrade(async tx => {
            const foldersTable = tx.table('folders');
            const logsTable = tx.table('logs');

            const now = new Date();
            const defaultFolderId = await foldersTable.add({
                name: '기본 폴더',
                isReadOnly: false,
                excludeFromGlobalSearch: false,
                createdAt: now,
                updatedAt: now
            });

            await logsTable.toCollection().modify({ folderId: defaultFolderId });
        });
    }
}

export const db = new LLMLogDatabase();

// Seed default model if not exists
db.on('populate', () => {
    db.models.add({ name: 'GPT-4', isDefault: true });
    db.models.add({ name: 'Claude 3.5 Sonnet' });
    db.models.add({ name: 'Gemini 1.5 Pro' });
});
