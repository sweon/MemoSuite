import React from 'react';
import type { SyncAdapter } from './types';
export interface SyncModalProps {
    isOpen: boolean;
    onClose: () => void;
    adapter: SyncAdapter;
    t: any;
    language: string;
    initialItemId?: number;
}
export declare const SyncModal: React.FC<SyncModalProps>;
