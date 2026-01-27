import React, { useState, useRef } from 'react';
import { useLanguage } from '@memosuite/shared';

import styled from 'styled-components';
import { FiX, FiCheck, FiUpload } from 'react-icons/fi';

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
`;

const Modal = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
`;

const Header = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Title = styled.h3`
  margin: 0;
  color: ${({ theme }) => theme.colors.text};
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.textSecondary};
  padding: 4px;
`;

const Body = styled.div`
  padding: 1.5rem;
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const TextArea = styled.textarea`
  width: 100%;
  height: 200px;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  font-family: monospace;
  resize: vertical;
  line-height: 1.5;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const PreviewList = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  max-height: 200px;
  overflow-y: auto;
  background: ${({ theme }) => theme.colors.background};
`;

const PreviewItem = styled.div`
  padding: 0.75rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  gap: 1rem;
  align-items: center;
  
  &:last-child {
    border-bottom: none;
  }
`;

const Word = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
`;

const Meaning = styled.span`
  color: ${({ theme }) => theme.colors.textSecondary};
  flex: 1;
`;

const Footer = styled.div`
  padding: 1.5rem;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' | 'danger' | 'cancel' }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  border: ${({ theme, $variant }) =>
    $variant === 'secondary' ? `1px solid ${theme.colors.border}` :
      $variant === 'cancel' ? `1px solid ${theme.colors.border}` :
        $variant === 'danger' ? `1px solid ${theme.colors.danger}` : 'none'};
  background: ${({ theme, $variant }) =>
    $variant === 'primary' ? theme.colors.primary :
      $variant === 'cancel' ? theme.colors.background : 'transparent'};
  color: ${({ theme, $variant }) =>
    $variant === 'secondary' ? theme.colors.text :
      $variant === 'cancel' ? theme.colors.textSecondary :
        $variant === 'danger' ? theme.colors.danger : 'white'};
  font-weight: 500;
  cursor: pointer;

  &:hover {
    filter: brightness(0.95);
    ${({ $variant, theme }) => ($variant === 'secondary' || $variant === 'cancel' || $variant === 'danger') && `background: ${theme.colors.surface}; border-color: ${theme.colors.textSecondary};`}
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text};
  user-select: none;
`;

interface ParsedItem {
  word: string;
  meaning: string;
}

interface Props {
  onClose: () => void;
  onConfirm: (items: ParsedItem[], isThread: boolean) => Promise<void>;
  isInThread?: boolean;
}

export const BulkAddModal: React.FC<Props> = ({ onClose, onConfirm, isInThread }) => {
  const { t } = useLanguage();
  const [text, setText] = useState('');
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [createAsThread, setCreateAsThread] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseText = (input: string) => {
    const lines = input.split('\n');
    const items: ParsedItem[] = [];

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      const colonIndex = trimmed.indexOf(':');
      if (colonIndex > 0) {
        const word = trimmed.substring(0, colonIndex).trim();
        const meaning = trimmed.substring(colonIndex + 1).trim();
        if (word && meaning) {
          items.push({ word, meaning });
        }
      }
    });

    setParsedItems(items);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setText(content);
      parseText(content);
    };
    reader.readAsText(file);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    parseText(e.target.value);
  };

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={e => e.stopPropagation()}>
        <Header>
          <Title>{t.log_detail.bulk_add_title}</Title>
          <CloseButton onClick={onClose}><FiX size={20} /></CloseButton>
        </Header>

        <Body>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Button $variant="secondary" onClick={() => fileInputRef.current?.click()} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
              <FiUpload /> {t.log_detail.upload_file}
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".txt"
              onChange={handleFileUpload}
            />
          </div>

          <TextArea
            value={text}
            onChange={handleTextChange}
            placeholder={t.log_detail.bulk_add_placeholder}
          />

          {parsedItems.length > 0 && (
            <>
              <div style={{ fontSize: '0.9rem', color: 'gray', marginTop: '0.5rem' }}>
                {parsedItems.length} items parsed
              </div>
              <PreviewList>
                {parsedItems.map((item, idx) => (
                  <PreviewItem key={idx}>
                    <Word>{item.word}</Word>
                    <Meaning>{item.meaning}</Meaning>
                  </PreviewItem>
                ))}
              </PreviewList>
            </>
          )}
        </Body>

        <Footer>
          {!isInThread && (
            <CheckboxLabel>
              <input
                type="checkbox"
                checked={createAsThread}
                onChange={e => setCreateAsThread(e.target.checked)}
              />
              {t.log_detail.bulk_add_as_thread}
            </CheckboxLabel>
          )}
          {isInThread && <div />}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button $variant="cancel" onClick={onClose}>{t.log_detail.cancel}</Button>
            <Button
              disabled={parsedItems.length === 0}
              onClick={() => onConfirm(parsedItems, isInThread ? false : createAsThread)}
            >
              <FiCheck /> {t.log_detail.add_all}
            </Button>
          </div>
        </Footer>
      </Modal>
    </Overlay>
  );
};