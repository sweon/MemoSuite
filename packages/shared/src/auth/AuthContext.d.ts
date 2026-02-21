import React from 'react';
import type { AuthContextType } from './types';
export declare const AuthProvider: React.FC<{
    children: React.ReactNode;
    storageKeyPrefix?: string;
}>;
export declare const useAuth: () => AuthContextType;
