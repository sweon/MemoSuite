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

export const AndroidExitHandler: React.FC<AndroidExitHandlerProps> = ({ isSidebarOpen, onOpenSidebar }) => {
    const location = useLocation();
    const { t } = useLanguage();
    const [showExitToast, setShowExitToast] = useState(false);
    const lastPressTime = useRef<number>(0);
    const { checkGuards } = useExitGuard();

    // Determine if we are at the app root
    const isAtRoot = location.pathname === '/' ||
        location.pathname === '/index.html' ||
        location.pathname.toLowerCase().endsWith('handmemo/') ||
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

        if (isAtRoot) {
            // At root, we only need the exit trap if sidebar is open.
            // If sidebar is closed at root, we use the sidebar trap.
            if (isSidebarOpen) {
                if (!window.history.state?.android_exit_trap) {
                    window.history.pushState({ android_exit_trap: true }, '');
                }
            } else {
                if (!window.history.state?.sidebar_trap) {
                    window.history.pushState({ sidebar_trap: true }, '');
                }
            }
        } else if (!isSidebarOpen) {
            // If sidebar is closed on a detail page, push a sidebar trap
            if (!window.history.state?.sidebar_trap) {
                window.history.pushState({ sidebar_trap: true }, '');
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
                if (isAtRoot && isSidebarOpen) {
                    window.history.pushState({ android_exit_trap: true }, '');
                } else if (!isSidebarOpen) {
                    window.history.pushState({ sidebar_trap: true }, '');
                } else {
                    window.history.pushState(null, '');
                }
                return;
            }

            // Handle Sidebar Opening when Closed
            if (!isSidebarOpen) {
                onOpenSidebar?.();
                // We don't re-trap here to allow the next back button to proceed naturally
                return;
            }

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
                        // RE-TRAP
                        window.history.pushState({ android_exit_trap: true }, '');
                    }
                }
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [isAtRoot, isSidebarOpen, isMobile, checkGuards, onOpenSidebar]);

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