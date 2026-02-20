/**
 * Metadata cache for external links/images to avoid refetching and layout shifts.
 */
const IMAGE_METADATA_CACHE_KEY = 'memosuite_image_metadata_cache';
class MetadataCache {
    cache;
    constructor() {
        this.cache = new Map();
        this.load();
    }
    load() {
        try {
            const saved = localStorage.getItem(IMAGE_METADATA_CACHE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                Object.entries(parsed).forEach(([url, meta]) => {
                    this.cache.set(url, meta);
                });
            }
        }
        catch (e) {
            console.error('Failed to load metadata cache', e);
        }
    }
    save() {
        try {
            const data = Object.fromEntries(this.cache);
            localStorage.setItem(IMAGE_METADATA_CACHE_KEY, JSON.stringify(data));
        }
        catch (e) {
            console.error('Failed to save metadata cache', e);
        }
    }
    get(url) {
        return this.cache.get(url);
    }
    async fetchImageMetadata(url) {
        const existing = this.get(url);
        if (existing)
            return existing;
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const meta = {
                    width: img.width,
                    height: img.height,
                    aspectRatio: img.width / img.height,
                    fetchedAt: Date.now()
                };
                this.cache.set(url, meta);
                this.save();
                resolve(meta);
            };
            img.onerror = () => {
                resolve(undefined);
            };
            img.src = url;
        });
    }
}
export const metadataCache = new MetadataCache();
