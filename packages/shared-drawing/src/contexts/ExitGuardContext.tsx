import React, { createContext, useContext, useRef, useCallback } from 'react';

export const ExitGuardResult = {
    CONTINUE: 'CONTINUE',           // No guard handled it, proceed with default logic
    PREVENT_NAVIGATION: 'PREVENT',  // Guard handled it and wants to stay (undo pop)
    ALLOW_NAVIGATION: 'ALLOW'       // Guard handled it and validated the navigation (allow pop)
} as const;

export type ExitGuardResult = typeof ExitGuardResult[keyof typeof ExitGuardResult];

type GuardHandler = () => ExitGuardResult;

interface ExitGuardContextType {
    registerGuard: (id: string, handler: GuardHandler) => void;
    unregisterGuard: (id: string) => void;
    checkGuards: () => ExitGuardResult;
}

const ExitGuardContext = createContext<ExitGuardContextType | null>(null);

export const useExitGuard = () => {
    const context = useContext(ExitGuardContext);
    if (!context) {
        throw new Error('useExitGuard must be used within an ExitGuardProvider');
    }
    return context;
};

export const ExitGuardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const handlers = useRef<Record<string, GuardHandler>>({});

    const registerGuard = useCallback((id: string, handler: GuardHandler) => {
        handlers.current[id] = handler;
    }, []);

    const unregisterGuard = useCallback((id: string) => {
        delete handlers.current[id];
    }, []);

    const checkGuards = useCallback(() => {
        // We check in reverse order of keys mostly, or just check all. 
        // Logic: if ANY guard handles it, we take action. 
        // Usually only one active guard (topmost) should handle it.
        // But since we use object, order isn't guaranteed. 
        // Ideally we assume the component tree manages active guards (e.g. only open modal has guard).

        for (const key of Object.keys(handlers.current)) {
            const result = handlers.current[key]();
            if (result !== ExitGuardResult.CONTINUE) {
                return result;
            }
        }
        return ExitGuardResult.CONTINUE;
    }, []);

    return (
        <ExitGuardContext.Provider value={{ registerGuard, unregisterGuard, checkGuards }}>
            {children}
        </ExitGuardContext.Provider>
    );
};
