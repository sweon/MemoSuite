import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled, { keyframes } from 'styled-components';

/* ─── animations ─── */
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(76, 110, 245, 0.4); }
  50%      { box-shadow: 0 0 0 8px rgba(76, 110, 245, 0); }
`;

/* ─── styled ─── */
const FloatingBar = styled.div<{ $visible: boolean }>`
  position: fixed;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: ${({ $visible }) => ($visible ? 'flex' : 'none')};
  gap: 6px;
  padding: 6px 10px;
  border-radius: 28px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.18);
  animation: ${fadeIn} 0.2s ease-out;
  align-items: center;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
`;

const ActionBtn = styled.button<{ $variant?: 'primary' | 'danger' | 'default' }>`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 7px 14px;
  border: none;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
  color: ${({ $variant, theme }) =>
        $variant === 'primary' ? '#fff'
            : $variant === 'danger' ? '#fff'
                : theme.colors.text};
  background: ${({ $variant, theme }) =>
        $variant === 'primary' ? theme.colors.primary
            : $variant === 'danger' ? '#e03131'
                : theme.colors.background};

  &:active {
    transform: scale(0.94);
    opacity: 0.85;
  }

  &:disabled {
    opacity: 0.4;
    pointer-events: none;
  }
`;

const SelectModeIndicator = styled.div<{ $step: 'start' | 'end' }>`
  font-size: 11px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 12px;
  background: ${({ $step }) => ($step === 'start' ? '#4c6ef5' : '#f59f00')};
  color: #fff;
  animation: ${pulse} 1.5s infinite;
`;

const CloseBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 16px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:active {
    transform: scale(0.9);
  }
`;

const Toast = styled.div<{ $visible: boolean }>`
  position: fixed;
  bottom: 72px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 20px;
  border-radius: 20px;
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  z-index: 10000;
  pointer-events: none;
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transition: opacity 0.3s ease;
`;

/* ─── Custom Hook ─── */
export const useTouchClipboard = (
    cmRef: React.MutableRefObject<any>,
    language: string,
    onChange: (value: string) => void,
) => {
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectStep, setSelectStep] = useState<'start' | 'end'>('start');
    const [hasSelection, setHasSelection] = useState(false);
    const [toast, setToast] = useState('');
    const startPosRef = useRef<any>(null);
    const toastTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const ko = language === 'ko';

    const showToast = useCallback((msg: string) => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setToast(msg);
        toastTimerRef.current = setTimeout(() => setToast(''), 1800);
    }, []);

    /* ─── poll CodeMirror selection ─── */
    useEffect(() => {
        if (!selectionMode) return;
        const interval = setInterval(() => {
            const cm = cmRef.current;
            if (!cm) return;
            const sel = cm.getSelection();
            setHasSelection(!!sel);
        }, 300);
        return () => clearInterval(interval);
    }, [selectionMode, cmRef]);

    /* ─── touch handler ─── */
    useEffect(() => {
        if (!selectionMode) return;
        const cm = cmRef.current;
        if (!cm) return;

        const wrapper = cm.getWrapperElement();

        const handleTouch = (e: TouchEvent) => {
            if (e.touches.length !== 1) return;
            const touch = e.touches[0];
            const pos = cm.coordsChar({ left: touch.clientX, top: touch.clientY });

            if (selectStep === 'start') {
                startPosRef.current = pos;
                cm.setCursor(pos);
                setSelectStep('end');
                showToast(ko ? '끝 위치를 탭하세요' : 'Tap end position');
                e.preventDefault();
                e.stopPropagation();
            } else {
                if (startPosRef.current) {
                    cm.setSelection(startPosRef.current, pos);
                    setHasSelection(true);
                    setSelectStep('start');
                    showToast(ko ? '선택 완료! 복사/잘라내기를 누르세요' : 'Selected! Tap Copy or Cut');
                }
                e.preventDefault();
                e.stopPropagation();
            }
        };

        wrapper.addEventListener('touchstart', handleTouch, { capture: true, passive: false });
        return () => {
            wrapper.removeEventListener('touchstart', handleTouch, { capture: true } as EventListenerOptions);
        };
    }, [selectionMode, selectStep, cmRef, ko, showToast]);

    /* ─── actions ─── */
    const copyToClipboard = useCallback(async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.cssText = 'position:fixed;left:-9999px';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        }
    }, []);

    const handleCopy = useCallback(async () => {
        const cm = cmRef.current;
        if (!cm) return;
        const text = cm.getSelection();
        if (!text) { showToast(ko ? '선택된 텍스트 없음' : 'No text selected'); return; }
        await copyToClipboard(text);
        showToast(ko ? '복사됨!' : 'Copied!');
    }, [cmRef, ko, showToast, copyToClipboard]);

    const handleCut = useCallback(async () => {
        const cm = cmRef.current;
        if (!cm) return;
        const text = cm.getSelection();
        if (!text) { showToast(ko ? '선택된 텍스트 없음' : 'No text selected'); return; }
        await copyToClipboard(text);
        cm.replaceSelection('');
        onChange(cm.getValue());
        setHasSelection(false);
        showToast(ko ? '잘라냈습니다!' : 'Cut!');
    }, [cmRef, ko, showToast, onChange, copyToClipboard]);

    const handlePaste = useCallback(async () => {
        const cm = cmRef.current;
        if (!cm) return;
        try {
            const text = await navigator.clipboard.readText();
            cm.replaceSelection(text);
            onChange(cm.getValue());
            showToast(ko ? '붙여넣기 완료!' : 'Pasted!');
        } catch {
            showToast(ko ? '클립보드 접근 실패' : 'Clipboard access denied');
        }
    }, [cmRef, ko, showToast, onChange]);

    const handleSelectAll = useCallback(() => {
        const cm = cmRef.current;
        if (!cm) return;
        const lastLine = cm.lastLine();
        const lastCh = cm.getLine(lastLine).length;
        cm.setSelection({ line: 0, ch: 0 }, { line: lastLine, ch: lastCh });
        setHasSelection(true);
        showToast(ko ? '전체 선택됨' : 'All selected');
    }, [cmRef, ko, showToast]);

    const enterMode = useCallback(() => {
        setSelectionMode(true);
        setSelectStep('start');
        setHasSelection(false);
        startPosRef.current = null;
        showToast(ko ? '시작 위치를 탭하세요' : 'Tap start position');
    }, [ko, showToast]);

    const exitMode = useCallback(() => {
        setSelectionMode(false);
        setSelectStep('start');
        setHasSelection(false);
        startPosRef.current = null;
    }, []);

    const renderToolbar = useCallback(() => (
        <>
            <Toast $visible={!!toast}>{toast}</Toast>
            <FloatingBar $visible={selectionMode}>
                {!hasSelection && (
                    <SelectModeIndicator $step={selectStep}>
                        {selectStep === 'start'
                            ? (ko ? '① 시작' : '① Start')
                            : (ko ? '② 끝' : '② End')}
                    </SelectModeIndicator>
                )}
                <ActionBtn onClick={handleSelectAll} $variant="default">
                    {ko ? '전체' : 'All'}
                </ActionBtn>
                <ActionBtn onClick={handleCopy} $variant="primary" disabled={!hasSelection}>
                    {ko ? '복사' : 'Copy'}
                </ActionBtn>
                <ActionBtn onClick={handleCut} $variant="danger" disabled={!hasSelection}>
                    {ko ? '잘라내기' : 'Cut'}
                </ActionBtn>
                <ActionBtn onClick={handlePaste} $variant="default">
                    {ko ? '붙여넣기' : 'Paste'}
                </ActionBtn>
                <CloseBtn onClick={exitMode}>✕</CloseBtn>
            </FloatingBar>
        </>
    ), [toast, selectionMode, hasSelection, selectStep, ko, handleSelectAll, handleCopy, handleCut, handlePaste, exitMode]);

    return {
        selectionMode,
        enterMode,
        exitMode,
        renderToolbar,
    };
};
