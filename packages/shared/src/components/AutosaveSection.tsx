import React from 'react';
import styled, { keyframes } from 'styled-components';
import { FiTrash2, FiArrowLeft } from 'react-icons/fi';
import { format as formatDateFns } from 'date-fns';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Section = styled.div`
  margin-bottom: 2rem;
  animation: ${fadeIn} 0.3s ease-out;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  padding-bottom: 1rem;
`;

const BackButton = styled.button`
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.colors.textSecondary};
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: ${({ theme }) => theme.colors.border};
    color: ${({ theme }) => theme.colors.text};
  }
`;

const Title = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  color: ${({ theme }) => theme.colors.text};
`;

const MenuList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'success' | 'secondary' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  padding: 0.75rem 1.25rem;
  background: ${({ theme, $variant }) =>
    $variant === 'success' ? '#10b981' :
      $variant === 'secondary' ? 'transparent' :
        theme.colors.primary};
  color: ${({ $variant, theme }) => $variant === 'secondary' ? theme.colors.danger : 'white'};
  border: ${({ $variant, theme }) => $variant === 'secondary' ? `1px solid ${theme.colors.border}` : 'none'};
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.95rem;
  transition: all 0.2s;
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:hover:not(:disabled) {
    filter: brightness(1.1);
    transform: translateY(-1px);
    ${({ $variant, theme }) => $variant === 'secondary' && `
      background: ${theme.colors.background};
      border-color: ${theme.colors.textSecondary};
      color: ${theme.colors.danger};
    `}
  }
`;

const AutosaveItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  transition: all 0.2s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const IconButton = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.textSecondary};
  padding: 8px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover { 
    color: ${({ theme }) => theme.colors.danger};
    background-color: ${({ theme }) => theme.colors.background};
  }
`;

export interface Autosave {
  id?: number;
  originalId?: number;
  title: string;
  content: string;
  createdAt: Date;
  // Other fields might exist but strictly for display we just need these
  [key: string]: any;
}

interface AutosaveSectionProps {
  autosaves: Autosave[] | undefined;
  onRestore: (autosave: Autosave) => void;
  onDelete: (id: number) => void;
  onClearAll: () => void;
  onBack: () => void;
  t: any; // Translation object
  format?: (date: Date | number, formatStr: string) => string;
  autosaveEnabled?: boolean;
  onToggleAutosave?: () => void;
}

const EditorSettingItem: React.FC<{ title: string; desc: string; checked: boolean; onChange: () => void }> = ({ title, desc, checked, onChange }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.75rem 1rem',
    background: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px'
  }}>
    <div>
      <span style={{ display: 'block', fontWeight: 600, fontSize: '1.05rem', marginBottom: '0.2rem' }}>{title}</span>
      <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', opacity: 0.8 }}>{desc}</span>
    </div>
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      style={{ width: '24px', height: '24px', cursor: 'pointer', accentColor: 'var(--primary-color)' }}
    />
  </div>
);

export const AutosaveSection: React.FC<AutosaveSectionProps> = ({
  autosaves,
  onRestore,
  onDelete,
  onClearAll,
  onBack,
  t,
  format = formatDateFns,
  autosaveEnabled,
  onToggleAutosave
}) => {
  return (
    <Section>
      <Header>
        <BackButton onClick={onBack}>
          <FiArrowLeft size={20} />
        </BackButton>
        <Title>{t.settings.autosave_settings}</Title>
      </Header>

      {autosaveEnabled !== undefined && onToggleAutosave && (
        <div style={{ marginBottom: '1.5rem' }}>
          <EditorSettingItem
            title={t.settings.editor_autosave}
            desc={t.settings.editor_autosave_desc}
            checked={autosaveEnabled}
            onChange={onToggleAutosave}
          />
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <ActionButton $variant="secondary" onClick={onClearAll}>
          <FiTrash2 /> {t.settings.autosave_clear}
        </ActionButton>
      </div>

      <MenuList>
        {!autosaves || autosaves.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            {t.settings.no_autosave_found || t.settings.no_logs_found || t.settings.no_memos_found || "No autosaves found"}
          </div>
        ) : (
          autosaves.map((as) => (
            <AutosaveItem key={as.id}>
              <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => onRestore(as)}>
                <span style={{ display: 'block', fontWeight: 600, fontSize: '1rem', color: 'var(--text-color)' }}>
                  {as.title || format(new Date(as.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                </span>
                <span style={{ display: 'block', fontSize: '0.8rem', opacity: 0.6, marginTop: '4px' }}>
                  {format(new Date(as.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                </span>
              </div>
              <IconButton onClick={() => as.id !== undefined && onDelete(as.id)}>
                <FiTrash2 size={18} />
              </IconButton>
            </AutosaveItem>
          ))
        )}
      </MenuList>
    </Section>
  );
};
