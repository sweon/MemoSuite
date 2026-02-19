import React, { useState, useEffect } from 'react';
import { AppLockSettings, AutoBackupSetup, DataManagementSection, LanguageSettings, ThemeSettings, useConfirm, useLanguage, useColorTheme } from '@memosuite/shared';
import type { UseAutoBackupReturn } from '@memosuite/shared';

import styled from 'styled-components';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { FiTrash2, FiPlus, FiChevronRight, FiArrowLeft, FiDatabase, FiCpu, FiGlobe, FiInfo, FiShare2, FiLock, FiEdit3, FiArrowUpCircle, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Toast } from '../components/UI/Toast';
import { MdDragIndicator } from 'react-icons/md';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';


import { llmemoAdapter } from '../utils/backupAdapter';
import { TouchDelayDraggable } from '../components/Sidebar/TouchDelayDraggable';

const Container = styled.div`
  padding: 24px 32px;
  margin: 0;
  height: 100%;
  overflow-y: auto;
  width: 100%;
  
  @media (max-width: 600px) {
    padding: 16px 12px;
  }
`;

const Section = styled.div`
  margin-bottom: 2rem;
  animation: fadeIn 0.3s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  padding-bottom: 1rem;
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

const MenuButton = styled.button`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  width: 100%;
  text-align: left;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.background};
  }

  &:active {
    transform: translateY(0);
  }

  .icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: ${({ theme }) => theme.colors.background};
    border-radius: 10px;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 1.25rem;
  }

  .label-wrapper {
    flex: 1;
    
    .title {
      display: block;
      font-weight: 600;
      font-size: 1.05rem;
      color: ${({ theme }) => theme.colors.text};
      margin-bottom: 0.2rem;
    }
    
    .desc {
      display: block;
      font-size: 0.85rem;
      color: ${({ theme }) => theme.colors.textSecondary};
      opacity: 0.8;
    }
  }

  .chevron {
    color: ${({ theme }) => theme.colors.textSecondary};
    opacity: 0.5;
  }
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

const ModelList = styled.ul`
  list-style: none;
  padding: 0;
`;

const ModelItem = styled.li<{ $isDragging?: boolean }>`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.5rem;
  padding: 0.75rem;
  background: ${({ theme, $isDragging }) => ($isDragging ? theme.colors.border : theme.colors.surface)};
  border-radius: 8px;
  border: 1px solid ${({ theme, $isDragging }) => ($isDragging ? theme.colors.primary : 'transparent')};
  box-shadow: ${({ $isDragging }) => ($isDragging ? '0 5px 15px rgba(0,0,0,0.15)' : 'none')};
  transition: background-color 0.2s, box-shadow 0.2s;
`;

const DragHandle = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.textSecondary};
  cursor: grab;
  padding: 4px;
  border-radius: 4px;
  
  &:hover {
    background-color: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text};
  }

  &:active {
    cursor: grabbing;
  }
`;

const Input = styled.input`
  flex: 1;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  font-size: 1rem;

  &:focus {
    outline: none;
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
  color: ${({ $variant }) => ($variant === 'secondary' ? 'inherit' : 'white')};
  border: ${({ $variant, theme }) => ($variant === 'secondary' ? `1px solid ${theme.colors.border}` : 'none')};
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
    ${({ $variant, theme }) =>
    $variant === 'secondary' &&
    `
      background: ${theme.colors.border};
      border-color: ${theme.colors.textSecondary};
    `}
  }
`;

/* Unused styles removed: ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, RadioLabel, ScrollableList, CheckboxLabel */

const HelpList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  
  li {
    margin-bottom: 1rem;
    padding-left: 1rem;
    position: relative;
    line-height: 1.6;
    color: ${({ theme }) => theme.colors.text};
    
    &::before {
      content: '•';
      position: absolute;
      left: 0;
      color: ${({ theme }) => theme.colors.primary};
      font-weight: bold;
    }
  }
`;

const TabButton = styled.button<{ active: boolean }>`
  padding: 6px 16px;
  border-radius: 8px;
  border: 2px solid ${props => props.active ? props.theme.colors.primary : props.theme.colors.border};
  background: ${props => props.active ? props.theme.colors.primary : 'transparent'};
  color: ${props => props.active ? '#ffffff' : props.theme.colors.text};
  cursor: pointer;
  font-weight: 700;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 0.9rem;
  min-width: 48px;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${props => props.active ? props.theme.colors.primary : `${props.theme.colors.primary}10`};
  }
`;

const FontSizeContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const FontSizeControls = styled.div`
  display: flex;
  flex-direction: column;
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  overflow: hidden;
  width: 24px;
  height: 36px;
`;

const SpinButton = styled.button`
  border: none;
  background: transparent;
  width: 100%;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: ${props => props.theme.colors.text};
  font-size: 10px;
  transition: background 0.1s ease;

  &:first-child {
    border-bottom: 1px solid ${props => props.theme.colors.border};
  }

  &:hover {
    background: ${props => props.theme.colors.border};
  }
`;

const FontSizeDisplay = styled.div`
  display: flex;
  align-items: center;
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  height: 36px;
  padding: 0 10px;
  gap: 4px;
`;

const FontSizeInput = styled.input`
  width: 30px;
  border: none;
  background: transparent;
  text-align: right;
  font-size: 1rem;
  font-weight: 600;
  outline: none;
  padding: 0;
  color: ${props => props.theme.colors.text};

  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
`;

const FontSizeUnit = styled.span`
  font-size: 0.8rem;
  color: ${props => props.theme.colors.textSecondary || '#888'};
  user-select: none;
`;

const EditorSettingItem: React.FC<{ title: string; desc: string; checked: boolean; onChange: () => void }> = ({ title, desc, checked, onChange }) => (
  <div style={{
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: '1rem',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
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
      style={{ width: '28px', height: '28px', cursor: 'pointer', accentColor: 'var(--primary)', marginTop: '2px' }}
    />
  </div>
);

type SubMenu = 'main' | 'models' | 'data' | 'editor' | 'theme' | 'language' | 'about' | 'appLock' | 'updates';



export const SettingsPage: React.FC<{ autoBackup?: UseAutoBackupReturn }> = ({ autoBackup }) => {
  const { t, language } = useLanguage();
  const { confirm } = useConfirm();

  const [currentSubMenu, setCurrentSubMenu] = useState<SubMenu>('main');
  const models = useLiveQuery(() => db.models.orderBy('order').toArray());

  const [spellCheck, setSpellCheck] = useState(() => localStorage.getItem('spellCheck') !== 'false');
  const [markdownShortcuts, setMarkdownShortcuts] = useState(() => localStorage.getItem('editor_markdown_shortcuts') !== 'false');
  const [autoLink, setAutoLink] = useState(() => localStorage.getItem('editor_auto_link') !== 'false');
  const [tabIndentation, setTabIndentation] = useState(() => localStorage.getItem('editor_tab_indentation') !== 'false');
  const [tabSize, setTabSize] = useState(() => Number(localStorage.getItem('editor_tab_size') || '4'));
  const { fontSize, setFontSize, increaseFontSize, decreaseFontSize } = useColorTheme();
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(() => localStorage.getItem('auto_update_enabled') === 'true');

  const fontSizeIntervalRef = React.useRef<any>(null);
  const fsTimeoutRef = React.useRef<any>(null);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: false,
  });

  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleUpdateCheck = async () => {
    const installUpdate = () => {
      setToastMessage(t.sidebar.install_update);
      setTimeout(() => {
        updateServiceWorker(true);
        setTimeout(() => window.location.reload(), 3000);
      }, 1000);
    };

    if (needRefresh) {
      installUpdate();
      return;
    }

    if (isCheckingUpdate) return;
    setIsCheckingUpdate(true);

    if (!('serviceWorker' in navigator)) {
      setToastMessage(t.sidebar.pwa_not_supported);
      setIsCheckingUpdate(false);
      return;
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        setToastMessage(t.sidebar.check_failed);
        setIsCheckingUpdate(false);
        return;
      }

      await registration.update();

      // Give it a tiny bit of time for state changes to propagate
      await new Promise(resolve => setTimeout(resolve, 800));

      if (registration.waiting || needRefresh) {
        installUpdate();
      } else if (registration.installing) {
        setToastMessage(t.sidebar.downloading_update);
        const worker = registration.installing;
        if (worker) {
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed') {
              installUpdate();
            }
          });
        }
      } else {
        setToastMessage(t.sidebar.up_to_date);
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
      setToastMessage(t.sidebar.check_failed);
    } finally {
      setIsCheckingUpdate(false);
    }
  };



  const toggleSpellCheck = () => {
    const next = !spellCheck;
    setSpellCheck(next);
    localStorage.setItem('spellCheck', String(next));
  };

  const toggleMarkdownShortcuts = () => {
    const next = !markdownShortcuts;
    setMarkdownShortcuts(next);
    localStorage.setItem('editor_markdown_shortcuts', String(next));
  };

  const toggleAutoLink = () => {
    const next = !autoLink;
    setAutoLink(next);
    localStorage.setItem('editor_auto_link', String(next));
  };

  const toggleTabIndentation = () => {
    const next = !tabIndentation;
    setTabIndentation(next);
    localStorage.setItem('editor_tab_indentation', String(next));
  };

  const handleTabSizeChange = (size: number) => {
    setTabSize(size);
    localStorage.setItem('editor_tab_size', String(size));
  };

  const updateFontSize = (increment: boolean) => {
    if (increment) {
      increaseFontSize();
    } else {
      decreaseFontSize();
    }
  };

  const startFontSizeInterval = (increment: boolean) => {
    if (fontSizeIntervalRef.current || fsTimeoutRef.current) return;
    updateFontSize(increment);
    fsTimeoutRef.current = setTimeout(() => {
      fontSizeIntervalRef.current = setInterval(() => {
        updateFontSize(increment);
      }, 80);
    }, 500);
  };

  const stopFontSizeInterval = () => {
    if (fontSizeIntervalRef.current) {
      clearInterval(fontSizeIntervalRef.current);
      fontSizeIntervalRef.current = null;
    }
    if (fsTimeoutRef.current) {
      clearTimeout(fsTimeoutRef.current);
      fsTimeoutRef.current = null;
    }
  };

  const onFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "") {
      return;
    }
    const num = parseInt(val);
    if (!isNaN(num)) {
      const clamped = Math.max(12, Math.min(24, num));
      setFontSize(clamped);
    }
  };

  const toggleAutoUpdate = () => {
    const next = !autoUpdateEnabled;
    setAutoUpdateEnabled(next);
    localStorage.setItem('auto_update_enabled', String(next));
  };

  useEffect(() => {
    const initializeOrder = async () => {
      const allModels = await db.models.toArray();
      if (allModels.length > 0 && allModels.some(m => m.order === undefined)) {
        await db.transaction('rw', db.models, async () => {
          for (let i = 0; i < allModels.length; i++) {
            if (allModels[i].order === undefined) {
              await db.models.update(allModels[i].id!, { order: i });
            }
          }
        });
      }
    };
    initializeOrder();
  }, []);

  const [newModel, setNewModel] = useState('');
  /* Data management state moved to shared component */

  const handleAddModel = async () => {
    if (newModel.trim()) {
      await db.transaction('rw', db.models, async () => {
        const allModels = await db.models.orderBy('order').toArray();
        for (const m of allModels) {
          if (m.id !== undefined) {
            await db.models.update(m.id, { order: (m.order ?? 0) + 1 });
          }
        }
        await db.models.add({
          name: newModel.trim(),
          order: 0
        });
      });
      setNewModel('');
    }
  };

  const handleDeleteModel = async (id: number) => {
    if (await confirm({ message: t.settings.delete_confirm, isDestructive: true })) {
      await db.models.delete(id);
    }
  };

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination || !models) return;
    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;
    if (sourceIndex === destIndex) return;
    const newModels = Array.from(models);
    const [removed] = newModels.splice(sourceIndex, 1);
    newModels.splice(destIndex, 0, removed);
    await db.transaction('rw', db.models, async () => {
      for (let i = 0; i < newModels.length; i++) {
        if (newModels[i].id !== undefined) {
          await db.models.update(newModels[i].id!, { order: i });
        }
      }
    });
  };

  /* Import handler moved to shared component */

  const handleShare = async () => {
    const shareData = {
      title: 'LLMemo',
      text: t.settings.help_desc,
      url: window.location.origin + window.location.pathname
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        alert(t.settings.share_success);
      }
    } catch (err) {
      console.log('Share failed:', err);
    }
  };

  /* Factory reset handler moved to shared component */

  const renderHeader = (title: string) => (
    <Header>
      <BackButton onClick={() => setCurrentSubMenu('main')}>
        <FiArrowLeft size={20} />
      </BackButton>
      <Title>{title}</Title>
    </Header>
  );

  return (
    <Container>
      {currentSubMenu === 'main' && (
        <Section>
          <Title style={{ marginBottom: '1.5rem' }}>{t.settings.title}</Title>
          <MenuList>
            <MenuButton onClick={() => setCurrentSubMenu('data')}>
              <div className="icon-wrapper"><FiDatabase /></div>
              <div className="label-wrapper">
                <span className="title">{t.settings.data_management}</span>
                <span className="desc">{t.settings.data_management_desc}</span>
              </div>
              <FiChevronRight className="chevron" />
            </MenuButton>

            <MenuButton onClick={() => setCurrentSubMenu('models')}>
              <div className="icon-wrapper"><FiCpu /></div>
              <div className="label-wrapper">
                <span className="title">{t.settings.manage_models}</span>
                <span className="desc">{t.settings.manage_models_desc}</span>
              </div>
              <FiChevronRight className="chevron" />
            </MenuButton>

            <MenuButton onClick={() => setCurrentSubMenu('editor')}>
              <div className="icon-wrapper"><FiEdit3 /></div>
              <div className="label-wrapper">
                <span className="title">{t.settings.editor}</span>
                <span className="desc">{t.settings.editor_desc}</span>
              </div>
              <FiChevronRight className="chevron" />
            </MenuButton>

            <MenuButton onClick={() => setCurrentSubMenu('theme')}>
              <div className="icon-wrapper" style={{ background: 'linear-gradient(135deg, #818cf8 0%, #f472b6 100%)' }}>
                <span style={{ fontSize: '1.25rem' }}>🎨</span>
              </div>
              <div className="label-wrapper">
                <span className="title">{t.settings.color_theme}</span>
                <span className="desc">{t.settings.color_theme_desc}</span>
              </div>
              <FiChevronRight className="chevron" />
            </MenuButton>

            <MenuButton onClick={() => setCurrentSubMenu('language')}>
              <div className="icon-wrapper"><FiGlobe /></div>
              <div className="label-wrapper">
                <span className="title">{t.settings.language}</span>
                <span className="desc">{t.settings.language_desc}</span>
              </div>
              <FiChevronRight className="chevron" />
            </MenuButton>

            <MenuButton onClick={() => setCurrentSubMenu('appLock')}>
              <div className="icon-wrapper"><FiLock /></div>
              <div className="label-wrapper">
                <span className="title">{t.settings.app_lock}</span>
                <span className="desc">{t.settings.app_lock_desc}</span>
              </div>
              <FiChevronRight className="chevron" />
            </MenuButton>

            <MenuButton onClick={() => setCurrentSubMenu('updates')}>
              <div className="icon-wrapper"><FiArrowUpCircle /></div>
              <div className="label-wrapper">
                <span className="title">{t.settings.updates}</span>
                <span className="desc">{t.settings.updates_desc}</span>
              </div>
              <FiChevronRight className="chevron" />
            </MenuButton>

            <MenuButton onClick={() => setCurrentSubMenu('about')}>
              <div className="icon-wrapper"><FiInfo /></div>
              <div className="label-wrapper">
                <span className="title">{t.settings.help_title}</span>
                <span className="desc">{t.settings.help_title_desc}</span>
              </div>
              <FiChevronRight className="chevron" />
            </MenuButton>
          </MenuList>
        </Section>
      )}

      {currentSubMenu === 'models' && (
        <Section>
          {renderHeader(t.settings.manage_models)}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <Input
              value={newModel}
              onChange={e => setNewModel(e.target.value)}
              placeholder={t.settings.add_model_placeholder}
              onKeyDown={(e) => e.key === 'Enter' && newModel.trim() && handleAddModel()}
            />
            <ActionButton onClick={handleAddModel} disabled={!newModel.trim()}><FiPlus /> {t.settings.add}</ActionButton>
          </div>

          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="models">
              {(provided) => (
                <ModelList {...provided.droppableProps} ref={provided.innerRef}>
                  {models?.map((m, index) => (
                    <TouchDelayDraggable key={m.id} draggableId={m.id!.toString()} index={index}>
                      {(provided, snapshot) => (
                        <ModelItem
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          $isDragging={snapshot.isDragging}
                        >
                          <DragHandle {...provided.dragHandleProps}>
                            <MdDragIndicator size={20} />
                          </DragHandle>
                          <span style={{ flex: 1, fontWeight: 500 }}>{m.name}</span>
                          <IconButton onClick={() => handleDeleteModel(m.id!)}>
                            <FiTrash2 size={18} />
                          </IconButton>
                        </ModelItem>
                      )}
                    </TouchDelayDraggable>
                  ))}
                  {provided.placeholder}
                </ModelList>
              )}
            </Droppable>
          </DragDropContext>
        </Section>
      )}

      {currentSubMenu === 'editor' && (
        <Section>
          {renderHeader(t.settings.editor)}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <EditorSettingItem
              title={t.settings.spellcheck}
              desc={t.settings.spellcheck_desc}
              checked={spellCheck}
              onChange={toggleSpellCheck}
            />

            <EditorSettingItem
              title={t.settings.editor_markdown_shortcuts}
              desc={t.settings.editor_markdown_shortcuts_desc}
              checked={markdownShortcuts}
              onChange={toggleMarkdownShortcuts}
            />
            <EditorSettingItem
              title={t.settings.editor_auto_link}
              desc={t.settings.editor_auto_link_desc}
              checked={autoLink}
              onChange={toggleAutoLink}
            />
            <EditorSettingItem
              title={t.settings.editor_tab_indentation}
              desc={t.settings.editor_tab_indentation_desc}
              checked={tabIndentation}
              onChange={toggleTabIndentation}
            />

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px'
            }}>
              <div>
                <span style={{ display: 'block', fontWeight: 600, fontSize: '1.05rem', marginBottom: '0.2rem' }}>{t.settings.editor_tab_size}</span>
                <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', opacity: 0.8 }}>{t.settings.editor_tab_size_desc}</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <TabButton active={tabSize === 2} onClick={() => handleTabSizeChange(2)}>2</TabButton>
                <TabButton active={tabSize === 4} onClick={() => handleTabSizeChange(4)}>4</TabButton>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px'
            }}>
              <div>
                <span style={{ display: 'block', fontWeight: 600, fontSize: '1.05rem', marginBottom: '0.2rem' }}>{t.settings.editor_font_size}</span>
                <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', opacity: 0.8 }}>{t.settings.editor_font_size_desc}</span>
              </div>
              <FontSizeContainer>
                <FontSizeControls>
                  <SpinButton

                    onMouseDown={(e) => { e.preventDefault(); startFontSizeInterval(true); }}
                    onMouseUp={stopFontSizeInterval}
                    onMouseLeave={stopFontSizeInterval} onPointerUp={stopFontSizeInterval}
                  >
                    <FiChevronUp />
                  </SpinButton>
                  <SpinButton

                    onMouseDown={(e) => { e.preventDefault(); startFontSizeInterval(false); }}
                    onMouseUp={stopFontSizeInterval}
                    onMouseLeave={stopFontSizeInterval} onPointerUp={stopFontSizeInterval}
                  >
                    <FiChevronDown />
                  </SpinButton>
                </FontSizeControls>
                <FontSizeDisplay>
                  <FontSizeInput
                    type="text"
                    value={fontSize}
                    onChange={onFontSizeChange}
                  />
                  <FontSizeUnit>pt</FontSizeUnit>
                </FontSizeDisplay>
              </FontSizeContainer>
            </div>
          </div>
        </Section>
      )}

      {currentSubMenu === 'data' && (
        <Section>
          {renderHeader(t.settings.data_management)}
          {autoBackup && (
            <div style={{ marginBottom: '1.5rem' }}>
              <AutoBackupSetup autoBackup={autoBackup} language={language} />
            </div>
          )}
          <DataManagementSection
            adapter={llmemoAdapter}
            fileNamePrefix="llmemo"
            t={t}
          />
        </Section>
      )}

      {currentSubMenu === 'theme' && (
        <Section>
          {renderHeader(t.settings.color_theme)}
          <ThemeSettings t={{
            light_modes: t.settings.light_modes,
            dark_modes: t.settings.dark_modes,
            current_theme: t.settings.current_theme,
            names: t.settings.themes
          }} />
        </Section>
      )}



      {currentSubMenu === 'language' && (

        <Section>
          {renderHeader(t.settings.language)}
          <LanguageSettings />
        </Section>
      )}

      {currentSubMenu === 'appLock' && (
        <Section>
          {renderHeader(t.settings.app_lock)}
          <AppLockSettings t={t} />
        </Section>
      )}

      {currentSubMenu === 'updates' && (
        <Section>
          {renderHeader(t.settings.updates)}
          <EditorSettingItem
            title={t.settings.auto_update}
            desc={t.settings.auto_update_desc}
            checked={autoUpdateEnabled}
            onChange={toggleAutoUpdate}
          />
          <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h4 style={{ margin: 0, color: 'var(--text-color)' }}>{t.settings.manual_update_title}</h4>
            </div>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              {t.settings.manual_update_desc}
            </p>
            <ActionButton onClick={handleUpdateCheck} disabled={isCheckingUpdate} style={{ width: '100%' }}>
              <FiArrowUpCircle className={isCheckingUpdate ? 'spin' : ''} />
              {isCheckingUpdate ? t.sidebar.checking : t.sidebar.check_updates}
            </ActionButton>
          </div>
        </Section>
      )}

      {currentSubMenu === 'about' && (
        <Section>
          {renderHeader(t.settings.help_title)}
          <p style={{ marginBottom: '1.5rem', lineHeight: '1.6', fontSize: '1.1rem', fontWeight: 500 }}>{t.settings.help_desc}</p>
          <HelpList>
            <li>{t.settings.help_local_db}</li>
            <li>{t.settings.help_offline}</li>
            <li>{t.settings.help_sync}</li>
            <li>{t.settings.help_threads}</li>
            <li>{t.settings.help_drawing}</li>
            <li>{t.settings.help_share_log}</li>
            <li>{t.settings.help_backup}</li>
            <li>{t.settings.help_markdown}</li>
            <li>{t.settings.help_models}</li>
            <li>{t.settings.help_tags}</li>
            <li>{t.settings.help_comments}</li>
            <li>{t.settings.help_app_lock}</li>
            <li>{t.settings.help_math}</li>
          </HelpList>

          <div style={{ marginTop: '2.5rem', padding: '1.5rem', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-color)' }}>{t.settings.memosuite_apps}</h4>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{t.settings.memosuite_apps_desc}</p>
            <ActionButton onClick={() => window.open('https://sweon.github.io/MemoSuite/', '_blank')} style={{ width: '100%' }}>
              <FiShare2 /> {t.settings.memosuite_apps}
            </ActionButton>
          </div>

          <div style={{ marginTop: '2.5rem', padding: '1.5rem', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-color)' }}>{t.settings.share_app}</h4>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{t.settings.share_desc}</p>
            <ActionButton onClick={handleShare} style={{ width: '100%' }}>
              <FiShare2 /> {t.settings.share_app}
            </ActionButton>
          </div>

          <div style={{ marginTop: '2.5rem', padding: '1.25rem', background: 'rgba(0,0,0,0.03)', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '0.85rem' }}>
            <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-color)', fontWeight: 600 }}>{t.settings.disclaimer_title}</h5>
            <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: '1.5' }}>{t.settings.disclaimer_text}</p>
          </div>

          <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--surface)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
            {t.settings.app_tagline}
          </div>
        </Section>
      )}

      {/* Export Modal moved to shared component */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          onClose={() => setToastMessage(null)}
        />
      )}
    </Container>
  );
};