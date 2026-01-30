import React, { useState, useEffect } from 'react';
import { AppLockSettings, DataManagementSection, LanguageSettings, ThemeSettings, useConfirm, useLanguage, AutosaveSection as SharedAutosaveSection } from '@memosuite/shared';
import type { Autosave } from '@memosuite/shared';

import styled from 'styled-components';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { FiTrash2, FiPlus, FiChevronRight, FiArrowLeft, FiDatabase, FiCpu, FiGlobe, FiInfo, FiShare2, FiLock, FiEdit3, FiSave } from 'react-icons/fi';
import { MdDragIndicator } from 'react-icons/md';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { useNavigate } from 'react-router-dom';

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
  background: ${({ theme, $isDragging }) => $isDragging ? theme.colors.border : theme.colors.surface};
  border-radius: 8px;
  border: 1px solid ${({ theme, $isDragging }) => $isDragging ? theme.colors.primary : 'transparent'};
  box-shadow: ${({ $isDragging }) => $isDragging ? '0 5px 15px rgba(0,0,0,0.15)' : 'none'};
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
  color: ${({ $variant }) => $variant === 'secondary' ? 'inherit' : 'white'};
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
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: 1px solid ${({ theme, active }) => active ? theme.colors.primary : theme.colors.border};
  background: ${({ theme, active }) => active ? theme.colors.primary : 'transparent'};
  color: ${({ active }) => active ? '#fff' : 'inherit'};
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

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

type SubMenu = 'main' | 'models' | 'data' | 'editor' | 'theme' | 'language' | 'about' | 'appLock' | 'autosave';

const AutosaveSection: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { t } = useLanguage();
  const { confirm } = useConfirm();
  const navigate = useNavigate();
  const autosaves = useLiveQuery(() => db.autosaves.orderBy('createdAt').reverse().toArray());

  const [autosaveEnabled, setAutosaveEnabled] = useState(() => localStorage.getItem('editor_autosave') !== 'false');

  const toggleAutosave = () => {
    const next = !autosaveEnabled;
    setAutosaveEnabled(next);
    localStorage.setItem('editor_autosave', String(next));
  };

  const handleRestore = (as: Autosave) => {
    // Logic for LLMemo navigation
    if (as.originalId) {
      navigate(`/log/${as.originalId}?restore=true`);
    } else {
      navigate(`/new?restore=true`);
    }
  };

  const handleDelete = async (id: number) => {
    if (await confirm({ message: t.log_detail.delete_confirm, isDestructive: true })) {
      await db.autosaves.delete(id);
    }
  };

  const handleClearAll = async () => {
    if (await confirm({ message: t.settings.autosave_clear_confirm, isDestructive: true })) {
      await db.autosaves.clear();
    }
  };

  return (
    <SharedAutosaveSection
      autosaves={autosaves as Autosave[]}
      onRestore={handleRestore}
      onDelete={handleDelete}
      onClearAll={handleClearAll}
      onBack={onBack}
      t={t}
      autosaveEnabled={autosaveEnabled}
      onToggleAutosave={toggleAutosave}
    />
  );
};

export const SettingsPage: React.FC = () => {
  const { t } = useLanguage();
  const { confirm } = useConfirm();

  const [currentSubMenu, setCurrentSubMenu] = useState<SubMenu>('main');
  const models = useLiveQuery(() => db.models.orderBy('order').toArray());

  const [spellCheck, setSpellCheck] = useState(() => localStorage.getItem('spellCheck') !== 'false');
  const [lineNumbers, setLineNumbers] = useState(() => localStorage.getItem('editor_line_numbers') === 'true');
  const [tabSize, setTabSize] = useState(() => Number(localStorage.getItem('editor_tab_size')) || 4);
  const [largeSize, setLargeSize] = useState(() => localStorage.getItem('editor_large_size') === 'true');
  const [advancedToolbar, setAdvancedToolbar] = useState(() => localStorage.getItem('editor_advanced_toolbar') !== 'false');

  const toggleSpellCheck = () => {
    const next = !spellCheck;
    setSpellCheck(next);
    localStorage.setItem('spellCheck', String(next));
  };

  const toggleLineNumbers = () => {
    const next = !lineNumbers;
    setLineNumbers(next);
    localStorage.setItem('editor_line_numbers', String(next));
  };

  const handleTabSizeChange = (size: number) => {
    setTabSize(size);
    localStorage.setItem('editor_tab_size', String(size));
  };

  const toggleLargeSize = () => {
    const next = !largeSize;
    setLargeSize(next);
    localStorage.setItem('editor_large_size', String(next));
  };

  const toggleAdvancedToolbar = () => {
    const next = !advancedToolbar;
    setAdvancedToolbar(next);
    localStorage.setItem('editor_advanced_toolbar', String(next));
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
            <MenuButton onClick={() => setCurrentSubMenu('models')}>
              <div className="icon-wrapper"><FiCpu /></div>
              <div className="label-wrapper">
                <span className="title">{t.settings.manage_models}</span>
                <span className="desc">{t.settings.manage_models_desc}</span>
              </div>
              <FiChevronRight className="chevron" />
            </MenuButton>

            <MenuButton onClick={() => setCurrentSubMenu('autosave')}>
              <div className="icon-wrapper"><FiSave /></div>
              <div className="label-wrapper">
                <span className="title">{t.settings.autosave_settings}</span>
                <span className="desc">{t.settings.autosave_settings_desc}</span>
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

            <MenuButton onClick={() => setCurrentSubMenu('data')}>
              <div className="icon-wrapper"><FiDatabase /></div>
              <div className="label-wrapper">
                <span className="title">{t.settings.data_management}</span>
                <span className="desc">{t.settings.data_management_desc}</span>
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
              title={t.settings.editor_line_numbers}
              desc={t.settings.editor_line_numbers_desc}
              checked={lineNumbers}
              onChange={toggleLineNumbers}
            />
            <EditorSettingItem
              title={t.settings.editor_large_size}
              desc={t.settings.editor_large_size_desc}
              checked={largeSize}
              onChange={toggleLargeSize}
            />
            <EditorSettingItem
              title={t.settings.editor_advanced_toolbar}
              desc={t.settings.editor_advanced_toolbar_desc}
              checked={advancedToolbar}
              onChange={toggleAdvancedToolbar}
            />
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
                <span style={{ display: 'block', fontWeight: 600, fontSize: '1.05rem', marginBottom: '0.2rem' }}>{t.settings.editor_tab_size}</span>
                <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', opacity: 0.8 }}>{t.settings.editor_tab_size_desc}</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <TabButton active={tabSize === 2} onClick={() => handleTabSizeChange(2)}>2</TabButton>
                <TabButton active={tabSize === 4} onClick={() => handleTabSizeChange(4)}>4</TabButton>
              </div>
            </div>
          </div>
        </Section>
      )}

      {currentSubMenu === 'data' && (
        <Section>
          {renderHeader(t.settings.data_management)}
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

      {currentSubMenu === 'autosave' && (
        <AutosaveSection onBack={() => setCurrentSubMenu('main')} />
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

          <div style={{ marginTop: '2.5rem', padding: '1.5rem', background: 'var(--surface-color)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-color)' }}>{t.settings.share_app}</h4>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{t.settings.share_desc}</p>
            <ActionButton onClick={handleShare} style={{ width: '100%' }}>
              <FiShare2 /> {t.settings.share_app}
            </ActionButton>
          </div>

          <div style={{ marginTop: '2.5rem', padding: '1.25rem', background: 'rgba(0,0,0,0.03)', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
            <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-color)', fontWeight: 600 }}>{t.settings.disclaimer_title}</h5>
            <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: '1.5' }}>{t.settings.disclaimer_text}</p>
          </div>

          <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--surface-color)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
            {t.settings.app_tagline}
          </div>
        </Section>
      )}

      {/* Export Modal moved to shared component */}
    </Container>
  );
};