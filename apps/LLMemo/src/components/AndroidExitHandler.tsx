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

            // 0. Trap Skip: If we land on an OLD trap state, skip it immediately
            if (event.state?.memosuite_trap) {
                window.history.back();
                return;
            }

            // 1. Inhibition: If currently editing, block back, notify user, and re-trap
            if (isEditing) {
                setShowExitToast(true); // Re-use toast for "Editing" message context if needed, or better, just block.
                // We use the same toast but the message will be "Press back again..."? No.
                // Let's use a clear message for editing.
                window.history.pushState({ memosuite_trap: true }, '');
                return;
            }

            // 2. Check Guards (e.g. Unsaved changes in drawing)
            const guardResult = checkGuards();
            if (guardResult === ExitGuardResult.PREVENT_NAVIGATION || (guardResult as string) === 'PREVENT') {
                window.history.pushState({ memosuite_trap: true }, '');
                return;
            }

            // 3. Single-Press Sidebar: If closed (Preview mode), open it instantly and re-trap
            if (!isSidebarOpen) {
                onOpenSidebar?.();
                window.history.pushState({ memosuite_trap: true }, '');
                return;
            }

            // 4. Exit Warning: Sidebar is open, handle double-back-to-exit
            const now = Date.now();
            if (now - lastPressTime.current < 2000) {
                // Exit allowed: Don't re-trap.
            } else {
                lastPressTime.current = now;
                setShowExitToast(true);
                window.history.pushState({ memosuite_trap: true }, '');
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
            message={isEditing ? (t.android?.edit_in_progress || "Please save or cancel editing first") : (t.android?.exit_warning || "Press back again to exit")}
            onClose={() => setShowExitToast(false)}
            duration={2000}
        />
    );
};