import React, { useEffect, useState, useRef } from 'react';
import { useLanguage } from '@memosuite/shared';

import { useLocation, useNavigate } from 'react-router-dom';
import { Toast } from './UI/Toast';
import { FiAlertTriangle } from 'react-icons/fi';
import { useExitGuard, ExitGuardResult } from '@memosuite/shared-drawing';

interface AndroidExitHandlerProps {
    isSidebarOpen?: boolean;
    onOpenSidebar?: () => void;
}

export const AndroidExitHandler: React.FC<AndroidExitHandlerProps> = ({ isSidebarOpen, onOpenSidebar }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [showExitToast, setShowExitToast] = useState(false);
    const lastPressTime = useRef<number>(0);

    const isAtRoot = location.pathname === '/' || location.pathname === '' || location.pathname === '/index.html' || location.pathname === '/dailymemo/' || location.pathname === '/DailyMemo/';

    const { checkGuards } = useExitGuard();

    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        // Function to ensure we have an interceptor state
        const ensureGuardState = () => {
            if (!window.history.state || !window.history.state.isGuard) {
                window.history.pushState({ isGuard: true, sidebarOpen: isSidebarOpen }, '');
            }
        };

        ensureGuardState();

        const handlePopState = (event: PopStateEvent) => {
            // Skip entirely if Fabric canvas modal is open (it handles its own back button)
            if (window.history.state?.fabricOpen) {
                return;
            }

            // Check guards first
            const guardResult = checkGuards();
            if (guardResult === ExitGuardResult.PREVENT_NAVIGATION || (guardResult as string) === 'PREVENT') {
                // Restore state (undo pop)
                window.history.pushState({ isGuard: true, sidebarOpen: isSidebarOpen }, '');
                return;
            }
            if (guardResult === ExitGuardResult.ALLOW_NAVIGATION || (guardResult as string) === 'ALLOW') {
                // Accept pop (do nothing, let it be)
                return;
            }

            // If the state we popped TO does not have our flag, it means we intercepted a "back" 
            // that tried to leave the app or go past our first entry.
            if (!event.state || !event.state.isGuard) {
                if (!isAtRoot) {
                    // Smart navigation: go to root instead of exiting
                    navigate('/', { replace: true });
                    onOpenSidebar?.();
                    // Re-push guard for the new root state
                    window.history.pushState({ isGuard: true, sidebarOpen: true }, '');
                } else if (isMobile && isSidebarOpen === false && onOpenSidebar) {
                    // At root but sidebar closed: open sidebar
                    onOpenSidebar();
                    window.history.pushState({ isGuard: true, sidebarOpen: true }, '');
                } else {
                    // Already at root (or sidebar open): exit warning logic
                    const now = Date.now();
                    const timeDiff = now - lastPressTime.current;

                    if (timeDiff < 2000) {
                        // Real exit: go back once more which will actually leave the site
                        window.history.back();
                    } else {
                        // First press: warn, show toast, and re-push the guard
                        lastPressTime.current = now;
                        setShowExitToast(true);
                        window.history.pushState({ isGuard: true, sidebarOpen: isSidebarOpen }, '');
                    }
                }
            }
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [isAtRoot, navigate, checkGuards, isMobile, isSidebarOpen, onOpenSidebar]);

    if (!showExitToast) return null;

    return (
        <Toast
            variant="warning"
            position="centered"
            icon={<FiAlertTriangle size={14} />}
            message={t.android?.exit_warning || "Press back again\nto exit."}
            onClose={() => setShowExitToast(false)}
        />
    );
};