import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
const DEFAULT_SETTINGS = {
    headerLeft: '',
    headerCenter: '',
    headerRight: '',
    footerLeft: '',
    footerCenter: '',
    footerRight: '',
    pageNumber: 'bottom-center',
    pageNumberFormat: 'number',
    margins: { top: 15, right: 15, bottom: 15, left: 15 },
    showBorder: false,
    includeComments: false,
    excludeFirstPageNumber: false,
};
// ─── Storage helpers ─────────────────────────────────────────────────────
const STORAGE_KEY = (appName) => `${appName}-print-settings`;
export function loadPrintSettings(appName) {
    try {
        const raw = localStorage.getItem(STORAGE_KEY(appName));
        if (raw) {
            const parsed = JSON.parse(raw);
            return { ...DEFAULT_SETTINGS, ...parsed, margins: { ...DEFAULT_SETTINGS.margins, ...parsed?.margins } };
        }
    }
    catch { /* ignore */ }
    return { ...DEFAULT_SETTINGS };
}
function savePrintSettings(appName, settings) {
    localStorage.setItem(STORAGE_KEY(appName), JSON.stringify(settings));
}
// ─── Print execution ─────────────────────────────────────────────────────
// ─── Print execution ─────────────────────────────────────────────────────
export function executePrint(settings, title) {
    // Cleanup any existing print artifacts from previous runs
    document.getElementById('print-settings-style')?.remove();
    document.getElementById('print-total-pages-var')?.remove();
    const m = settings.margins;
    const printLayoutCss = buildPrintLayoutStyles(settings, title);
    // Inject unified style
    const styleEl = document.createElement('style');
    styleEl.id = 'print-settings-style';
    styleEl.textContent = `
        @media print {
            /* Global Reset & Page Metrics */
            html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
                width: 100% !important;
                height: auto !important;
                display: block !important;
                overflow: visible !important;
                color: black !important;
            }
            
            #root, #app-root, .MainWrapper, [class*="MainWrapper"], .ScrollContainer, [class*="ScrollContainer"] {
                height: auto !important;
                min-height: 0 !important;
                overflow: visible !important;
                position: static !important;
            }
            
            #root, #app-root {
                width: 100% !important;
                display: block !important;
            }



            .page-break {
                display: block !important;
                height: 0 !important;
                page-break-after: always !important;
                break-after: page !important;
                border: none !important;
                margin: 0 !important;
                padding: 0 !important;
            }

            /* Ensure page counter starts correctly (Cover: 0, Page 2: 1) */
            body {
                counter-reset: page 0;
            }

            /* Hide UI elements */
            header, nav, aside,
            [class*="Header"], [class*="header"], [class*="MobileHeader"],
            [class*="ActionBar"], [class*="ActionButton"],
            [class*="GoToBottomButton"], [class*="GoToTopButton"],
            [class*="ResizeHandle"], [class*="Overlay"],
            [class*="SidebarInactiveOverlay"],
            .no-print, button {
                display: none !important;
            }

            /* Conditional display for comments */
            .print-comments-section {
                display: ${settings.includeComments ? 'block' : 'none'} !important;
                height: auto !important;
                overflow: visible !important;
            }
            ${settings.includeComments ? `
            .print-comments-section * { visibility: visible !important; opacity: 1 !important; }
            .print-comments-section [class*="Header"], .print-comments-section [class*="header"] { display: flex !important; }
            ` : ''}

            /* Header/Footer Layouts via @page margin boxes */
            ${printLayoutCss}
        }
    `;
    document.head.appendChild(styleEl);
    // Temporarily change document title for filename
    const originalTitle = document.title;
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    const filename = `${title || 'Untitled'}_${dateStr}_${timeStr}`;
    document.title = filename;
    // We completely skip the flawed JS-based clone height measurement.
    // Instead, we will rely entirely on the native browser CSS counter(pages).
    // Stabilizing Delay
    setTimeout(() => {
        window.print();
        setTimeout(() => {
            document.title = originalTitle;
            document.getElementById('print-settings-style')?.remove();
            document.getElementById('print-total-pages-var')?.remove();
        }, 1000);
    }, 300);
}
function resolveVariable(text, title) {
    const now = new Date();
    return text
        .replace(/\{title\}/gi, title || 'Untitled')
        .replace(/\{date\}/gi, now.toLocaleDateString())
        .replace(/\{time\}/gi, now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
        .replace(/\{datetime\}/gi, now.toLocaleString());
}
function buildPrintLayoutStyles(settings, title) {
    const m = settings.margins;
    const borderStyleValue = settings.showBorder ? '0.2pt solid #ccc' : 'none';
    const resolver = (text) => resolveVariable(text, title);
    const escape = (s) => s.replace(/"/g, '\\"');
    const regions = {
        '@top-left': escape(resolver(settings.headerLeft)),
        '@top-center': escape(resolver(settings.headerCenter)),
        '@top-right': escape(resolver(settings.headerRight)),
        '@bottom-left': escape(resolver(settings.footerLeft)),
        '@bottom-center': escape(resolver(settings.footerCenter)),
        '@bottom-right': escape(resolver(settings.footerRight)),
    };
    const counterContent = (format) => {
        // Use browser-native CSS page counters instead of JS-calculated variables!
        switch (format) {
            case 'dash-number': return `"- " counter(page) " -"`;
            case 'page-n': return `"Page " counter(page)`;
            default: return `counter(page)`;
        }
    };
    const processedRegions = {};
    for (const [region, content] of Object.entries(regions)) {
        if (content)
            processedRegions[region] = `"${content}"`;
    }
    if (settings.pageNumber !== 'none') {
        const pNumRegion = `@${settings.pageNumber}`;
        const existing = processedRegions[pNumRegion];
        const pNumContent = counterContent(settings.pageNumberFormat);
        processedRegions[pNumRegion] = existing ? `${existing} " " ${pNumContent}` : pNumContent;
    }
    const hasAnyTop = !!(processedRegions['@top-left'] || processedRegions['@top-center'] || processedRegions['@top-right']);
    const hasAnyBottom = !!(processedRegions['@bottom-left'] || processedRegions['@bottom-center'] || processedRegions['@bottom-right']);
    const topBorder = settings.showBorder && hasAnyTop ? borderStyleValue : 'none';
    const bottomBorder = settings.showBorder && hasAnyBottom ? borderStyleValue : 'none';
    const marginBoxBase = `font-size: 8pt; color: #666; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;`;
    const clearAllMargins = `
        @top-left { content: none !important; border: none !important; }
        @top-center { content: none !important; border: none !important; }
        @top-right { content: none !important; border: none !important; }
        @bottom-left { content: none !important; border: none !important; }
        @bottom-center { content: none !important; border: none !important; }
        @bottom-right { content: none !important; border: none !important; }
    `;
    return `
        /* Default Page Style */
        @page {
            size: auto;
            margin: ${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm;
            counter-increment: page;
            
            @top-left { content: ${processedRegions['@top-left'] || 'none'}; ${marginBoxBase} vertical-align: bottom; padding-bottom: 2mm; border-bottom: ${topBorder}; }
            @top-center { content: ${processedRegions['@top-center'] || 'none'}; ${marginBoxBase} vertical-align: bottom; padding-bottom: 2mm; border-bottom: ${topBorder}; }
            @top-right { content: ${processedRegions['@top-right'] || 'none'}; ${marginBoxBase} vertical-align: bottom; padding-bottom: 2mm; border-bottom: ${topBorder}; }
            @bottom-left { content: ${processedRegions['@bottom-left'] || 'none'}; ${marginBoxBase} vertical-align: top; padding-top: 2mm; border-top: ${bottomBorder}; }
            @bottom-center { content: ${processedRegions['@bottom-center'] || 'none'}; ${marginBoxBase} vertical-align: top; padding-top: 2mm; border-top: ${bottomBorder}; }
            @bottom-right { content: ${processedRegions['@bottom-right'] || 'none'}; ${marginBoxBase} vertical-align: top; padding-top: 2mm; border-top: ${bottomBorder}; }
        }

        /* Exclusion for first page */
        ${settings.excludeFirstPageNumber ? `
        @page :first {
            counter-increment: none;
            counter-set: page 0;
            ${clearAllMargins}
        }
        ` : ''}
    `;
}
const PRESETS = [
    {
        label: 'None', labelKo: '없음',
        apply: s => ({ ...s, headerLeft: '', headerCenter: '', headerRight: '', footerLeft: '', footerCenter: '', footerRight: '', pageNumber: 'none', showBorder: false }),
    },
    {
        label: 'Simple No.', labelKo: '간단 번호',
        apply: s => ({ ...s, headerLeft: '', headerCenter: '', headerRight: '', footerLeft: '', footerCenter: '', footerRight: '', pageNumber: 'bottom-center', pageNumberFormat: 'number', showBorder: false }),
    },
    {
        label: 'Standard', labelKo: '표준',
        apply: s => ({ ...s, headerLeft: '{title}', headerCenter: '', headerRight: '{date}', footerLeft: '', footerCenter: '', footerRight: '', pageNumber: 'bottom-center', pageNumberFormat: 'number', showBorder: true }),
    },
    {
        label: 'Academic', labelKo: '학술용',
        apply: s => ({ ...s, headerLeft: '', headerCenter: '{title}', headerRight: '', footerLeft: '{date}', footerCenter: '', footerRight: '', pageNumber: 'bottom-right', pageNumberFormat: 'page-n', showBorder: true }),
    },
    {
        label: 'Archive', labelKo: '기록용',
        apply: s => ({ ...s, headerLeft: '{date} {time}', headerCenter: '{title}', headerRight: '', footerLeft: 'MemoSuite', footerCenter: '', footerRight: '', pageNumber: 'bottom-right', pageNumberFormat: 'dash-number', showBorder: true }),
    },
];
// ─── Translations ────────────────────────────────────────────────────────
const T = {
    en: {
        title: 'Print Settings',
        presets: 'Presets',
        header: 'Header',
        footer: 'Footer',
        left: 'Left',
        center: 'Center',
        right: 'Right',
        pageNumber: 'Page Number',
        position: 'Position',
        format: 'Format',
        margins: 'Margins (mm)',
        top: 'Top',
        bottom: 'Bottom',
        showBorder: 'Separator line',
        variables: 'Variables: {title}, {date}, {time}, {datetime}',
        print: 'Print',
        cancel: 'Cancel',
        none: 'None',
        bottomCenter: 'Bottom Center',
        bottomLeft: 'Bottom Left',
        bottomRight: 'Bottom Right',
        topCenter: 'Top Center',
        topLeft: 'Top Left',
        topRight: 'Top Right',
        fmtNumber: '1, 2, 3',
        fmtDash: '- 1 -, - 2 -',
        fmtPage: 'Page 1, Page 2',
        fmtTotal: '1 / 5',
        includeComments: 'Include Comments',
        excludeFirstPageNumber: 'Exclude on first page',
    },
    ko: {
        title: '인쇄 설정',
        presets: '프리셋',
        header: '머리글',
        footer: '꼬리글',
        left: '왼쪽',
        center: '가운데',
        right: '오른쪽',
        pageNumber: '페이지 번호',
        position: '위치',
        format: '형식',
        margins: '여백 (mm)',
        top: '위',
        bottom: '아래',
        showBorder: '구분선',
        variables: '변수: {title}, {date}, {time}, {datetime}',
        print: '인쇄',
        cancel: '취소',
        none: '없음',
        bottomCenter: '아래 가운데',
        bottomLeft: '아래 왼쪽',
        bottomRight: '아래 오른쪽',
        topCenter: '위 가운데',
        topLeft: '위 왼쪽',
        topRight: '위 오른쪽',
        fmtNumber: '1, 2, 3',
        fmtDash: '- 1 -, - 2 -',
        fmtPage: 'Page 1, Page 2',
        fmtTotal: '1 / 5',
        includeComments: '댓글 포함',
        excludeFirstPageNumber: '첫 페이지는 페이지 번호 제외',
    },
};
// ─── Styled Components ───────────────────────────────────────────────────
const Overlay = styled.div `
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.45);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99999;
`;
const ModalBox = styled.div `
    background: ${({ theme }) => theme.colors.surface};
    border-radius: 16px;
    width: 480px;
    max-width: 92vw;
    max-height: 88vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    display: flex;
    flex-direction: column;
`;
const ModalHeader = styled.div `
    padding: 20px 24px 12px;
    font-size: 1.15rem;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text};
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;
const ModalBody = styled.div `
    padding: 16px 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    overflow-y: auto;
`;
const Section = styled.div `
    display: flex;
    flex-direction: column;
    gap: 8px;
`;
const SectionTitle = styled.div `
    font-size: 0.78rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: ${({ theme }) => theme.colors.textSecondary};
`;
const PresetRow = styled.div `
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
`;
const PresetChip = styled.button `
    padding: 5px 12px;
    border-radius: 20px;
    font-size: 0.78rem;
    font-weight: 500;
    border: 1px solid ${({ theme, $active }) => $active ? theme.colors.primary : theme.colors.border};
    background: ${({ theme, $active }) => $active ? theme.colors.primary + '18' : 'transparent'};
    color: ${({ theme, $active }) => $active ? theme.colors.primary : theme.colors.text};
    cursor: pointer;
    transition: all 0.15s;
    &:hover {
        border-color: ${({ theme }) => theme.colors.primary};
    }
`;
const InputRow = styled.div `
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 8px;
`;
const InputGroup = styled.div `
    display: flex;
    flex-direction: column;
    gap: 3px;
`;
const InputLabel = styled.label `
    font-size: 0.7rem;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-weight: 500;
`;
const StyledInput = styled.input `
    padding: 7px 10px;
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: 8px;
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text};
    font-size: 0.82rem;
    outline: none;
    transition: border-color 0.15s;
    width: 100%;
    box-sizing: border-box;
    &:focus {
        border-color: ${({ theme }) => theme.colors.primary};
    }
`;
const SelectWrapper = styled.select `
    padding: 7px 10px;
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: 8px;
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text};
    font-size: 0.82rem;
    outline: none;
    cursor: pointer;
    &:focus {
        border-color: ${({ theme }) => theme.colors.primary};
    }
`;
const MarginGrid = styled.div `
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr;
    gap: 8px;
`;
const NumberInput = styled(StyledInput).attrs({ type: 'number' }) `
    text-align: center;
    -moz-appearance: textfield;
    &::-webkit-outer-spin-button,
    &::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }
`;
const CheckboxRow = styled.label `
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.82rem;
    color: ${({ theme }) => theme.colors.text};
    cursor: pointer;
`;
const VariableHint = styled.div `
    font-size: 0.72rem;
    color: ${({ theme }) => theme.colors.textSecondary};
    padding: 6px 10px;
    background: ${({ theme }) => theme.colors.background};
    border-radius: 6px;
    font-family: 'SF Mono', 'Fira Code', monospace;
`;
const ModalFooter = styled.div `
    padding: 12px 24px 16px;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    border-top: 1px solid ${({ theme }) => theme.colors.border};
`;
const FooterButton = styled.button `
    padding: 9px 22px;
    border-radius: 10px;
    font-size: 0.88rem;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid ${({ theme, $primary }) => $primary ? theme.colors.primary : theme.colors.border};
    background: ${({ theme, $primary }) => $primary ? theme.colors.primary : 'transparent'};
    color: ${({ $primary, theme }) => $primary ? '#fff' : theme.colors.text};
    transition: all 0.15s;
    &:hover {
        filter: brightness(1.05);
        transform: translateY(-1px);
    }
`;
export const PrintSettingsModal = ({ isOpen, onClose, appName, language = 'en', title, }) => {
    const t = (language === 'ko' ? T.ko : T.en);
    const [settings, setSettings] = useState(() => loadPrintSettings(appName));
    const [activePreset, setActivePreset] = useState(null);
    useEffect(() => {
        if (isOpen) {
            setSettings(loadPrintSettings(appName));
        }
    }, [isOpen, appName]);
    const update = useCallback((key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
        setActivePreset(null);
    }, []);
    const updateMargin = useCallback((side, value) => {
        setSettings(prev => ({ ...prev, margins: { ...prev.margins, [side]: value } }));
        setActivePreset(null);
    }, []);
    const applyPreset = useCallback((idx) => {
        setActivePreset(idx);
        setSettings(prev => PRESETS[idx].apply(prev));
    }, []);
    const handlePrint = useCallback(() => {
        savePrintSettings(appName, settings);
        onClose();
        setTimeout(() => executePrint(settings, title), 100);
    }, [appName, settings, onClose, title]);
    if (!isOpen)
        return null;
    return (_jsx(Overlay, { onClick: onClose, children: _jsxs(ModalBox, { onClick: e => e.stopPropagation(), children: [_jsx(ModalHeader, { children: t.title }), _jsxs(ModalBody, { children: [_jsx(Section, { children: _jsxs(CheckboxRow, { children: [_jsx("input", { type: "checkbox", checked: settings.includeComments, onChange: e => update('includeComments', e.target.checked) }), _jsx("span", { style: { fontWeight: 600 }, children: t.includeComments })] }) }), _jsxs(Section, { children: [_jsx(SectionTitle, { children: t.presets }), _jsx(PresetRow, { children: PRESETS.map((p, i) => (_jsx(PresetChip, { "$active": activePreset === i, onClick: () => applyPreset(i), children: language === 'ko' ? p.labelKo : p.label }, i))) })] }), _jsxs(Section, { children: [_jsx(SectionTitle, { children: t.header }), _jsxs(InputRow, { children: [_jsxs(InputGroup, { children: [_jsx(InputLabel, { children: t.left }), _jsx(StyledInput, { value: settings.headerLeft, onChange: e => update('headerLeft', e.target.value), placeholder: "" })] }), _jsxs(InputGroup, { children: [_jsx(InputLabel, { children: t.center }), _jsx(StyledInput, { value: settings.headerCenter, onChange: e => update('headerCenter', e.target.value), placeholder: "" })] }), _jsxs(InputGroup, { children: [_jsx(InputLabel, { children: t.right }), _jsx(StyledInput, { value: settings.headerRight, onChange: e => update('headerRight', e.target.value), placeholder: "" })] })] })] }), _jsxs(Section, { children: [_jsx(SectionTitle, { children: t.footer }), _jsxs(InputRow, { children: [_jsxs(InputGroup, { children: [_jsx(InputLabel, { children: t.left }), _jsx(StyledInput, { value: settings.footerLeft, onChange: e => update('footerLeft', e.target.value), placeholder: "" })] }), _jsxs(InputGroup, { children: [_jsx(InputLabel, { children: t.center }), _jsx(StyledInput, { value: settings.footerCenter, onChange: e => update('footerCenter', e.target.value), placeholder: "" })] }), _jsxs(InputGroup, { children: [_jsx(InputLabel, { children: t.right }), _jsx(StyledInput, { value: settings.footerRight, onChange: e => update('footerRight', e.target.value), placeholder: "" })] })] }), _jsx(VariableHint, { children: t.variables })] }), _jsxs(Section, { children: [_jsx(SectionTitle, { children: t.pageNumber }), _jsxs(InputRow, { children: [_jsxs(InputGroup, { children: [_jsx(InputLabel, { children: t.position }), _jsxs(SelectWrapper, { value: settings.pageNumber, onChange: e => update('pageNumber', e.target.value), children: [_jsx("option", { value: "none", children: t.none }), _jsx("option", { value: "bottom-center", children: t.bottomCenter }), _jsx("option", { value: "bottom-left", children: t.bottomLeft }), _jsx("option", { value: "bottom-right", children: t.bottomRight }), _jsx("option", { value: "top-center", children: t.topCenter }), _jsx("option", { value: "top-left", children: t.topLeft }), _jsx("option", { value: "top-right", children: t.topRight })] })] }), _jsxs(InputGroup, { children: [_jsx(InputLabel, { children: t.format }), _jsxs(SelectWrapper, { value: settings.pageNumberFormat, onChange: e => update('pageNumberFormat', e.target.value), disabled: settings.pageNumber === 'none', children: [_jsx("option", { value: "number", children: t.fmtNumber }), _jsx("option", { value: "dash-number", children: t.fmtDash }), _jsx("option", { value: "page-n", children: t.fmtPage })] })] }), _jsx(InputGroup, { style: { justifyContent: 'flex-end' }, children: _jsxs(CheckboxRow, { children: [_jsx("input", { type: "checkbox", checked: settings.showBorder, onChange: e => update('showBorder', e.target.checked) }), t.showBorder] }) })] }), _jsxs(CheckboxRow, { style: { marginTop: '8px' }, children: [_jsx("input", { type: "checkbox", checked: settings.excludeFirstPageNumber, onChange: e => update('excludeFirstPageNumber', e.target.checked), disabled: settings.pageNumber === 'none' }), t.excludeFirstPageNumber] })] }), _jsxs(Section, { children: [_jsx(SectionTitle, { children: t.margins }), _jsxs(MarginGrid, { children: [_jsxs(InputGroup, { children: [_jsx(InputLabel, { children: t.top }), _jsx(NumberInput, { value: settings.margins.top, min: 0, max: 50, onChange: e => updateMargin('top', Number(e.target.value)) })] }), _jsxs(InputGroup, { children: [_jsx(InputLabel, { children: t.right }), _jsx(NumberInput, { value: settings.margins.right, min: 0, max: 50, onChange: e => updateMargin('right', Number(e.target.value)) })] }), _jsxs(InputGroup, { children: [_jsx(InputLabel, { children: t.bottom }), _jsx(NumberInput, { value: settings.margins.bottom, min: 0, max: 50, onChange: e => updateMargin('bottom', Number(e.target.value)) })] }), _jsxs(InputGroup, { children: [_jsx(InputLabel, { children: t.left }), _jsx(NumberInput, { value: settings.margins.left, min: 0, max: 50, onChange: e => updateMargin('left', Number(e.target.value)) })] })] })] })] }), _jsxs(ModalFooter, { children: [_jsx(FooterButton, { onClick: onClose, children: t.cancel }), _jsx(FooterButton, { "$primary": true, onClick: handlePrint, children: t.print })] })] }) }));
};
