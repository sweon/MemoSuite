import React from 'react';
interface TooltipProps {
    content: string;
    children: React.ReactNode;
    hoverDelay?: number;
    touchDelay?: number;
}
export declare const Tooltip: React.FC<TooltipProps>;
export {};
