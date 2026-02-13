import { useState, useCallback, useRef, useEffect } from 'react';
import styled from 'styled-components';

/* ─── Styled Components ─── */

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  background: ${({ theme }) => theme.colors.background};
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  flex-shrink: 0;
`;

const TitleArea = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Title = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`;

const Hint = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textSecondary};
  padding: 8px 16px;
  background: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  flex-shrink: 0;
`;

const DoneButton = styled.button`
  padding: 7px 18px;
  border-radius: 18px;
  border: none;
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
  flex-shrink: 0;

  &:active {
    opacity: 0.75;
  }
`;

const StyledTextarea = styled.textarea`
  flex: 1;
  width: 100%;
  padding: 16px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 14px;
  line-height: 1.7;
  border: none;
  outline: none;
  resize: none;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  -webkit-user-select: text !important;
  user-select: text !important;
  -webkit-touch-callout: default !important;
  box-sizing: border-box;
`;

/* ─── Hook ─── */

/**
 * useCopyMode — Galaxy Tab 전용 복사/붙여넣기 우회
 *
 * CodeMirror의 contenteditable 버그를 완전 우회합니다.
 * 활성화하면 네이티브 <textarea>가 전체 화면을 덮어,
 * 일반적인 long-press → 선택 → 복사/붙여넣기가 정상 작동합니다.
 */
export const useCopyMode = (
  value: string,
  onChange: (value: string) => void,
  language: string,
) => {
  const [isCopyMode, setIsCopyMode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const ko = language === 'ko';

  const enterCopyMode = useCallback(() => {
    setIsCopyMode(true);
  }, []);

  const exitCopyMode = useCallback(() => {
    setIsCopyMode(false);
  }, []);

  // Auto-focus textarea when entering copy mode
  useEffect(() => {
    if (isCopyMode && textareaRef.current) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isCopyMode]);

  const renderOverlay = useCallback(() => {
    if (!isCopyMode) return null;

    return (
      <Overlay>
        <Header>
          <TitleArea>
            <Title>{ko ? '📋 선택/복사 모드' : '📋 Select/Copy Mode'}</Title>
          </TitleArea>
          <DoneButton onClick={exitCopyMode}>
            {ko ? '완료' : 'Done'}
          </DoneButton>
        </Header>
        <Hint>
          {ko
            ? '💡 길게 눌러서 텍스트를 선택하고, 복사/붙여넣기 하세요. 편집도 가능합니다.'
            : '💡 Long press to select text, then copy/paste. You can also edit here.'}
        </Hint>
        <StyledTextarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </Overlay>
    );
  }, [isCopyMode, value, onChange, ko, exitCopyMode]);

  return {
    isCopyMode,
    enterCopyMode,
    renderOverlay,
  };
};
