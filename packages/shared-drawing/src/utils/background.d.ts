import { fabric } from 'fabric';
export type BackgroundType = 'none' | 'lines' | 'grid' | 'dots' | 'english' | 'music' | 'image';
export type BackgroundColorType = 'gray' | 'beige' | 'blue';
export interface BackgroundConfig {
    type: BackgroundType;
    size: number;
    bundleGap: number;
    intensity: number;
    colorType: BackgroundColorType;
    opacity: number;
    imageOpacity: number;
    imageData?: string;
}
export declare const calculateBackgroundColor: (type: BackgroundColorType, intensity: number) => string;
export declare const createBackgroundPattern: (type: BackgroundType, paperColor: string, opacity: number, patternSize: number, transparent?: boolean, bundleGap?: number, backgroundImage?: HTMLImageElement | HTMLCanvasElement, imageOpacity?: number, targetWidth?: number) => fabric.Pattern;
