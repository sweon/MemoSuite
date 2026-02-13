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
    pinnedAt?: Date;
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
        }).upgrade(async tx => {
            const foldersTable = tx.table('folders');
            const logsTable = tx.table('logs');

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

            await logsTable.toCollection().modify({ folderId: homeId });
        });
        // Version 8: Ensure all existing logs have a folderId
        this.version(8).stores({}).upgrade(async tx => {
            const foldersTable = tx.table('folders');
            const logsTable = tx.table('logs');

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

            // Update logs that don't have a folderId
            await logsTable.toCollection().modify((log: Log) => {
                if (!log.folderId) {
                    log.folderId = homeFolder.id;
                }
            });
        });

        // Version 9: Add pinnedAt to folders and logs
        this.version(9).stores({
            folders: '++id, name, createdAt, updatedAt, pinnedAt',
            logs: '++id, folderId, title, *tags, modelId, createdAt, updatedAt, threadId, pinnedAt'
        });

        // Version 10: Add hierarchical folder support
        this.version(10).stores({
            folders: '++id, parentId, name, isHome, createdAt, updatedAt, pinnedAt',
            logs: '++id, folderId, title, *tags, modelId, createdAt, updatedAt, threadId, pinnedAt'
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


export const db = new LLMLogDatabase();

// Seed default data if not exists
db.on('populate', () => {
    const now = new Date();
    db.folders.add({
        name: '홈',
        parentId: null,
        isHome: true,
        isReadOnly: true,
        excludeFromGlobalSearch: false,
        createdAt: now,
        updatedAt: now
    });

    db.models.add({ name: 'GPT-4', isDefault: true });
    db.models.add({ name: 'Claude 3.5 Sonnet' });
    db.models.add({ name: 'Gemini 1.5 Pro' });
});

