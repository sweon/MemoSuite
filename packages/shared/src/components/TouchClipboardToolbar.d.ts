import React from 'react';
export declare const useTouchClipboard: (cmRef: React.MutableRefObject<any>, language: string, onChange: (value: string) => void) => {
    selectionMode: boolean;
    enterMode: () => void;
    exitMode: () => void;
    renderToolbar: () => import("react/jsx-runtime").JSX.Element;
};
