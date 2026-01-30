/**
 * Metadata cache for external links/images to avoid refetching and layout shifts.
 */

interface ImageMetadata {
    width: number;
    height: number;
    aspectRatio: number;
    fetchedAt: number;
}

const IMAGE_METADATA_CACHE_KEY = 'memosuite_image_metadata_cache';

class MetadataCache {
    private cache: Map<string, ImageMetadata>;

    constructor() {
        this.cache = new Map();
        this.load();
    }

    private load() {
        try {
            const saved = localStorage.getItem(IMAGE_METADATA_CACHE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                Object.entries(parsed).forEach(([url, meta]) => {
                    this.cache.set(url, meta as ImageMetadata);
                });
            }
        } catch (e) {
            console.error('Failed to load metadata cache', e);
        }
    }

    private save() {
        try {
            const data = Object.fromEntries(this.cache);
            localStorage.setItem(IMAGE_METADATA_CACHE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error('Failed to save metadata cache', e);
        }
    }

    public get(url: string): ImageMetadata | undefined {
        return this.cache.get(url);
    }

    public async fetchImageMetadata(url: string): Promise<ImageMetadata | undefined> {
        const existing = this.get(url);
        if (existing) return existing;

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
