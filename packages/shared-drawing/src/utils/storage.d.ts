/**
 * Safe wrapper for localStorage to handle restricted contexts (like some WebView or Private modes) or SSR.
 */
export declare const safeLocalStorage: {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
    removeItem: (key: string) => void;
    clear: () => void;
};
