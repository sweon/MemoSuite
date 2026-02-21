/**
 * Safe wrapper for localStorage to handle restricted contexts (like some WebView or Private modes) or SSR.
 */
export declare const safeLocalStorage: {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
    removeItem: (key: string) => void;
    clear: () => void;
};
/**
 * Requests that the browser keeps the storage for the origin persistent.
 * This helps prevent data eviction when disk space is low.
 */
export declare const requestPersistence: () => Promise<boolean>;
/**
 * Checks if the storage for the origin is persistent.
 */
export declare const isStoragePersisted: () => Promise<boolean>;
/**
 * Safe wrapper for sessionStorage.
 */
export declare const safeSessionStorage: {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
    removeItem: (key: string) => void;
    clear: () => void;
};
