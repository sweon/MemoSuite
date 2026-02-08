/**
 * Shared thread utilities for creating new items within threads
 * Used by HandMemo, WordMemo, LLMemo, and BookMemo for the "이어서" (Append) functionality
 * 
 * This module provides a navigate-based approach that aligns with sidebar's "새 메모 넣기"
 * pattern, passing thread context via URL parameters and location state.
 */

export interface ThreadableItem {
    id?: number;
    threadId?: string;
    threadOrder?: number;
    folderId?: number;
    tags?: string[];
    createdAt?: Date;
    updatedAt?: Date;
}

/**
 * Thread context that will be passed to the new item page
 */
export interface ThreadContext {
    threadId: string;
    threadOrder: number;
    inheritedFolderId?: number;
    inheritedTags?: string[];
}

export interface PrepareThreadOptions<T extends ThreadableItem> {
    /** The current item to append to */
    currentItem: T;
    /** The current item's ID */
    currentId: number;
    /** Dexie table instance - using any to avoid complex Dexie type incompatibilities */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    table: any;
}

/**
 * Prepares thread context for a new item, updating the current item if needed.
 * 
 * Logic:
 * 1. If currentItem has no threadId → create new threadId, update current item with threadOrder: 0
 * 2. If currentItem has threadId → find max threadOrder in thread, use maxOrder + 1
 * 3. Returns the thread context to be used when creating the new item
 */
export async function prepareThreadForNewItem<T extends ThreadableItem>(
    options: PrepareThreadOptions<T>
): Promise<ThreadContext> {
    const { currentItem, currentId, table } = options;

    let threadId = currentItem.threadId;
    let threadOrder = 0;

    if (!threadId) {
        // Create new thread for current item
        threadId = crypto.randomUUID();
        await table.update(currentId, {
            threadId,
            threadOrder: 0
        });
        threadOrder = 1;
    } else {
        // Find max order in this thread
        const threadItems = await table.where('threadId').equals(threadId).toArray();
        const maxOrder = Math.max(...threadItems.map((item: T) => item.threadOrder || 0));
        threadOrder = maxOrder + 1;
    }

    return {
        threadId,
        threadOrder,
        inheritedFolderId: currentItem.folderId,
        inheritedTags: currentItem.tags || []
    };
}

/**
 * Builds URL for navigating to new item page with thread context
 */
export function buildThreadNavigationUrl(basePath: string, context: ThreadContext, additionalParams?: Record<string, string>): string {
    const params = new URLSearchParams();
    params.set('threadId', context.threadId);
    params.set('threadOrder', String(context.threadOrder));
    if (context.inheritedFolderId !== undefined) {
        params.set('inheritFolderId', String(context.inheritedFolderId));
    }
    if (context.inheritedTags && context.inheritedTags.length > 0) {
        params.set('inheritTags', context.inheritedTags.join(','));
    }
    // Add timestamp to force remount
    params.set('t', String(Date.now()));

    // Add any additional params
    if (additionalParams) {
        Object.entries(additionalParams).forEach(([key, value]) => {
            params.set(key, value);
        });
    }

    return `${basePath}?${params.toString()}`;
}

/**
 * Extracts thread context from URL search params
 * Returns null if no thread context is present
 */
export function extractThreadContext(searchParams: URLSearchParams): ThreadContext | null {
    const threadId = searchParams.get('threadId');
    const threadOrderStr = searchParams.get('threadOrder');

    if (!threadId || threadOrderStr === null) {
        return null;
    }

    const threadOrder = parseInt(threadOrderStr, 10);
    if (isNaN(threadOrder)) {
        return null;
    }

    const inheritFolderIdStr = searchParams.get('inheritFolderId');
    const inheritTagsStr = searchParams.get('inheritTags');

    return {
        threadId,
        threadOrder,
        inheritedFolderId: inheritFolderIdStr ? parseInt(inheritFolderIdStr, 10) : undefined,
        inheritedTags: inheritTagsStr ? inheritTagsStr.split(',').filter(Boolean) : undefined
    };
}
