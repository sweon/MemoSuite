import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useRef, useCallback } from 'react';
export const ExitGuardResult = {
    CONTINUE: 'CONTINUE', // No guard handled it, proceed with default logic
    PREVENT_NAVIGATION: 'PREVENT', // Guard handled it and wants to stay (undo pop)
    ALLOW_NAVIGATION: 'ALLOW' // Guard handled it and validated the navigation (allow pop)
};
const ExitGuardContext = createContext(null);
export const useExitGuard = () => {
    const context = useContext(ExitGuardContext);
    if (!context) {
        throw new Error('useExitGuard must be used within an ExitGuardProvider');
    }
    return context;
};
export const ExitGuardProvider = ({ children }) => {
    const handlers = useRef({});
    const registerGuard = useCallback((id, handler) => {
        handlers.current[id] = handler;
    }, []);
    const unregisterGuard = useCallback((id) => {
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
    return (_jsx(ExitGuardContext.Provider, { value: { registerGuard, unregisterGuard, checkGuards }, children: children }));
};
