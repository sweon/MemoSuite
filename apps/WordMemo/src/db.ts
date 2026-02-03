import Dexie, { type Table } from 'dexie';

export interface Folder {
    id?: number;
    name: string;
    isReadOnly: boolean;
    excludeFromGlobalSearch: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface Word {
    id?: number;
    folderId?: number; // Folder reference
    title: string;
    content: string; // Markdown content
    sourceId?: number;
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
    threadId?: string;
    threadOrder?: number;
    isStarred?: number; // 0 or 1 for indexing
}

export interface Source {
    id?: number;
    name: string;
    isDefault?: boolean;
    order?: number;
}

export interface Comment {
    id?: number;
    wordId: number;
    content: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface LLMProvider {
    id?: number;
    name: string;
    url: string;
    order?: number;
}

export interface CommentDraft {
    commentId?: number;
    content: string;
    isNew: boolean;
}

export interface Autosave {
    id?: number;
    originalId?: number; // The ID of the word being edited, if any
    title: string;
    content: string;
    sourceId?: number;
    tags: string[];
    createdAt: Date;
    commentDraft?: CommentDraft;
}

export class WordMemoDatabase extends Dexie {
    folders!: Table<Folder>;
    words!: Table<Word>;
    sources!: Table<Source>;
    comments!: Table<Comment>;
    llmProviders!: Table<LLMProvider>;
    autosaves!: Table<Autosave>;

    constructor() {
        super('WordMemoDB');
        this.version(1).stores({
            logs: '++id, title, *tags, sourceId, createdAt, updatedAt',
            sources: '++id, name',
            comments: '++id, logId, createdAt'
        });

        this.version(2).stores({
            sources: '++id, name, order'
        });

        this.version(3).stores({
            logs: '++id, title, *tags, sourceId, createdAt, updatedAt, threadId'
        });

        this.version(4).stores({
            logs: '++id, title, *tags, sourceId, createdAt, updatedAt, threadId, isStarred'
        });

        this.version(5).stores({
            llmProviders: '++id, name, order'
        });

        this.version(6).stores({
            autosaves: '++id, originalId, createdAt'
        });

        this.version(7).stores({
            autosaves: '++id, originalId, createdAt'
        });

        this.version(8).stores({
            autosaves: '++id, originalId, createdAt'
        });

        // Version 9: Add folders table and folderId to logs
        this.version(9).stores({
            folders: '++id, name, createdAt, updatedAt',
            logs: '++id, folderId, title, *tags, sourceId, createdAt, updatedAt, threadId, isStarred'
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

        // Version 10: Rename logs to words and logId to wordId
        this.version(10).stores({
            words: '++id, folderId, title, *tags, sourceId, createdAt, updatedAt, threadId, isStarred',
            logs: null,
            comments: '++id, wordId, createdAt'
        }).upgrade(async tx => {
            const logsTable = tx.table('logs');
            const wordsTable = tx.table('words');
            const commentsTable = tx.table('comments');

            const logs = await logsTable.toArray();
            if (logs.length > 0) {
                await wordsTable.bulkAdd(logs);
            }

            const comments = await commentsTable.toArray();
            if (comments.length > 0) {
                const updatedComments = comments.map(c => ({
                    ...c,
                    wordId: (c as any).logId,
                    logId: undefined
                }));

                // Clear and re-add to update index if needed, 
                // but since we updated the store definition, bulkPut or bulkAdd with new field is better.
                await commentsTable.clear();
                await commentsTable.bulkAdd(updatedComments as any);
            }
        });
    }
}

export const db = new WordMemoDatabase();

// Seed default data if not exists
db.on('populate', () => {
    db.sources.add({ name: 'Oxford Dictionary', isDefault: true, order: 0 });
    db.sources.add({ name: 'Random', order: 1 });
    db.sources.add({ name: 'GPT-4', order: 2 });
    db.sources.add({ name: 'Claude 3.5 Sonnet', order: 3 });

    db.llmProviders.add({ name: 'ChatGPT', url: 'https://chatgpt.com/', order: 0 });
    db.llmProviders.add({ name: 'Gemini', url: 'https://gemini.google.com/app', order: 1 });
    db.llmProviders.add({ name: 'Claude', url: 'https://claude.ai/', order: 2 });
    db.llmProviders.add({ name: 'Perplexity', url: 'https://www.perplexity.ai/', order: 3 });
    db.llmProviders.add({ name: 'Grok', url: 'https://grok.com/', order: 4 });
});
