import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useCallback, useRef } from 'react';
import styled from 'styled-components';
/* ─── Paste Fallback Dialog (bottom sheet) ─── */
const Backdrop = styled.div `
  position: fixed;
  inset: 0;
  z-index: 9998;
  background: rgba(0, 0, 0, 0.4);
`;
const Sheet = styled.div `
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 16px 16px 0 0;
  padding: 16px;
  padding-bottom: max(16px, env(safe-area-inset-bottom));
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 50vh;
`;
const SheetHeader = styled.div `
  display: flex;
  justify-content: space-between;
  align-items: center;
`;
const SheetTitle = styled.div `
  font-size: 15px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`;
const CloseBtn = styled.button `
  background: none;
  border: none;
  font-size: 20px;
  color: ${({ theme }) => theme.colors.textSecondary};
  cursor: pointer;
  padding: 4px 8px;
`;
const Hint = styled.div `
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;
const PasteArea = styled.textarea `
  flex: 1;
  min-height: 100px;
  padding: 12px;
  font-size: 15px;
  line-height: 1.6;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  resize: none;
  outline: none;
  -webkit-user-select: text !important;
  user-select: text !important;
  -webkit-touch-callout: default !important;

  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;
const ConfirmBtn = styled.button `
  padding: 12px;
  border-radius: 10px;
  border: none;
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;

  &:active {
    opacity: 0.75;
  }
`;
/* ─── Hook ─── */
/**
 * useMobileClipboard — Galaxy Tab 복사/붙여넣기 우회
 *
 * CodeMirror의 long-press 컨텍스트 메뉴 버그를 우회하기 위해
 * 에디터 툴바에 복사/잘라내기/붙여넣기 버튼을 추가합니다.
 * 클립보드 읽기 권한이 거부되면 붙여넣기용 바텀시트 다이얼로그를 표시합니다.
 */
export const useMobileClipboard = (cmRef, language) => {
    const [showPasteSheet, setShowPasteSheet] = useState(false);
    const pasteRef = useRef(null);
    const ko = language === 'ko';
    const handleCopy = useCallback(() => {
        const cm = cmRef.current;
        if (!cm)
            return;
        const sel = cm.getSelection();
        if (sel) {
            navigator.clipboard.writeText(sel).catch(() => { });
        }
    }, [cmRef]);
    const handleCut = useCallback(() => {
        const cm = cmRef.current;
        if (!cm)
            return;
        const sel = cm.getSelection();
        if (sel) {
            navigator.clipboard.writeText(sel).then(() => {
                cm.replaceSelection('');
                cm.focus();
            }).catch(() => { });
        }
    }, [cmRef]);
    const handlePaste = useCallback(async () => {
        const cm = cmRef.current;
        if (!cm)
            return;
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                cm.replaceSelection(text);
                cm.focus();
            }
        }
        catch {
            // Clipboard API denied → show paste sheet
            setShowPasteSheet(true);
        }
    }, [cmRef]);
    const confirmPaste = useCallback(() => {
        const cm = cmRef.current;
        const textarea = pasteRef.current;
        if (cm && textarea && textarea.value) {
            cm.replaceSelection(textarea.value);
            cm.focus();
        }
        setShowPasteSheet(false);
    }, [cmRef]);
    /** Toolbar button configs for EasyMDE (mobile-only) */
    const clipboardButtons = [
        {
            name: 'clipboard-copy',
            action: handleCopy,
            className: 'fa fa-files-o',
            title: ko ? '복사' : 'Copy',
        },
        {
            name: 'clipboard-cut',
            action: handleCut,
            className: 'fa fa-scissors',
            title: ko ? '잘라내기' : 'Cut',
        },
        {
            name: 'clipboard-paste',
            action: handlePaste,
            className: 'fa fa-paste',
            title: ko ? '붙여넣기' : 'Paste',
        },
    ];
    const renderPasteSheet = useCallback(() => {
        if (!showPasteSheet)
            return null;
        return (_jsxs(_Fragment, { children: [_jsx(Backdrop, { onClick: () => setShowPasteSheet(false) }), _jsxs(Sheet, { children: [_jsxs(SheetHeader, { children: [_jsx(SheetTitle, { children: ko ? '📋 붙여넣기' : '📋 Paste' }), _jsx(CloseBtn, { onClick: () => setShowPasteSheet(false), children: "\u2715" })] }), _jsx(Hint, { children: ko
                                ? '아래 영역을 길게 눌러 붙여넣기 하신 후, 확인 버튼을 누르세요.'
                                : 'Long press below to paste, then tap Confirm.' }), _jsx(PasteArea, { ref: pasteRef, autoFocus: true, placeholder: ko ? '여기에 붙여넣기...' : 'Paste here...' }), _jsx(ConfirmBtn, { onClick: confirmPaste, children: ko ? '확인' : 'Confirm' })] })] }));
    }, [showPasteSheet, ko, confirmPaste]);
    return {
        clipboardButtons,
        renderPasteSheet,
    };
};
