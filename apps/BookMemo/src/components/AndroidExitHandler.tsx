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



    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Unified Trap Logic for Mobile
    useEffect(() => {
        if (!isMobile) return;

        // Ensure we always have a trap on top of any navigation
        if (!window.history.state?.memosuite_trap) {
            window.history.pushState({ memosuite_trap: true }, '');
        }
    }, [location.pathname, isMobile]);

    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            if (!isMobile) return;

            // Check for drawing/modal guards first
            if (window.history.state?.fabricOpen) return;

            const guardResult = checkGuards();
            if (guardResult === ExitGuardResult.PREVENT_NAVIGATION || (guardResult as string) === 'PREVENT') {
                window.history.pushState({ memosuite_trap: true }, '');
                return;
            }

            // If we just popped our trap (current state lacks memosuite_trap)
            if (!event.state?.memosuite_trap) {
                if (!isSidebarOpen) {
                    // One click to open sidebar
                    onOpenSidebar?.();
                    // Re-trap immediately to keep the user on the current page
                    window.history.pushState({ memosuite_trap: true }, '');
                } else {
                    // Sidebar is already open. Handle exit logic.
                    const now = Date.now();
                    if (now - lastPressTime.current < 2000) {
                        // Second click within 2000ms -> Allow exit
                    } else {
                        // First click -> Show Warning and re-trap
                        lastPressTime.current = now;
                        setShowExitToast(true);
                        window.history.pushState({ memosuite_trap: true }, '');
                    }
                }
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [isSidebarOpen, isMobile, checkGuards, onOpenSidebar]);

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