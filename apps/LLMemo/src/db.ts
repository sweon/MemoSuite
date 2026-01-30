import Dexie, { type Table } from 'dexie';

export interface Log {
    id?: number;
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
    }
}

export const db = new LLMLogDatabase();

// Seed default model if not exists
db.on('populate', () => {
    db.models.add({ name: 'GPT-4', isDefault: true });
    db.models.add({ name: 'Claude 3.5 Sonnet' });
    db.models.add({ name: 'Gemini 1.5 Pro' });
});
