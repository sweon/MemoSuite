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

    // Push a trap entry on top of every navigation change
    useEffect(() => {
        if (!isMobile) return;
        if (!window.history.state?.memosuite_trap) {
            window.history.pushState({ memosuite_trap: true }, '');
        }
    }, [location.pathname, location.search, isMobile]);

    // Refs: keep latest values accessible in the stable capture-phase listener
    const sidebarRef = useRef(isSidebarOpen);
    const editingRef = useRef(isEditing);
    const openSidebarRef = useRef(onOpenSidebar);
    const guardsRef = useRef(checkGuards);

    useEffect(() => { sidebarRef.current = isSidebarOpen; }, [isSidebarOpen]);
    useEffect(() => { editingRef.current = isEditing; }, [isEditing]);
    useEffect(() => { openSidebarRef.current = onOpenSidebar; }, [onOpenSidebar]);
    useEffect(() => { guardsRef.current = checkGuards; }, [checkGuards]);

    useEffect(() => {
        if (!isMobile) return;

        const handlePopState = (event: PopStateEvent) => {
            // Let Fabric.js drawing modal handle its own back
            if (window.history.state?.fabricOpen) return;

            // --- 1. EDITING: completely block ---
            if (editingRef.current) {
                event.stopImmediatePropagation();
                window.history.pushState({ memosuite_trap: true }, '');
                setShowExitToast(true);
                setToastKey(prev => prev + 1);
                return;
            }

            // --- 2. GUARDS (e.g. unsaved drawing) ---
            const guardResult = guardsRef.current();
            if (guardResult === ExitGuardResult.PREVENT_NAVIGATION || (guardResult as string) === 'PREVENT') {
                event.stopImmediatePropagation();
                window.history.pushState({ memosuite_trap: true }, '');
                return;
            }

            // --- 3. SIDEBAR CLOSED (preview mode) → open sidebar ---
            if (!sidebarRef.current) {
                event.stopImmediatePropagation();
                openSidebarRef.current?.();
                window.history.pushState({ memosuite_trap: true }, '');
                return;
            }

            // --- 4. SIDEBAR OPEN → exit warning / exit ---
            const now = Date.now();
            if (now - lastPressTime.current < 3000) {
                // Double-press within 3s: allow exit (don't intercept)
                return;
            }
            event.stopImmediatePropagation();
            lastPressTime.current = now;
            setShowExitToast(true);
            setToastKey(prev => prev + 1);
            window.history.pushState({ memosuite_trap: true }, '');
        };

        // CAPTURE phase: fires BEFORE React Router's bubble-phase listener
        window.addEventListener('popstate', handlePopState, true);
        return () => window.removeEventListener('popstate', handlePopState, true);
    }, [isMobile]); // Stable: only re-registers when isMobile changes. Refs handle the rest.

    if (!showExitToast) return null;

    return (
        <Toast
            key={toastKey}
            variant="warning"
            position="centered"
            icon={<FiAlertTriangle size={14} />}
            message={isEditing ? (t.android?.edit_in_progress || "Please save or cancel editing first") : (t.android?.exit_warning || "Press back again to exit")}
            onClose={() => setShowExitToast(false)}
            duration={3000}
        />
    );
};