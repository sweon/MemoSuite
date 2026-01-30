import Dexie, { type Table } from 'dexie';

export interface Log {
    id?: number;
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
    logId: number;
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
    originalId?: number; // The ID of the log being edited, if any
    title: string;
    content: string;
    sourceId?: number;
    tags: string[];
    createdAt: Date;
    commentDraft?: CommentDraft;
}

export class WordMemoDatabase extends Dexie {
    logs!: Table<Log>;
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
