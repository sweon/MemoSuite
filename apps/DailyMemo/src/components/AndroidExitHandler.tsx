import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '@memosuite/shared';
import { Toast } from './UI/Toast';
import { FiAlertTriangle } from 'react-icons/fi';
import { useExitGuard, ExitGuardResult } from '@memosuite/shared-drawing';

interface AndroidExitHandlerProps {
    isSidebarOpen?: boolean;
    onOpenSidebar?: () => void;
}

<<<<<<< HEAD
export const AndroidExitHandler: React.FC<AndroidExitHandlerProps> = ({ isSidebarOpen, onOpenSidebar }) => {
=======
export const AndroidExitHandler: React.FC<AndroidExitHandlerProps> = ({ isSidebarOpen }) => {
>>>>>>> cc439646 (Refine mobile back navigation: Right pane to Sidebar, Sidebar to Exit Warning)
    const location = useLocation();
    const { t } = useLanguage();
    const [showExitToast, setShowExitToast] = useState(false);
    const lastPressTime = useRef<number>(0);
<<<<<<< HEAD

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
=======
    const { checkGuards } = useExitGuard();

    // Determine if we are at the app root
    const isAtRoot = location.pathname === '/' ||
        location.pathname === '/index.html' ||
        location.pathname.toLowerCase().endsWith('dailymemo/') ||
        location.pathname === '';

    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // TRAP LOGIC
    useEffect(() => {
        if (!isMobile) return;

        // If we are at root and sidebar is open, we should engage the trap
        if (isAtRoot && isSidebarOpen) {
            if (!window.history.state?.android_exit_trap) {
                // Push the trap state
                window.history.pushState({ android_exit_trap: true }, '');
>>>>>>> cc439646 (Refine mobile back navigation: Right pane to Sidebar, Sidebar to Exit Warning)
            }
        }
    }, [isAtRoot, isSidebarOpen, isMobile]);

    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            if (!isMobile) return;

            // Check for drawing/modal guards first
            if (window.history.state?.fabricOpen) return;

            const guardResult = checkGuards();
            if (guardResult === ExitGuardResult.PREVENT_NAVIGATION || (guardResult as string) === 'PREVENT') {
<<<<<<< HEAD
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
=======
                // Determine what to restore
                if (isAtRoot && isSidebarOpen) {
                    window.history.pushState({ android_exit_trap: true }, '');
                } else {
                    // Best effort to block navigation (push current state back)
                    window.history.pushState(null, '');
                }
                return;
            }
>>>>>>> cc439646 (Refine mobile back navigation: Right pane to Sidebar, Sidebar to Exit Warning)

            // Main Exit Logic
            if (isAtRoot && isSidebarOpen) {
                // We expected to be trapped. If the popped state is empty, we fell through.
                if (!event.state?.android_exit_trap) {
                    const now = Date.now();
                    if (now - lastPressTime.current < 2000) {
                        // Double press detected. ALLOW EXIT.
                        // Browser stays at the popped state (Entry/External).
                    } else {
                        // First press.
                        lastPressTime.current = now;
                        setShowExitToast(true);
<<<<<<< HEAD
                        window.history.pushState({ isGuard: true, sidebarOpen: isSidebarOpen }, '');
=======
                        // RE-TRAP
                        window.history.pushState({ android_exit_trap: true }, '');
>>>>>>> cc439646 (Refine mobile back navigation: Right pane to Sidebar, Sidebar to Exit Warning)
                    }
                }
            }
        };

        window.addEventListener('popstate', handlePopState);
<<<<<<< HEAD

        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [isAtRoot, navigate, checkGuards, isMobile, isSidebarOpen, onOpenSidebar]);
=======
        return () => window.removeEventListener('popstate', handlePopState);
    }, [isAtRoot, isSidebarOpen, isMobile, checkGuards]);
>>>>>>> cc439646 (Refine mobile back navigation: Right pane to Sidebar, Sidebar to Exit Warning)

    if (!showExitToast) return null;

    return (
        <Toast
            variant="warning"
            position="centered"
            icon={<FiAlertTriangle size={14} />}
            message={t.android?.exit_warning || "Press back again to exit"}
            onClose={() => setShowExitToast(false)}
            duration={2000}
        />
    );
};