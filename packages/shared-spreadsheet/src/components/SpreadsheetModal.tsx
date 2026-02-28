import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
// @ts-ignore
import { createPortal } from 'react-dom';
import { Workbook, type WorkbookInstance } from "@fortune-sheet/react";
import "@fortune-sheet/react/dist/index.css";
import styled from 'styled-components';
import { X, Save, Keyboard } from 'lucide-react';
const XIcon = X as any;
const SaveIcon = Save as any;
const KeyboardIcon = Keyboard as any;
import { v4 as uuidv4 } from 'uuid';
import {
  exportToolBarItem,
  importToolBarItem,
  FortuneExcelHelper,
} from "@corbe30/fortune-excel";

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
  padding: 0;
`;

const ModalContent = styled.div`
  background-color: white;
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background-color: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  flex-shrink: 0;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 16px;
  color: #343a40;
  font-weight: 600;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  
  ${props => props.$variant === 'primary' ? `
    background-color: #228be6;
    color: white;
    &:hover {
      background-color: #1c7ed6;
    }
  ` : props.$variant === 'danger' ? `
    background-color: #fa5252;
    color: white;
    &:hover {
      background-color: #e03131;
    }
  ` : `
    background-color: transparent;
    color: #495057;
    &:hover {
      background-color: #e9ecef;
    }
  `}

  &:disabled {
    opacity: 0.5;
    filter: grayscale(0.5);
    cursor: not-allowed;
    pointer-events: none;
    box-shadow: none;
  }
`;

const EditorContainer = styled.div`
  flex: 1;
  overflow: hidden;
  position: relative;
  width: 100%;
  height: 100%;

  /* Tier 1: Cell Data and Inputs (High Contrast) */
  .luckysheet-cell-text,
  .luckysheet-inline-string,
  .luckysheet-input-box-inner,
  .luckysheet-wa-editor,
  .luckysheet-rich-text-editor {
    color: #000000 !important;
    -webkit-text-fill-color: #000000 !important;
  }
  
  /* Tier 2: UI Labels and Toolbar (Softer Contrast) */
  .luckysheet-formula-name-box,
  .luckysheet-formula-name-box div,
  .luckysheet-input-box-index,
  .luckysheet-input-box-index div,
  .luckysheet-input-box-index span,
  .luckysheet-name-box,
  .fortune-name-box,
  .fortune-formula-bar,
  .fortune-formula-name-box,
  .fortune-formula-name-box div,
  .luckysheet-toolbar-container,
  .fortune-toolbar,
  .luckysheet-toolbar-button,
  .fortune-toolbar-button,
  .luckysheet-toolbar-button span,
  .fortune-toolbar-button span,
  .luckysheet-toolbar-combo-button,
  .luckysheet-toolbar-combo-button-text {
    color: #333333 !important;
    opacity: 1 !important;
    visibility: visible !important;
    font-weight: 400 !important;
  }
  
  .luckysheet-input-box-inner,
  .luckysheet-wa-editor,
  .luckysheet-rich-text-editor {
    background-color: #ffffff !important;
  }

  .luckysheet-cols-header,
  .luckysheet-rows-header,
  .luckysheet-column-header-title,
  .luckysheet-row-header-title {
    color: #495057 !important;
    background: #f1f3f5 !important;
    -webkit-text-fill-color: #495057 !important;
  }

  /* Specific kill-switch for help overlays */
  .luckysheet-keyboard-manual, 
  #luckysheet-keyboard-manual,
  .fortune-keyboard-shortcuts,
  .luckysheet-modal-dialog-mask {
    display: none !important;
    visibility: hidden !important;
    pointer-events: none !important;
  }
`;

// Exit Confirmation Dialog
const Backdrop = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20000;
`;

const ConfirmDialog = styled.div`
  background: white;
  padding: 24px;
  border-radius: 12px;
  min-width: 300px;
  max-width: 90vw;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
`;

const DialogTitle = styled.h3`
  margin: 0 0 12px 0;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
`;

const DialogMessage = styled.p`
  margin: 0 0 24px 0;
  color: #4b5563;
  line-height: 1.5;
`;



interface SpreadsheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  onAutosave?: (data: any) => void;
  initialData?: any;
  language?: 'en' | 'ko';
}

const defaultSheetData = [{
  name: "Sheet1",
  index: "0",
  status: 1, // Marks sheet as active to prevent auto-triggering the help manual
  order: 0,
  celldata: [],
  row: 60,
  column: 26,
  config: {},
  pivotTable: null,
  isPivotTable: false,
}];

export const SpreadsheetModal: React.FC<SpreadsheetModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onAutosave,
  initialData,
  language = 'en'
}) => {
  const [mountKey, setMountKey] = useState(() => uuidv4());
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Use a ref to track if we've pushed our history state
  const historyStatePushedRef = useRef(false);
  const mountTimeRef = useRef(Date.now());
  const isInternalCloseRef = useRef(false);
  const isInitialLoadRef = useRef(false);

  const [workbookData, setWorkbookData] = useState<any[]>(() => {
    if (initialData && Array.isArray(initialData) && initialData.length > 0) {
      return JSON.parse(JSON.stringify(initialData));
    }
    return JSON.parse(JSON.stringify(defaultSheetData));
  });

  const workbookRef = useRef<WorkbookInstance | null>(null);

  const labels = useMemo(() => ({
    title: language === 'ko' ? '스프레드시트 편집기' : 'Spreadsheet Editor',
    exit: language === 'ko' ? '종료' : 'Exit',
    save: language === 'ko' ? '저장' : 'Save',
    saveExit: language === 'ko' ? '저장 및 종료' : 'Save and Exit',
    exitNoSave: language === 'ko' ? '저장하지 않고 종료' : 'Exit without Saving',
    cancel: language === 'ko' ? '취소' : 'Cancel',
    exitTitle: language === 'ko' ? '종료하시겠습니까?' : 'Exit Spreadsheet?',
    exitMessage: language === 'ko' ? '변경사항을 취소하시겠습니까?' : 'Are you sure you want to discard your changes?',
    keyboard: language === 'ko' ? '입력' : 'Keyboard',
    saving: language === 'ko' ? '저장 중...' : 'Saving...',
    saved: language === 'ko' ? '저장됨!' : 'Saved!',
  }), [language]);

  // Handle open/reset
  useEffect(() => {
    if (isOpen) {
      mountTimeRef.current = Date.now();
      isInternalCloseRef.current = false;
      historyStatePushedRef.current = false;

      // Push history state to trap back button
      // Use a unique ID to identify our state
      const stateId = `spreadsheet-${Date.now()}`;
      window.history.pushState({ spreadsheetOpen: true, id: stateId }, '');
      historyStatePushedRef.current = true;

      setIsDirty(false);
    }
  }, [isOpen]);

  // Clicking "Cancel" or "X" button
  const handleClose = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!isDirty) {
      if (historyStatePushedRef.current) {
        window.history.back();
        historyStatePushedRef.current = false;
      }
      onClose();
      return;
    }
    setIsExitConfirmOpen(true);
  }, [isDirty, onClose]);

  // Back button event listener
  useEffect(() => {
    if (!isOpen) return;

    const handlePopState = () => {
      // If we initiated the close, allow it to happen
      if (isInternalCloseRef.current) {
        return;
      }

      // Grace period check (e.g. sidebar closing on mobile)
      if (Date.now() - mountTimeRef.current < 500) {
        // Restore state silently and do nothing
        window.history.pushState({ spreadsheetOpen: true, id: `spreadsheet-${Date.now()}` }, '');
        historyStatePushedRef.current = true;
        return;
      }

      // Prevent exit by restoring state immediately
      window.history.pushState({ spreadsheetOpen: true, id: `spreadsheet-${Date.now()}` }, '');
      historyStatePushedRef.current = true;

      // Show confirmation (Same behavior as Cancel button)
      handleClose();
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isOpen, handleClose]);

  // Synchronize data only when modal opens
  useEffect(() => {
    if (isOpen) {
      let newData: any[];
      const isValid = initialData && Array.isArray(initialData) && initialData.length > 0;

      if (isValid) {
        newData = JSON.parse(JSON.stringify(initialData));
        newData = newData.map((sheet: any) => {
          const hasCelldata = Array.isArray(sheet.celldata) && sheet.celldata.length > 0;
          const hasData = Array.isArray(sheet.data) && sheet.data.length > 0;

          if (!hasCelldata && hasData) {
            const celldata: any[] = [];
            const matrix = sheet.data;
            for (let r = 0; r < matrix.length; r++) {
              if (!matrix[r]) continue;
              for (let c = 0; c < matrix[r].length; c++) {
                const cell = matrix[r][c];
                if (cell && (cell.v !== undefined || cell.m !== undefined || Object.keys(cell).length > 0)) {
                  celldata.push({ r, c, v: cell });
                }
              }
            }
            sheet.celldata = celldata;
          } else if (!hasCelldata && !hasData) {
            sheet.celldata = [];
          }
          delete sheet.data;
          return sheet;
        });
      } else {
        newData = JSON.parse(JSON.stringify(defaultSheetData));
        newData.forEach((sheet: any) => delete sheet.data);
      }

      setWorkbookData(newData);
      setMountKey(uuidv4());

      // Temporarily ignore changes during initial load
      isInitialLoadRef.current = true;
      setIsDirty(false);

      setTimeout(() => {
        isInitialLoadRef.current = false;
        // Ensure clean state if no user interaction
        setIsDirty(false);
      }, 1000);
    }
  }, [isOpen]); // Only run when isOpen changes, ignore initialData while open to prevent re-mount

  // Autosave logic
  const onAutosaveRef = useRef(onAutosave);
  useEffect(() => { onAutosaveRef.current = onAutosave; }, [onAutosave]);
  const lastAutosaveJsonRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let idleCallbackId: number;
    let intervalId: ReturnType<typeof setInterval>;

    const performAutosave = () => {
      if (workbookRef.current && onAutosaveRef.current) {
        try {
          const allSheets = workbookRef.current.getAllSheets();
          if (allSheets && allSheets.length > 0) {
            // Skip if data is identical to last autosave
            const json = JSON.stringify(allSheets);
            if (json === lastAutosaveJsonRef.current) return;
            onAutosaveRef.current(allSheets);
            lastAutosaveJsonRef.current = json;
          }
        } catch (e) { }
      }
    };

    const scheduleAutosave = () => {
      if (typeof requestIdleCallback !== 'undefined') {
        idleCallbackId = requestIdleCallback(() => {
          performAutosave();
        }, { timeout: 15000 });
      } else {
        performAutosave();
      }
    };

    intervalId = setInterval(scheduleAutosave, 7000);

    return () => {
      clearInterval(intervalId);
      if (typeof cancelIdleCallback !== 'undefined' && idleCallbackId) {
        cancelIdleCallback(idleCallbackId);
      }
    };
  }, [isOpen]);

  const handleSave = useCallback(async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isSaving) return;

    setIsSaving(true);
    // Give time for UI feedback
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      if (onSave) {
        let dataToSave = null;
        if (workbookRef.current) {
          try {
            const allSheets = workbookRef.current.getAllSheets();
            if (allSheets && allSheets.length > 0) {
              dataToSave = allSheets;
            }
          } catch (e) { }
        }
        if (!dataToSave || dataToSave.length === 0) {
          dataToSave = workbookData;
        }
        await onSave(dataToSave);
        setIsDirty(false);
      }
    } finally {
      setIsSaving(false);
    }
  }, [onSave, workbookData, isSaving]);

  const handleSaveAndExit = useCallback(async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isSaving) return;

    setIsSaving(true);
    try {
      let dataToSave = null;
      if (workbookRef.current) {
        try {
          const allSheets = workbookRef.current.getAllSheets();
          if (allSheets && allSheets.length > 0) {
            dataToSave = allSheets;
          }
        } catch (e) { }
      }
      if (!dataToSave || dataToSave.length === 0) {
        dataToSave = workbookData;
      }
      await onSave(dataToSave);

      // Successfully saved, now exit
      isInternalCloseRef.current = true;
      setIsExitConfirmOpen(false);

      if (historyStatePushedRef.current) {
        window.history.back();
        historyStatePushedRef.current = false;
      }
      onClose();
    } finally {
      setIsSaving(false);
    }
  }, [onSave, onClose, workbookData, isSaving]);

  // "Discard" (Exit) confirmed in dialog
  const handleConfirmExit = useCallback(() => {
    isInternalCloseRef.current = true;
    setIsExitConfirmOpen(false);

    // Clean up history if we pushed it
    if (historyStatePushedRef.current) {
      window.history.back();
      historyStatePushedRef.current = false;
    }

    onClose();
  }, [onClose]);

  const handleCancelExit = useCallback(() => {
    setIsExitConfirmOpen(false);
  }, []);

  const handleChange = useCallback((data: any) => {
    // Ignore changes during initial load
    if (isInitialLoadRef.current) return;

    if (data && Array.isArray(data)) {
      setWorkbookData(data);
      setIsDirty(true);
    }
  }, []);

  const handleVirtualKeyboard = useCallback(() => {
    // 1. Try to find the formula bar input (Best for mobile)
    const formulaInput = document.querySelector('.fortune-formula-function-value') as HTMLElement ||
      document.querySelector('.luckysheet-function-box-input') as HTMLElement;

    if (formulaInput) {
      formulaInput.click();
      formulaInput.focus();
      return;
    }

    // 2. Fallback: try to find the cell input box (only works if already in edit mode or double clicked)
    const cellInput = document.querySelector('.luckysheet-input-box-inner') as HTMLElement;
    if (cellInput) {
      cellInput.click();
      cellInput.focus();
    }
  }, []);

  const settings = useMemo(() => ({
    showToolbar: true,
    showGrid: true,
    showContextmenu: true,
    showSheetTabs: true,
    showStatisticBar: true,
    showHelp: false,
  }), []);

  if (!isOpen) return null;

  return createPortal(
    <>
      <ModalOverlay onClick={(e) => e.stopPropagation()}>
        <ModalContent onClick={(e) => e.stopPropagation()}>
          <ModalHeader>
            <Title>{labels.title}</Title>
            <ButtonGroup>
              <Button onClick={handleVirtualKeyboard} $variant="secondary" title={labels.keyboard}>
                <KeyboardIcon size={18} />
              </Button>
              <Button onClick={handleSave} $variant="primary" disabled={isSaving || !isDirty}>
                {/* @ts-ignore */}
                {isSaving ? (
                  <div style={{ width: '18px', height: '18px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginRight: '6px' }} />
                ) : (
                  <SaveIcon size={18} />
                )}
                <span>{isSaving ? labels.saving : labels.save}</span>
              </Button>
              <Button onClick={handleClose} $variant="secondary" title={labels.exit}>
                <XIcon size={18} />
                {labels.exit}
              </Button>
            </ButtonGroup>
          </ModalHeader>
          <EditorContainer onKeyDownCapture={(e: React.KeyboardEvent) => {
            if (e.key === 'Enter' && e.nativeEvent.isComposing) {
              e.stopPropagation();
            }
          }}>
            <FortuneExcelHelper
              setKey={() => setMountKey(uuidv4())}
              setSheets={setWorkbookData}
              workbookRef={workbookRef}
              config={{
                import: { xlsx: true, csv: true },
                export: { xlsx: true, csv: true },
              }}
            />
            {/* @ts-ignore */}
            <Workbook
              key={mountKey}
              ref={workbookRef}
              data={workbookData}
              onChange={handleChange}
              customToolbarItems={[importToolBarItem(), exportToolBarItem()]}
              {...settings}
            />
          </EditorContainer>
        </ModalContent>
      </ModalOverlay>

      {isExitConfirmOpen && (
        <Backdrop onClick={(e) => e.stopPropagation()}>
          <ConfirmDialog onClick={(e) => e.stopPropagation()} style={{ width: '400px', display: 'flex', flexDirection: 'column' }}>
            <DialogTitle>{labels.exitTitle}</DialogTitle>
            <DialogMessage>{labels.exitMessage}</DialogMessage>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Button
                $variant="primary"
                onClick={() => handleSaveAndExit()}
                style={{ padding: '12px 16px', borderRadius: '8px', justifyContent: 'center' }}
              >
                {labels.saveExit}
              </Button>
              <Button
                onClick={handleConfirmExit}
                style={{ padding: '12px 16px', borderRadius: '8px', background: '#fff1f2', color: '#e11d48', border: '1px solid #fecaca', justifyContent: 'center' }}
              >
                {labels.exitNoSave}
              </Button>
              <Button
                onClick={handleCancelExit}
                style={{ padding: '12px 16px', borderRadius: '8px', color: '#4b5563', justifyContent: 'center' }}
              >
                {labels.cancel}
              </Button>
            </div>
            <style>{`
              @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
          </ConfirmDialog>
        </Backdrop>
      )}
    </>,
    document.body
  );
};
