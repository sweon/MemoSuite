/**
 * Checks if a specific storage type is available and accessible.
 */
const checkStorage = (type) => {
    try {
        if (typeof window === 'undefined')
            return false;
        const storage = window[type];
        if (!storage)
            return false;
        // Test access
        const testKey = '__storage_test__';
        storage.setItem(testKey, testKey);
        storage.removeItem(testKey);
        return true;
    }
    catch (e) {
        return false;
    }
};
const storageAvailable = {
    local: checkStorage('localStorage'),
    session: checkStorage('sessionStorage')
};
/**
 * Safe wrapper for localStorage to handle restricted contexts (like some WebView or Private modes) or SSR.
 */
export const safeLocalStorage = {
    getItem: (key) => {
        if (!storageAvailable.local)
            return null;
        try {
            return localStorage.getItem(key);
        }
        catch (e) {
            console.warn(`safeLocalStorage.getItem failed for key: ${key}`, e);
            return null;
        }
    },
    setItem: (key, value) => {
        if (!storageAvailable.local)
            return;
        try {
            localStorage.setItem(key, value);
        }
        catch (e) {
            console.warn(`safeLocalStorage.setItem failed for key: ${key}`, e);
        }
    },
    removeItem: (key) => {
        if (!storageAvailable.local)
            return;
        try {
            localStorage.removeItem(key);
        }
        catch (e) {
            console.warn(`safeLocalStorage.removeItem failed for key: ${key}`, e);
        }
    },
    clear: () => {
        if (!storageAvailable.local)
            return;
        try {
            localStorage.clear();
        }
        catch (e) {
            console.warn('safeLocalStorage.clear failed', e);
        }
    }
};
/**
 * Requests that the browser keeps the storage for the origin persistent.
 * This helps prevent data eviction when disk space is low.
 */
export const requestPersistence = async () => {
    try {
        if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
            const isPersisted = await navigator.storage.persist();
            console.log(`Storage persistence ${isPersisted ? 'granted' : 'denied'}`);
            return isPersisted;
        }
        return false;
    }
    catch (e) {
        console.warn('Failed to request storage persistence', e);
        return false;
    }
};
/**
 * Checks if the storage for the origin is persistent.
 */
export const isStoragePersisted = async () => {
    try {
        if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persisted) {
            return await navigator.storage.persisted();
        }
        return false;
    }
    catch (e) {
        return false;
    }
};
/**
 * Safe wrapper for sessionStorage.
 */
export const safeSessionStorage = {
    getItem: (key) => {
        if (!storageAvailable.session)
            return null;
        try {
            return sessionStorage.getItem(key);
        }
        catch (e) {
            console.warn(`safeSessionStorage.getItem failed for key: ${key}`, e);
            return null;
        }
    },
    setItem: (key, value) => {
        if (!storageAvailable.session)
            return;
        try {
            sessionStorage.setItem(key, value);
        }
        catch (e) {
            console.warn(`safeSessionStorage.setItem failed for key: ${key}`, e);
        }
    },
    removeItem: (key) => {
        if (!storageAvailable.session)
            return;
        try {
            sessionStorage.removeItem(key);
        }
        catch (e) {
            console.warn(`safeSessionStorage.removeItem failed for key: ${key}`, e);
        }
    },
    clear: () => {
        if (!storageAvailable.session)
            return;
        try {
            sessionStorage.clear();
        }
        catch (e) {
            console.warn('safeSessionStorage.clear failed', e);
        }
    }
};
