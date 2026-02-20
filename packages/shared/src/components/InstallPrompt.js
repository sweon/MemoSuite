import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaTimes } from 'react-icons/fa';
const Banner = styled.div `
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)'};
    backdrop-filter: blur(12px);
    padding: 12px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid ${({ theme }) => theme.colors.border};
    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
    z-index: 10000;
    box-sizing: border-box;
    animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);

    @keyframes slideUp {
        from { transform: translateY(100%); }
        to { transform: translateY(0); }
    }
`;
const Content = styled.div `
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
`;
const AppIcon = styled.div `
    width: 40px;
    height: 40px;
    border-radius: 10px;
    overflow: hidden;
    flex-shrink: 0;
    background: #000;
    
    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
`;
const TextContainer = styled.div `
    display: flex;
    flex-direction: column;
    
    h3 {
        margin: 0;
        font-size: 0.95rem;
        font-weight: 600;
        color: ${({ theme }) => theme.colors.text};
    }
    
    p {
        margin: 2px 0 0 0;
        font-size: 0.8rem;
        color: ${({ theme }) => theme.colors.textSecondary};
    }
`;
const Actions = styled.div `
    display: flex;
    align-items: center;
    gap: 12px;
`;
const InstallButton = styled.button `
    background: ${({ theme }) => theme.colors.primary};
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 20px;
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: filter 0.2s;

    &:hover {
        filter: brightness(1.1);
    }
`;
const CloseButton = styled.button `
    background: transparent;
    border: none;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 1.2rem;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
`;
export const InstallPrompt = ({ appName, iconPath = '/pwa-192x192.png', t }) => {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isVisible, setIsVisible] = useState(false);
    useEffect(() => {
        const handleBeforeInstallPrompt = async (e) => {
            // Prevent Chrome 67 and earlier from automatically showing the prompt
            e.preventDefault();
            // Check if app is running in standalone mode (already installed)
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
            if (isStandalone)
                return;
            // Check if app is installed (related apps API)
            if ('getInstalledRelatedApps' in navigator) {
                const relatedApps = await navigator.getInstalledRelatedApps();
                if (relatedApps.length > 0) {
                    return;
                }
            }
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e);
            // Update UI notify the user they can add to home screen
            setIsVisible(true);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);
    const handleInstallClick = async () => {
        if (!deferredPrompt)
            return;
        // Double check installation status before prompting
        if ('getInstalledRelatedApps' in navigator) {
            const relatedApps = await navigator.getInstalledRelatedApps();
            if (relatedApps.length > 0) {
                alert("이미 설치된 앱입니다. / This app is already installed.");
                setIsVisible(false);
                return;
            }
        }
        // Hide the app provided install promotion
        setIsVisible(false);
        // Show the install prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
            }
            else {
                console.log('User dismissed the install prompt');
            }
            setDeferredPrompt(null);
        });
    };
    if (!isVisible)
        return null;
    // Default translations if t is not fully populated or structured differently
    const title = t.install?.title || "Install App";
    const desc = t.install?.desc || "Install for a better experience";
    const installLabel = t.install?.button || "Install";
    return (_jsxs(Banner, { children: [_jsxs(Content, { children: [_jsx(AppIcon, { children: _jsx("img", { src: iconPath, alt: `${appName} Icon`, onError: (e) => e.currentTarget.style.display = 'none' }) }), _jsxs(TextContainer, { children: [_jsx("h3", { children: title }), _jsx("p", { children: desc })] })] }), _jsxs(Actions, { children: [_jsx(InstallButton, { onClick: handleInstallClick, children: installLabel }), _jsx(CloseButton, { onClick: () => setIsVisible(false), children: _jsx(FaTimes, {}) })] })] }));
};
