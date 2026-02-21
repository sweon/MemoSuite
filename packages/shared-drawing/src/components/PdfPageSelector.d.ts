import React from 'react';
interface Props {
    pdfDoc: any;
    t: any;
    onSelect: (canvas: HTMLCanvasElement) => void;
    onCancel: () => void;
}
export declare const PdfPageSelector: React.FC<Props>;
export {};
