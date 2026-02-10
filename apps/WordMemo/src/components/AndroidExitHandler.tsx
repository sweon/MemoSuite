import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '@memosuite/shared';
import { Toast } from './UI/Toast';
import { FiAlertTriangle } from 'react-icons/fi';
import { useExitGuard, ExitGuardResult } from '@memosuite/shared-drawing';

interface AndroidExitHandlerProps {
    isSidebarOpen?: boolean;
    onOpenSidebar?: () => void;
    isEditing?: boolean;
}

export const AndroidExitHandler: React.FC<AndroidExitHandlerProps> = ({ isSidebarOpen, onOpenSidebar, isEditing }) => {
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
    }, [location.pathname, location.search, isMobile]);

    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            if (!isMobile) return;

            if (window.history.state?.fabricOpen) return;

            // 1. If currently editing, block back and re-trap
            if (isEditing) {
                window.history.pushState({ memosuite_trap: true }, '');
                return;
            }

            // 2. Check Guards
            const guardResult = checkGuards();
            if (guardResult === ExitGuardResult.PREVENT_NAVIGATION || (guardResult as string) === 'PREVENT') {
                window.history.pushState({ memosuite_trap: true }, '');
                return;
            }

            // 3. CORE FIX: If sidebar is closed, OPEN IT on ANY back press and re-trap
            if (!isSidebarOpen) {
                onOpenSidebar?.();
                window.history.pushState({ memosuite_trap: true }, '');
                return;
            }

            // 4. Sidebar is open -> Handle Exit Warning
            // We only show exit warning if this was our trap being popped
            if (!event.state?.memosuite_trap) {
                const now = Date.now();
                if (now - lastPressTime.current < 2000) {
                    // Double press within 2s -> Allow Exit
                } else {
                    // First press -> Show Warning and re-trap
                    lastPressTime.current = now;
                    setShowExitToast(true);
                    window.history.pushState({ memosuite_trap: true }, '');
                }
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [isSidebarOpen, isMobile, checkGuards, onOpenSidebar, isEditing]);

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