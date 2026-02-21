/**
 * Metadata cache for external links/images to avoid refetching and layout shifts.
 */
interface ImageMetadata {
    width: number;
    height: number;
    aspectRatio: number;
    fetchedAt: number;
}
declare class MetadataCache {
    private cache;
    constructor();
    private load;
    private save;
    get(url: string): ImageMetadata | undefined;
    fetchImageMetadata(url: string): Promise<ImageMetadata | undefined>;
}
export declare const metadataCache: MetadataCache;
export {};
