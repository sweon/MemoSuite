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
    title?: string;
    modelId?: number;
    sourceId?: number;
    bookId?: number;
    pageNumber?: number;
}
/**
 * Thread context that will be passed to the new item page
 */
export interface ThreadContext {
    threadId: string;
    threadOrder: number;
    inheritedFolderId?: number;
    inheritedTags?: string[];
    inheritedModelId?: number;
    inheritedSourceId?: number;
    inheritedBookId?: number;
    inheritedPageNumber?: number;
}
export interface PrepareThreadOptions<T extends ThreadableItem> {
    /** The current item to append to */
    currentItem: T;
    /** The current item's ID */
    currentId: number;
    /** Dexie table instance - using any to avoid complex Dexie type incompatibilities */
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
export declare function prepareThreadForNewItem<T extends ThreadableItem>(options: PrepareThreadOptions<T>): Promise<ThreadContext>;
/**
 * Builds URL for navigating to new item page with thread context
 */
export declare function buildThreadNavigationUrl(basePath: string, context: ThreadContext, additionalParams?: Record<string, string>): string;
/**
 * Extracts thread context from URL search params
 * Returns null if no thread context is present
 */
export declare function extractThreadContext(searchParams: URLSearchParams): ThreadContext | null;
