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

export const calculateBackgroundColor = (type: BackgroundColorType, intensity: number) => {
    const factor = intensity / 100;
    if (type === 'gray') {
        const val = Math.round(255 - (255 - 189) * factor);
        return `rgb(${val}, ${val}, ${val})`;
    } else if (type === 'beige') {
        const r = Math.round(255 - (255 - 232) * factor);
        const g = Math.round(255 - (255 - 228) * factor);
        const b = Math.round(255 - (255 - 201) * factor);
        return `rgb(${r}, ${g}, ${b})`;
    } else {
        // blue
        const r = Math.round(255 - (255 - 201) * factor);
        const g = Math.round(255 - (255 - 225) * factor);
        const b = Math.round(255 - (255 - 232) * factor);
        return `rgb(${r}, ${g}, ${b})`;
    }
};

export const createBackgroundPattern = (
    type: BackgroundType,
    paperColor: string,
    opacity: number,
    patternSize: number,
    transparent: boolean = false,
    bundleGap: number = 1,
    backgroundImage?: HTMLImageElement | HTMLCanvasElement,
    imageOpacity: number = 1.0,
    targetWidth?: number
) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        return new fabric.Pattern({
            source: document.createElement('canvas') as any,
            repeat: 'repeat'
        });
    }

    if (type === 'image' && backgroundImage) {
        const imgWidth = (backgroundImage as any).width || 100;
        const imgHeight = (backgroundImage as any).height || 100;

        const displayWidth = targetWidth || imgWidth;
        const scale = displayWidth / imgWidth;
        const displayHeight = imgHeight * scale;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = displayWidth;
        tempCanvas.height = displayHeight;
        const tempCtx = tempCanvas.getContext('2d');

        if (tempCtx) {
            tempCtx.globalAlpha = imageOpacity;
            tempCtx.drawImage(backgroundImage, 0, 0, displayWidth, displayHeight);

            return new fabric.Pattern({
                source: tempCanvas as any,
                repeat: 'no-repeat'
            });
        }

        return new fabric.Pattern({
            source: backgroundImage as any,
            repeat: 'no-repeat'
        });
    }

    const size = patternSize;
    let height = size;

    if (type === 'english') {
        const lineSpacing = size / 4.5;
        const bundleHeight = lineSpacing * 3;
        const baseTotalHeight = bundleHeight * 1.5;
        height = baseTotalHeight * bundleGap;
    } else if (type === 'music') {
        const lineSpacing = size / 8;
        const bundleHeight = lineSpacing * 4;
        const baseTotalHeight = bundleHeight * 1.8;
        height = baseTotalHeight * bundleGap;
    }

    canvas.width = Math.ceil(size);
    canvas.height = Math.ceil(height);

    if (!transparent) {
        ctx.fillStyle = paperColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (type !== 'none') {
        ctx.strokeStyle = `rgba(0, 0, 0, ${opacity})`;
        ctx.lineWidth = 1;

        if (type === 'lines') {
            ctx.beginPath();
            ctx.moveTo(0, size - 0.5);
            ctx.lineTo(size, size - 0.5);
            ctx.stroke();
        } else if (type === 'grid') {
            ctx.beginPath();
            ctx.moveTo(0, size - 0.5);
            ctx.lineTo(size, size - 0.5);
            ctx.moveTo(size - 0.5, 0);
            ctx.lineTo(size - 0.5, size);
            ctx.stroke();
        } else if (type === 'dots') {
            ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
            ctx.beginPath();
            ctx.arc(size - 0.5, size - 0.5, 1, 0, Math.PI * 2);
            ctx.fill();
        } else if (type === 'english') {
            const lineSpacing = size / 4.5;
            const bundleHeight = lineSpacing * 3;
            const startY = (height - bundleHeight) / 2;

            for (let i = 0; i < 4; i++) {
                const y = startY + (i * lineSpacing);
                ctx.beginPath();
                if (i === 2) {
                    ctx.strokeStyle = `rgba(220, 50, 50, ${opacity})`;
                    ctx.setLineDash([size / 15, size / 20]);
                } else {
                    ctx.strokeStyle = `rgba(0, 151, 178, ${opacity})`;
                    ctx.setLineDash([]);
                }
                ctx.lineWidth = 1;
                ctx.moveTo(0, y);
                ctx.lineTo(size, y);
                ctx.stroke();
            }
            ctx.setLineDash([]);
        } else if (type === 'music') {
            const lineSpacing = size / 8;
            const bundleHeight = lineSpacing * 4;
            const startY = (height - bundleHeight) / 2;

            for (let i = 0; i < 5; i++) {
                const y = startY + (i * lineSpacing);
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(size, y);
                ctx.strokeStyle = `rgba(0, 0, 0, ${opacity})`;
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }
    }

    return new fabric.Pattern({
        source: canvas as any,
        repeat: 'repeat'
    });
};
