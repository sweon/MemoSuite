
/**
 * Checks if a specific storage type is available and accessible.
 */
const checkStorage = (type: 'localStorage' | 'sessionStorage'): boolean => {
    try {
        if (typeof window === 'undefined') return false;
        const storage = window[type];
        if (!storage) return false;

        // Test access
        const testKey = '__storage_test__';
        storage.setItem(testKey, testKey);
        storage.removeItem(testKey);
        return true;
    } catch (e) {
        return false;
    }
};

const storageAvailable = {
    local: checkStorage('localStorage')
};

/**
 * Safe wrapper for localStorage to handle restricted contexts (like some WebView or Private modes) or SSR.
 */
export const safeLocalStorage = {
    getItem: (key: string): string | null => {
        if (!storageAvailable.local) return null;
        try {
            return localStorage.getItem(key);
        } catch (e) {
            console.warn(`safeLocalStorage.getItem failed for key: ${key}`, e);
            return null;
        }
    },
    setItem: (key: string, value: string): void => {
        if (!storageAvailable.local) return;
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            console.warn(`safeLocalStorage.setItem failed for key: ${key}`, e);
        }
    },
    removeItem: (key: string): void => {
        if (!storageAvailable.local) return;
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.warn(`safeLocalStorage.removeItem failed for key: ${key}`, e);
        }
    },
    clear: (): void => {
        if (!storageAvailable.local) return;
        try {
            localStorage.clear();
        } catch (e) {
            console.warn('safeLocalStorage.clear failed', e);
        }
    }
};
