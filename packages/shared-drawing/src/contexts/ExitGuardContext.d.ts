import React from 'react';
export declare const ExitGuardResult: {
    readonly CONTINUE: "CONTINUE";
    readonly PREVENT_NAVIGATION: "PREVENT";
    readonly ALLOW_NAVIGATION: "ALLOW";
};
export type ExitGuardResult = typeof ExitGuardResult[keyof typeof ExitGuardResult];
type GuardHandler = () => ExitGuardResult;
interface ExitGuardContextType {
    registerGuard: (id: string, handler: GuardHandler) => void;
    unregisterGuard: (id: string) => void;
    checkGuards: () => ExitGuardResult;
}
export declare const useExitGuard: () => ExitGuardContextType;
export declare const ExitGuardProvider: React.FC<{
    children: React.ReactNode;
}>;
export {};
