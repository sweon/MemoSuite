import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import styled, { useTheme as useStyledTheme } from 'styled-components';
import { SyncService, cleanRoomId } from './SyncService';
import { FaTimes, FaSync, FaRegCopy, FaRedo, FaCamera, FaStop, FaCheck, FaLink, FaLock, FaShieldAlt, FaLayerGroup, FaFileAlt, FaDatabase } from 'react-icons/fa';
import { QRCodeSVG } from 'qrcode.react';
import { Html5QrcodeScanner } from 'html5-qrcode';
const generateShortId = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};
const Overlay = styled.div `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(8px);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
`;
const ModalContainer = styled.div `
    background-color: ${({ theme }) => theme.colors.background};
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: 20px;
    width: 440px;
    max-width: 95%;
    max-height: 85vh; /* Reduced max height for mobile safety */
    display: flex;
    flex-direction: column;
    box-shadow: 0 25px 60px rgba(0, 0, 0, 0.4);
    color: ${({ theme }) => theme.colors.text};
    overflow: hidden;
`;
const Header = styled.div `
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px; /* Reduced padding */
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
    background: ${({ theme }) => theme.colors.surface};

    h2 {
        margin: 0;
        font-size: 1.15rem;
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: 10px;
        color: ${({ theme }) => theme.colors.primary};
        
        svg:last-child {
            font-size: 0.8rem;
            opacity: 0.6;
        }
    }
`;
const TabContainer = styled.div `
    display: grid;
    grid-template-columns: 1fr 1fr;
    background: ${({ theme }) => theme.colors.surface};
    margin: 16px 20px 0; /* Reduced margin */
    padding: 4px;
    border-radius: 12px;
    gap: 4px;
    border: 1px solid ${({ theme }) => theme.colors.border};
`;
const Tab = styled.button `
    flex: 1;
    padding: 8px 10px;
    background: ${props => props.$active ? props.theme.colors.background : 'transparent'};
    border: none;
    border-radius: 8px;
    color: ${props => props.$active ? props.theme.colors.primary : props.theme.colors.textSecondary};
    font-weight: ${props => props.$active ? '700' : '500'};
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    font-size: 0.9rem;
    box-shadow: ${props => props.$active ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'};

    &:hover {
        color: ${props => props.$active ? props.theme.colors.primary : props.theme.colors.text};
        background: ${props => props.$active ? props.theme.colors.background : props.theme.colors.background + '80'};
    }
    
    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;
const Content = styled.div `
    padding: 16px 20px 24px; /* Reduced padding */
    overflow-y: auto;
    flex: 1;
    
    /* Elegant scrollbar */
    &::-webkit-scrollbar {
        width: 6px;
    }
    &::-webkit-scrollbar-thumb {
        background: ${({ theme }) => theme.colors.border};
        border-radius: 3px;
    }
`;
const FormWrapper = styled.div `
    display: flex;
    flex-direction: column;
    width: 100%;
    margin: 0 auto;
    
    @media (max-width: 600px) {
        max-width: 100%;
    }
`;
const CloseButton = styled.button `
    background: none;
    border: none;
    color: ${({ theme }) => theme.colors.textSecondary};
    cursor: pointer;
    font-size: 1.2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px;
    border-radius: 50%;
    transition: all 0.2s;
    
    &:hover {
        background-color: ${({ theme }) => theme.colors.background};
        color: ${({ theme }) => theme.colors.text};
    }
`;
const Label = styled.label `
    display: block;
    margin-bottom: 6px;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 0.05em;
`;
const InputGroup = styled.div `
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
    width: 100%;
`;
const Input = styled.input `
    flex: 1;
    min-width: 0;
    padding: 10px 14px;
    border-radius: 12px;
    border: 1px solid ${({ theme }) => theme.colors.border};
    background-color: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text};
    font-size: 0.95rem;
    font-family: 'JetBrains Mono', monospace; /* Monospace for ID */
    letter-spacing: 0.05em;
    transition: all 0.2s;

    &:focus {
        outline: none;
        border-color: ${({ theme }) => theme.colors.primary};
        box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primary}20;
    }
    
    &:disabled {
        background-color: ${({ theme }) => theme.colors.surface};
        opacity: 0.7;
        cursor: not-allowed;
    }
`;
const IconButton = styled.button `
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    border-radius: 12px;
    border: 1px solid ${({ theme }) => theme.colors.border};
    background-color: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.textSecondary};
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;

    &:hover:not(:disabled) {
        background-color: ${({ theme }) => theme.colors.background};
        border-color: ${({ theme }) => theme.colors.textSecondary};
        color: ${({ theme }) => theme.colors.text};
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;
const ActionButton = styled.button `
    padding: 12px 20px;
    border-radius: 12px;
    border: none;
    cursor: pointer;
    font-weight: 600;
    font-size: 0.95rem;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: ${props => props.$fullWidth ? '100%' : 'auto'};
    
    background-color: ${props => {
    if (props.$variant === 'secondary')
        return props.theme.colors.surface;
    if (props.$variant === 'danger')
        return props.theme.colors.danger;
    return props.theme.colors.primary;
}};
    
    color: ${props => (props.$variant === 'secondary' ? props.theme.colors.text : '#ffffff')};
    border: 1px solid ${props => props.$variant === 'secondary' ? props.theme.colors.border : 'transparent'};

    &:hover:not(:disabled) {
        filter: brightness(1.1);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    
    &:active:not(:disabled) {
        transform: translateY(0);
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;
const InfoCard = styled.div `
    background: ${({ theme }) => theme.colors.surface};
    border: 1px solid ${({ theme }) => theme.colors.primary}30;
    border-radius: 12px;
    padding: 12px;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    animation: fadeIn 0.3s ease;
    
    .icon-box {
        width: 38px;
        height: 38px;
        border-radius: 10px;
        background: ${({ theme }) => theme.colors.primary}15;
        color: ${({ theme }) => theme.colors.primary};
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.1rem;
        flex-shrink: 0;
    }
    
    .content {
        flex: 1;
        min-width: 0;
        h4 {
            margin: 0 0 2px 0;
            font-size: 0.85rem;
            color: ${({ theme }) => theme.colors.primary};
            font-weight: 700;
        }
        p {
            margin: 0;
            font-size: 0.9rem;
            color: ${({ theme }) => theme.colors.text};
            font-weight: 500;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
    }
`;
const ProgressContainer = styled.div `
    width: 100%;
    margin-top: 16px;
`;
const ProgressBar = styled.div `
    height: 4px;
    background: ${({ theme }) => theme.colors.border};
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: 8px;
    position: relative;

    &::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        width: ${props => props.$percent}%;
        background: ${({ theme }) => theme.colors.primary};
        transition: width 0.3s ease;
    }
`;
const StatusBox = styled.div `
    padding: 12px;
    border-radius: 10px;
    background-color: ${({ theme }) => theme.colors.surface};
    text-align: center;
    font-weight: 500;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 12px;
    font-size: 0.9rem;
    width: 100%;
    
    color: ${({ theme }) => theme.colors.text};
    border: 1px solid ${({ theme }) => theme.colors.border};

    .icon-area {
        font-size: 1.2rem;
        display: flex;
        align-items: center;
        color: ${props => {
    if (props.$status === 'error')
        return props.theme.colors.danger;
    if (props.$status === 'completed')
        return props.theme.colors.success;
    if (props.$status === 'ready' || props.$status === 'connected')
        return props.theme.colors.primary;
    if (props.$status === 'connecting')
        return '#f59e0b';
    return props.theme.colors.textSecondary;
}};
    }
`;
const QRWrapper = styled.div `
    background: white;
    padding: 16px; /* Reduced padding */
    border-radius: 16px;
    margin: 16px auto;
    width: fit-content;
    display: flex;
    justify-content: center;
    align-items: center;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    border: 1px solid ${({ theme }) => theme.colors.border};
`;
const ScannerContainer = styled.div `
    width: 100%;
    aspect-ratio: 1;
    max-width: 280px; /* Reduced max width */
    margin: 0 auto 16px;
    overflow: hidden;
    border-radius: 16px;
    border: 1px solid ${({ theme }) => theme.colors.border};
    background: #000;
    position: relative;

    #reader {
        width: 100% !important;
        border: none !important;
    }
    
    /* Hide some default UI elements of the scanner library if possible via CSS */
    #reader__dashboard_section_csr button {
        font-size: 0.9rem !important;
        padding: 6px 12px !important;
    }
`;
const Divider = styled.div `
    display: flex;
    align-items: center;
    text-align: center;
    margin: 16px 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    width: 100%;

    &::before, &::after {
        content: '';
        flex: 1;
        border-bottom: 1px solid ${({ theme }) => theme.colors.border};
    }
    &::before { margin-right: 12px; }
    &::after { margin-left: 12px; }
`;
export const SyncModal = ({ isOpen, onClose, adapter, t, language, initialItemId }) => {
    const [activeTab, setActiveTab] = useState('host');
    const [roomId, setRoomId] = useState('');
    const [targetRoomId, setTargetRoomId] = useState('');
    const [status, setStatus] = useState('disconnected');
    const [statusMessage, setStatusMessage] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [animatedCopied, setAnimatedCopied] = useState(false);
    const [syncInfo, setSyncInfo] = useState(null);
    const [progress, setProgress] = useState(0);
    const [conflicts, setConflicts] = useState([]);
    const [currentConflictIndex, setCurrentConflictIndex] = useState(0);
    const [resolutions, setResolutions] = useState([]);
    const conflictResolveRef = useRef(null);
    const scannerRef = useRef(null);
    const syncService = useRef(null);
    const theme = useStyledTheme();
    useEffect(() => {
        if (isOpen) {
            if (!roomId) {
                setRoomId(generateShortId());
            }
        }
    }, [isOpen]);
    useEffect(() => {
        if (isScanning && !scannerRef.current) {
            const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 220, height: 220 } }, false);
            scanner.render((decodedText) => {
                setTargetRoomId(decodedText);
                connectToPeer(decodedText);
            }, () => { });
            scannerRef.current = scanner;
        }
        return () => {
            if (!isScanning && scannerRef.current) {
                scannerRef.current.clear().catch(err => console.error("Scanner clear error", err));
                scannerRef.current = null;
            }
        };
    }, [isScanning]);
    const handleClose = () => {
        if (scannerRef.current) {
            scannerRef.current.clear().catch(console.error);
            scannerRef.current = null;
        }
        if (syncService.current) {
            syncService.current.destroy();
            syncService.current = null;
        }
        setStatus('disconnected');
        setStatusMessage('');
        setSyncInfo(null);
        setProgress(0);
        setIsScanning(false);
        onClose();
    };
    const handleStatusChange = (newStatus, msg) => {
        setStatus(newStatus);
        if (msg)
            setStatusMessage(msg);
        // Estimate progress
        if (newStatus === 'connecting')
            setProgress(15);
        else if (newStatus === 'connected')
            setProgress(30);
        else if (newStatus === 'syncing') {
            if (msg?.toLowerCase().includes('preparing'))
                setProgress(10);
            else if (msg?.toLowerCase().includes('encrypting'))
                setProgress(25);
            else if (msg?.toLowerCase().includes('sending') || msg?.toLowerCase().includes('uploading'))
                setProgress(45);
            else if (msg?.toLowerCase().includes('downloading'))
                setProgress(60);
            else if (msg?.toLowerCase().includes('decrypting'))
                setProgress(75);
            else if (msg?.toLowerCase().includes('merging'))
                setProgress(90);
            else if (msg?.toLowerCase().includes('back'))
                setProgress(95);
            else
                setProgress(50);
        }
        else if (newStatus === 'completed')
            setProgress(100);
        else if (newStatus === 'error' || newStatus === 'disconnected' || newStatus === 'ready')
            setProgress(0);
    };
    const getService = () => {
        if (!syncService.current) {
            syncService.current = new SyncService({
                adapter,
                initialDataLogId: initialItemId,
                onStatusChange: handleStatusChange,
                onDataReceived: () => {
                    setStatus('completed');
                    setStatusMessage(t.sync?.data_synced_reload || 'Sync complete, reloading...');
                    setProgress(100);
                    setTimeout(() => {
                        window.location.reload();
                    }, 3000);
                },
                onSyncInfo: (info) => setSyncInfo(info),
                onConflict: async (items) => {
                    setConflicts(items);
                    setResolutions([]);
                    setCurrentConflictIndex(0);
                    return new Promise((resolve) => {
                        conflictResolveRef.current = resolve;
                    });
                }
            });
        }
        return syncService.current;
    };
    const startHosting = async (id) => {
        const hostId = id || roomId;
        if (!hostId.trim())
            return;
        try {
            const svc = getService();
            await svc.initialize(hostId);
        }
        catch (e) {
            console.error(e);
        }
    };
    const connectToPeer = async (id) => {
        const targetId = id || targetRoomId;
        if (!targetId.trim() || status === 'connecting' || status === 'connected' || status === 'syncing')
            return;
        if (isScanning) {
            setIsScanning(false);
            if (scannerRef.current) {
                scannerRef.current.clear().catch(console.error);
                scannerRef.current = null;
            }
        }
        try {
            const svc = getService();
            await svc.connect(targetId);
        }
        catch (e) {
            console.error('Connect error:', e);
            setStatus('error');
            setStatusMessage(`Connection failed: ${e.message || 'Unknown error'} `);
        }
    };
    const copyToClipboard = () => {
        navigator.clipboard.writeText(roomId);
        setAnimatedCopied(true);
        setTimeout(() => setAnimatedCopied(false), 2000);
    };
    const resolveCurrentConflict = (res) => {
        const nextResolutions = [...resolutions, res];
        setResolutions(nextResolutions);
        if (currentConflictIndex < conflicts.length - 1) {
            setCurrentConflictIndex(currentConflictIndex + 1);
        }
        else {
            // All resolved
            if (conflictResolveRef.current) {
                conflictResolveRef.current(nextResolutions);
                conflictResolveRef.current = null;
            }
            setConflicts([]);
        }
    };
    const regenerateId = () => {
        if (status === 'syncing' || status === 'connected')
            return;
        if (syncService.current) {
            syncService.current.destroy();
            syncService.current = null;
        }
        const newId = generateShortId();
        setRoomId(newId);
        setStatus('disconnected');
        setStatusMessage('');
        setSyncInfo(null);
        setProgress(0);
        if (activeTab === 'host') {
            startHosting(newId);
        }
    };
    if (!isOpen)
        return null;
    // Use translations or fallbacks
    const txt = {
        title: t.sync?.title || 'Sync Data',
        host_session: t.sync?.host_session || 'Host Session',
        join_session: t.sync?.join_session || 'Join Session',
        your_room_id: t.sync?.your_room_id || 'Your Room ID',
        enter_custom_id: t.sync?.enter_custom_id || 'Enter Custom ID',
        copied: t.sync?.copied || 'Copied!',
        copy_id: t.sync?.copy_id || 'Copy ID',
        regenerate_id: t.sync?.regenerate_id || 'Regenerate ID',
        connecting: t.sync?.connecting || 'Connecting...',
        restart_hosting: t.sync?.restart_hosting || 'Restart',
        start_host: t.sync?.start_host || 'Start Hosting',
        connected_to_peer: t.sync?.connected_to_peer || 'Connected!',
        scan_hint: t.sync?.scan_hint || 'Scan on other device',
        stop_scanning: t.sync?.stop_scanning || 'Stop Scanning',
        scan_qr: t.sync?.scan_qr || 'Scan QR Code',
        or: t.sync?.or || 'OR',
        manual_entry: t.sync?.manual_entry || 'Manual Entry',
        enter_room_id: t.sync?.enter_room_id || 'Enter Room ID',
        connect: t.sync?.connect || 'Connect',
        ready_to_share: t.sync?.ready_to_share || 'Ready to share!',
        connected: t.sync?.connected || 'Connected!',
    };
    const modalContent = (_jsx(Overlay, { onClick: handleClose, children: _jsxs(ModalContainer, { onClick: (e) => e.stopPropagation(), children: [_jsxs(Header, { children: [_jsxs("h2", { children: [_jsx(FaSync, {}), " ", txt.title, " ", _jsx(FaLock, { style: { opacity: 0.5, fontSize: '0.9em' }, title: "E2EE" })] }), _jsx(CloseButton, { onClick: handleClose, children: _jsx(FaTimes, {}) })] }), _jsxs(TabContainer, { children: [_jsx(Tab, { "$active": activeTab === 'host', onClick: () => setActiveTab('host'), disabled: status === 'syncing' || (status === 'connected' && activeTab === 'join'), children: txt.host_session }), _jsx(Tab, { "$active": activeTab === 'join', onClick: () => setActiveTab('join'), disabled: status === 'syncing' || (status === 'connected' && activeTab === 'host'), children: txt.join_session })] }), _jsxs(Content, { children: [_jsxs(FormWrapper, { children: [activeTab === 'host' ? (_jsxs(_Fragment, { children: [syncInfo && (_jsxs(InfoCard, { children: [_jsx("div", { className: "icon-box", children: syncInfo.type === 'thread' ? _jsx(FaLayerGroup, {}) :
                                                        syncInfo.type === 'full' ? _jsx(FaDatabase, {}) : _jsx(FaFileAlt, {}) }), _jsxs("div", { className: "content", children: [_jsx("h4", { children: syncInfo.type === 'thread' ? (t.sync?.thread || 'Thread') :
                                                                syncInfo.type === 'full' ? (t.sync?.backup || 'Backup') : (t.sync?.item || 'Item') }), _jsx("p", { children: syncInfo.label })] })] })), _jsx(Label, { children: txt.your_room_id }), _jsxs(InputGroup, { children: [_jsx(Input, { value: roomId, onChange: (e) => setRoomId(e.target.value), disabled: status === 'connected' || status === 'connecting' || status === 'syncing', placeholder: txt.enter_custom_id }), _jsx(IconButton, { onClick: copyToClipboard, title: animatedCopied ? txt.copied : txt.copy_id, children: animatedCopied ? _jsx(FaCheck, { style: { color: theme.colors.success } }) : _jsx(FaRegCopy, {}) }), _jsx(IconButton, { onClick: regenerateId, disabled: status === 'syncing' || status === 'connected', title: txt.regenerate_id, children: _jsx(FaRedo, {}) })] }), _jsx(ActionButton, { "$fullWidth": true, onClick: () => startHosting(), disabled: status === 'syncing' || status === 'connected' || status === 'connecting', children: status === 'connecting' ? txt.connecting : (status === 'ready' ? txt.restart_hosting : txt.start_host) }), _jsx(QRWrapper, { children: _jsx(QRCodeSVG, { value: cleanRoomId(roomId), size: 140, level: "M" }) }), _jsx("p", { style: { fontSize: '0.8rem', color: theme.colors.textSecondary, textAlign: 'center', marginTop: -8, marginBottom: 0 }, children: status === 'connected' || status === 'syncing'
                                                ? txt.connected_to_peer
                                                : txt.scan_hint })] })) : (_jsx(_Fragment, { children: isScanning ? (_jsxs(_Fragment, { children: [_jsx(ScannerContainer, { children: _jsx("div", { id: "reader" }) }), syncInfo && (_jsxs(InfoCard, { children: [_jsx("div", { className: "icon-box", children: syncInfo.type === 'thread' ? _jsx(FaLayerGroup, {}) :
                                                            syncInfo.type === 'full' ? _jsx(FaDatabase, {}) : _jsx(FaFileAlt, {}) }), _jsxs("div", { className: "content", children: [_jsx("h4", { children: t.sync?.received || 'Received' }), _jsx("p", { children: syncInfo.label })] })] })), _jsxs(ActionButton, { "$fullWidth": true, "$variant": "secondary", onClick: () => setIsScanning(false), children: [_jsx(FaStop, {}), " ", txt.stop_scanning] })] })) : (_jsxs(_Fragment, { children: [_jsxs(ActionButton, { "$fullWidth": true, onClick: () => setIsScanning(true), disabled: status === 'connected', style: { marginBottom: 12 }, children: [_jsx(FaCamera, {}), " ", txt.scan_qr] }), _jsx(Divider, { children: txt.or }), syncInfo && (_jsxs(InfoCard, { children: [_jsx("div", { className: "icon-box", children: syncInfo.type === 'thread' ? _jsx(FaLayerGroup, {}) :
                                                            syncInfo.type === 'full' ? _jsx(FaDatabase, {}) : _jsx(FaFileAlt, {}) }), _jsxs("div", { className: "content", children: [_jsx("h4", { children: t.sync?.received || 'Received' }), _jsx("p", { children: syncInfo.label })] })] })), _jsx(Label, { children: txt.manual_entry }), _jsxs(InputGroup, { children: [_jsx(Input, { placeholder: txt.enter_room_id, value: targetRoomId, onChange: (e) => setTargetRoomId(e.target.value), disabled: status === 'connected' }), _jsx(IconButton, { onClick: () => connectToPeer(), disabled: !targetRoomId || status === 'connected' || status === 'syncing', title: txt.connect, children: status === 'connected' ? _jsx(FaCheck, { style: { color: theme.colors.success } }) : _jsx(FaLink, {}) })] })] })) })), (statusMessage || status !== 'disconnected') && (_jsxs(ProgressContainer, { children: [(progress > 0) && _jsx(ProgressBar, { "$percent": progress }), _jsxs(StatusBox, { "$status": status, children: [_jsx("div", { className: "icon-area", children: status === 'connecting' || status === 'syncing' ? _jsx(FaSync, { className: "fa-spin" }) :
                                                        status === 'completed' ? _jsx(FaCheck, {}) :
                                                            status === 'error' ? _jsx(FaTimes, {}) :
                                                                status === 'connected' ? _jsx(FaLink, {}) : null }), _jsx("div", { children: statusMessage || (status === 'ready' ? txt.ready_to_share : status === 'connected' ? txt.connected : '') })] })] })), _jsxs("div", { style: {
                                        marginTop: '20px',
                                        padding: '12px',
                                        borderRadius: '10px',
                                        background: theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                                        border: `1px solid ${theme.colors.border}`,
                                        fontSize: '0.75rem',
                                        color: theme.colors.textSecondary,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        lineHeight: '1.4'
                                    }, children: [_jsx(FaShieldAlt, { style: { fontSize: '1rem', color: theme.colors.primary, flexShrink: 0 } }), _jsx("span", { children: language === 'ko'
                                                ? '모든 데이터는 엔드투엔드 암호화(E2EE)되어 안전하게 전송됩니다.'
                                                : 'All data is end-to-end encrypted (E2EE) for secure transit.' })] })] }), conflicts.length > 0 && (_jsxs("div", { style: {
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: theme.colors.background,
                                display: 'flex',
                                flexDirection: 'column',
                                zIndex: 10,
                                padding: '20px'
                            }, children: [_jsx("h3", { style: { margin: '0 0 16px', color: theme.colors.primary, fontSize: '1rem', fontWeight: 700 }, children: language === 'ko' ? `데이터 충돌 해결 (${currentConflictIndex + 1}/${conflicts.length})` : `Resolve Conflict (${currentConflictIndex + 1}/${conflicts.length})` }), _jsx("p", { style: { margin: '0 0 20px', fontSize: '0.85rem', color: theme.colors.textSecondary }, children: language === 'ko' ? '두 장치의 데이터가 다릅니다. 어떤 버전을 유지할까요?' : 'Data on both devices differ. Which version should be kept?' }), _jsxs("div", { style: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }, children: [_jsxs("div", { style: {
                                                padding: '12px',
                                                borderRadius: '12px',
                                                border: `1px solid ${theme.colors.border}`,
                                                background: theme.colors.surface
                                            }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }, children: [_jsx("span", { style: { fontWeight: 700, fontSize: '0.8rem', color: theme.colors.primary }, children: "Local (This Device)" }), _jsx("span", { style: { fontSize: '0.75rem', color: theme.colors.textSecondary }, children: conflicts[currentConflictIndex].localDate.toLocaleString() })] }), _jsx("h4", { style: { margin: '0 0 8px', fontSize: '0.9rem' }, children: conflicts[currentConflictIndex].title }), _jsx("div", { style: {
                                                        fontSize: '0.8rem',
                                                        color: theme.colors.textSecondary,
                                                        maxHeight: '100px',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'pre-wrap',
                                                        background: theme.colors.background,
                                                        padding: '8px',
                                                        borderRadius: '8px'
                                                    }, children: conflicts[currentConflictIndex].localContent || '(No content)' })] }), _jsxs("div", { style: {
                                                padding: '12px',
                                                borderRadius: '12px',
                                                border: `1px solid ${theme.colors.border}`,
                                                background: theme.colors.surface
                                            }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }, children: [_jsx("span", { style: { fontWeight: 700, fontSize: '0.8rem', color: '#f59e0b' }, children: "Remote (Other Device)" }), _jsx("span", { style: { fontSize: '0.75rem', color: theme.colors.textSecondary }, children: conflicts[currentConflictIndex].remoteDate.toLocaleString() })] }), _jsx("h4", { style: { margin: '0 0 8px', fontSize: '0.9rem' }, children: conflicts[currentConflictIndex].title }), _jsx("div", { style: {
                                                        fontSize: '0.8rem',
                                                        color: theme.colors.textSecondary,
                                                        maxHeight: '100px',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'pre-wrap',
                                                        background: theme.colors.background,
                                                        padding: '8px',
                                                        borderRadius: '8px'
                                                    }, children: conflicts[currentConflictIndex].remoteContent || '(No content)' })] })] }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }, children: [_jsx(ActionButton, { onClick: () => resolveCurrentConflict('local'), "$variant": "secondary", children: language === 'ko' ? '기존 버전 유지' : 'Keep Local' }), _jsx(ActionButton, { onClick: () => resolveCurrentConflict('remote'), "$variant": "secondary", children: language === 'ko' ? '받은 버전 유지' : 'Keep Remote' })] }), _jsx(ActionButton, { onClick: () => resolveCurrentConflict('both'), style: { width: '100%' }, children: language === 'ko' ? '둘 다 유지 (사본 생성)' : 'Keep Both (Create Copy)' })] }))] })] }) }));
    return ReactDOM.createPortal(modalContent, document.body);
};
