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
    const [toastKey, setToastKey] = useState(0);
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

            // If we land on a state that IS NOT our trap, a 'Back' movement just occurred.
            if (!event.state?.memosuite_trap) {

                // 1. Inhibition: If currently editing, block back, notify user, and stay on page.
                if (isEditing) {
                    window.history.forward(); // Return to our trap state instantly
                    setShowExitToast(true);
                    setToastKey(prev => prev + 1); // Force remount to restart animation/timer
                    return;
                }

                // 2. Check Guards (e.g. Drawing changes)
                const guardResult = checkGuards();
                if (guardResult === ExitGuardResult.PREVENT_NAVIGATION || (guardResult as string) === 'PREVENT') {
                    window.history.forward();
                    return;
                }

                // 3. Absolute Single-Press Sidebar: If closed, open it and stay on page.
                if (!isSidebarOpen) {
                    onOpenSidebar?.();
                    window.history.forward(); // Undo the 'back' motion visually to keep user on same page
                    return;
                }

                // 4. Exit Warning: Sidebar is already open, handle double-back-to-exit.
                const now = Date.now();
                if (now - lastPressTime.current < 2000) {
                    // Successful double-press. Let the browser stay on the base state (Exit).
                } else {
                    // First press. Show warning and stay on page.
                    lastPressTime.current = now;
                    setShowExitToast(true);
                    setToastKey(prev => prev + 1); // Force remount
                    window.history.forward();
                }
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [isSidebarOpen, isMobile, checkGuards, onOpenSidebar, isEditing]);

    if (!showExitToast) return null;

    return (
        <Toast
            key={toastKey}
            variant="warning"
            position="centered"
            icon={<FiAlertTriangle size={14} />}
            message={isEditing ? (t.android?.edit_in_progress || "Please save or cancel editing first") : (t.android?.exit_warning || "Press back again to exit")}
            onClose={() => setShowExitToast(false)}
            duration={2000}
        />
    );
};