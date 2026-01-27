import React, { useState, useRef, useEffect } from 'react';
import { AppLockSettings, LanguageSettings, PasswordModal, ThemeSettings, useConfirm, useLanguage } from '@memosuite/shared';

import styled, { keyframes } from 'styled-components';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { exportData, importData } from '../utils/backup';
import { FiTrash2, FiPlus, FiDownload, FiUpload, FiChevronRight, FiArrowLeft, FiDatabase, FiCpu, FiGlobe, FiInfo, FiShare2, FiAlertTriangle, FiEdit3, FiLock, FiLayers, FiTrendingUp } from 'react-icons/fi';
import { MdDragIndicator } from 'react-icons/md';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';

import { TouchDelayDraggable } from '../components/Sidebar/TouchDelayDraggable';

const Container = styled.div`
  padding: 24px 32px;
  margin: 0;
  height: 100%;
  overflow-y: auto;
  width: 100%;
  
  @media (max-width: 600px) {
    padding: 16px;
  }
`;

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

const SourceList = styled.ul`
  list-style: none;
  padding: 0;
`;

const SourceItem = styled.li<{ $isDragging?: boolean }>`
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

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
`;

const ModalContent = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  padding: 2rem;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
`;

const ModalHeader = styled.h3`
  margin-top: 0;
  margin-bottom: 1rem;
  color: ${({ theme }) => theme.colors.text};
`;

const ModalBody = styled.div`
  flex: 1;
  overflow-y: auto;
  margin-bottom: 1.5rem;
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
`;

const RadioLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
  padding: 1rem;
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text};
  transition: all 0.2s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }

  input {
    width: 18px;
    height: 18px;
    accent-color: ${({ theme }) => theme.colors.primary};
  }
`;

const ScrollableList = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  max-height: 200px;
  overflow-y: auto;
  padding: 0.5rem;
  margin-top: 0.5rem;
  background: ${({ theme }) => theme.colors.surface};
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.25rem;
  padding: 0.5rem;
  border-radius: 4px;
  font-size: 0.9rem;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text};
  
  &:hover {
    background: ${({ theme }) => theme.colors.background};
  }

  input {
    accent-color: ${({ theme }) => theme.colors.primary};
  }
`;

const Select = styled.select`
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  font-size: 1rem;
  width: 100%;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

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

type SubMenu = 'main' | 'sources' | 'data' | 'editor' | 'language' | 'about' | 'learning' | 'llm' | 'theme' | 'appLock';

export const SettingsPage: React.FC = () => {
  const { t } = useLanguage();
  const { confirm } = useConfirm();
  const [currentSubMenu, setCurrentSubMenu] = useState<SubMenu>('main');
  const [spellCheck, setSpellCheck] = useState(() => localStorage.getItem('spellCheck') !== 'false');
  const [wordLevel, setWordLevel] = useState(() => {
    const saved = localStorage.getItem('wordLevel');
    return saved !== null ? Number(saved) : 1;
  });
  const [llmProvider, setLlmProvider] = useState(() => localStorage.getItem('llm_provider') || 'ChatGPT');
  const [autosave, setAutosave] = useState(() => localStorage.getItem('editor_autosave') !== 'false');
  const [lineNumbers, setLineNumbers] = useState(() => localStorage.getItem('editor_line_numbers') === 'true');
  const [tabSize, setTabSize] = useState(() => Number(localStorage.getItem('editor_tab_size')) || 4);
  const [largeSize, setLargeSize] = useState(() => localStorage.getItem('editor_large_size') === 'true');
  const [advancedToolbar, setAdvancedToolbar] = useState(() => localStorage.getItem('editor_advanced_toolbar') !== 'false');
  const sources = useLiveQuery(() => db.sources.orderBy('order').toArray());
  const llmProviders = useLiveQuery(() => db.llmProviders.orderBy('order').toArray());

  const [newLLMName, setNewLLMName] = useState('');
  const [newLLMUrl, setNewLLMUrl] = useState('');

  useEffect(() => {
    const initializeOrder = async () => {
      const allSources = await db.sources.toArray();
      if (allSources.length > 0 && allSources.some(s => s.order === undefined)) {
        await db.transaction('rw', db.sources, async () => {
          for (let i = 0; i < allSources.length; i++) {
            if (allSources[i].order === undefined) {
              await db.sources.update(allSources[i].id!, { order: i });
            }
          }
        });
      }

      // Ensure 'Random' source exists
      if (!allSources.some(s => s.name === 'Random')) {
        await db.sources.add({ name: 'Random', order: allSources.length });
      }

      // Initialize LLM Providers if empty (for existing users upgrading to v5)
      const existingLLMs = await db.llmProviders.toArray();
      if (existingLLMs.length === 0) {
        await db.llmProviders.bulkAdd([
          { name: 'ChatGPT', url: 'https://chatgpt.com/', order: 0 },
          { name: 'Gemini', url: 'https://gemini.google.com/app', order: 1 },
          { name: 'Claude', url: 'https://claude.ai/', order: 2 },
          { name: 'Perplexity', url: 'https://www.perplexity.ai/', order: 3 },
          { name: 'Grok', url: 'https://grok.com/', order: 4 }
        ]);
      }
    };
    initializeOrder();
  }, []);

  const [newSource, setNewSource] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportMode, setExportMode] = useState<'all' | 'selected'>('all');
  const [selectedLogs, setSelectedLogs] = useState<Set<number>>(new Set());
  const [exportFileName, setExportFileName] = useState('');
  const allLogs = useLiveQuery(() => db.logs.orderBy('createdAt').reverse().toArray());

  const handleExportClick = () => {
    setShowExportModal(true);
    setExportMode('all');
    setSelectedLogs(new Set());
    setExportFileName(`wordmemo-backup-${new Date().toISOString().slice(0, 10)}`);
  };

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordModalMode, setPasswordModalMode] = useState<'export' | 'import'>('export');
  const [tempFile, setTempFile] = useState<File | null>(null);

  const handlePasswordConfirm = async (password: string) => {
    setShowPasswordModal(false);
    try {
      if (passwordModalMode === 'export') {
        if (exportMode === 'all') {
          await exportData(undefined, exportFileName, password);
        } else {
          await exportData(Array.from(selectedLogs), exportFileName, password);
        }
      } else {
        if (tempFile) {
          await importData(tempFile, password);
          await confirm({ message: t.settings.import_success, cancelText: null });
        }
      }
    } catch (err: any) {
      if (passwordModalMode === 'import' && err.message === 'INVALID_PASSWORD') {
        await confirm({ message: t.settings.invalid_password, cancelText: null });
      } else {
        await confirm({ message: "Operation failed: " + err, cancelText: null });
      }
    }
    setTempFile(null);
  };

  const confirmExport = async () => {
    setShowExportModal(false);
    setPasswordModalMode('export');
    setShowPasswordModal(true);
  };

  const toggleSpellCheck = () => {
    const next = !spellCheck;
    setSpellCheck(next);
    localStorage.setItem('spellCheck', String(next));
  };

  const toggleAutosave = () => {
    const next = !autosave;
    setAutosave(next);
    localStorage.setItem('editor_autosave', String(next));
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

  const toggleLogSelection = (id: number) => {
    const next = new Set(selectedLogs);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedLogs(next);
  };

  const handleLevelChange = (level: number) => {
    setWordLevel(level);
    localStorage.setItem('wordLevel', String(level));
  };

  const handleProviderChange = (provider: string) => {
    setLlmProvider(provider);
    localStorage.setItem('llm_provider', provider);
  };

  const handleAddSource = async () => {
    if (newSource.trim()) {
      await db.transaction('rw', db.sources, async () => {
        const allSources = await db.sources.orderBy('order').toArray();
        for (const s of allSources) {
          if (s.id !== undefined) {
            await db.sources.update(s.id, { order: (s.order ?? 0) + 1 });
          }
        }
        await db.sources.add({
          name: newSource.trim(),
          order: 0
        });
      });
      setNewSource('');
    }
  };

  const handleDeleteSource = async (id: number) => {
    if (await confirm({ message: t.settings.delete_confirm, isDestructive: true })) {
      await db.sources.delete(id);
    }
  };

  const handleAddLLM = async () => {
    if (newLLMName.trim() && newLLMUrl.trim()) {
      await db.transaction('rw', db.llmProviders, async () => {
        const allLLMs = await db.llmProviders.orderBy('order').toArray();
        for (const l of allLLMs) {
          if (l.id !== undefined) {
            await db.llmProviders.update(l.id, { order: (l.order ?? 0) + 1 });
          }
        }
        await db.llmProviders.add({
          name: newLLMName.trim(),
          url: newLLMUrl.trim(),
          order: 0
        });
      });
      setNewLLMName('');
      setNewLLMUrl('');
    }
  };

  const handleDeleteLLM = async (id: number) => {
    if (await confirm({ message: t.settings.llm_delete_confirm, isDestructive: true })) {
      await db.llmProviders.delete(id);
    }
  };

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;
    if (sourceIndex === destIndex) return;

    if (result.type === 'source' && sources) {
      const newSources = Array.from(sources);
      const [removed] = newSources.splice(sourceIndex, 1);
      newSources.splice(destIndex, 0, removed);
      await db.transaction('rw', db.sources, async () => {
        for (let i = 0; i < newSources.length; i++) {
          if (newSources[i].id !== undefined) {
            await db.sources.update(newSources[i].id!, { order: i });
          }
        }
      });
    } else if (result.type === 'llm' && llmProviders) {
      const newLLMs = Array.from(llmProviders);
      const [removed] = newLLMs.splice(sourceIndex, 1);
      newLLMs.splice(destIndex, 0, removed);
      await db.transaction('rw', db.llmProviders, async () => {
        for (let i = 0; i < newLLMs.length; i++) {
          if (newLLMs[i].id !== undefined) {
            await db.llmProviders.update(newLLMs[i].id!, { order: i });
          }
        }
      });
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (await confirm({ message: t.settings.import_confirm, isDestructive: true })) {
        try {
          await importData(file);
          await confirm({ message: t.settings.import_success, cancelText: null });
        } catch (err: any) {
          if (err.message === 'PASSWORD_REQUIRED') {
            setTempFile(file);
            setPasswordModalMode('import');
            setShowPasswordModal(true);
          } else {
            await confirm({ message: t.settings.import_failed + ": " + (err.message || err), cancelText: null });
          }
        }
      }
      // Reset input value to allow importing the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: 'WordMemo',
      text: t.settings.help_desc,
      url: '#'
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        await confirm({ message: t.settings.share_success, cancelText: null });
      }
    } catch (err) {
      console.log('Share failed:', err);
    }
  };

  const handleFactoryReset = async () => {
    if (await confirm({ message: t.settings.reset_confirm, isDestructive: true })) {
      try {
        // Clear IndexedDB
        await db.delete();
        // Clear LocalStorage (including theme, sidebar width, etc)
        localStorage.clear();

        await confirm({ message: t.settings.reset_success, cancelText: null });
        window.location.reload();
      } catch (e) {
        console.error("Reset failed:", e);
        await confirm({ message: "Reset failed: " + e, cancelText: null });
      }
    }
  };

  const renderHeader = (title: string) => (
    <Header>
      <BackButton onClick={() => setCurrentSubMenu('main')}>
        <FiArrowLeft size={20} />
      </BackButton>
      <Title>{title}</Title>
    </Header>
  );

  return (
    <Container translate="no">
      {currentSubMenu === 'main' && (
        <Section>
          <Title style={{ marginBottom: '1.5rem' }}>{t.settings.title}</Title>
          <MenuList>
            <MenuButton onClick={() => setCurrentSubMenu('sources')}>
              <div className="icon-wrapper"><FiLayers /></div>
              <div className="label-wrapper">
                <span className="title">{t.settings.manage_sources}</span>
                <span className="desc">{t.settings.manage_sources_desc}</span>
              </div>
              <FiChevronRight className="chevron" />
            </MenuButton>

            <MenuButton onClick={() => setCurrentSubMenu('llm')}>
              <div className="icon-wrapper"><FiCpu /></div>
              <div className="label-wrapper">
                <span className="title">{t.settings.llm_config}</span>
                <span className="desc">{t.settings.llm_config_desc}</span>
              </div>
              <FiChevronRight className="chevron" />
            </MenuButton>

            <MenuButton onClick={() => setCurrentSubMenu('learning')}>
              <div className="icon-wrapper"><FiTrendingUp /></div>
              <div className="label-wrapper">
                <span className="title">{t.settings.learning}</span>
                <span className="desc">{t.settings.level_desc}</span>
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

      {currentSubMenu === 'appLock' && (
        <Section>
          {renderHeader(t.settings.app_lock)}
          <AppLockSettings t={t} />
        </Section>
      )}

      {currentSubMenu === 'sources' && (
        <Section>
          {renderHeader(t.settings.manage_sources)}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <Input
              value={newSource}
              onChange={e => setNewSource(e.target.value)}
              placeholder={t.settings.add_source_placeholder}
              onKeyDown={(e) => e.key === 'Enter' && newSource.trim() && handleAddSource()}
            />
            <ActionButton onClick={handleAddSource} disabled={!newSource.trim()}><FiPlus /> {t.settings.add}</ActionButton>
          </div>

          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="sources">
              {(provided) => (
                <SourceList {...provided.droppableProps} ref={provided.innerRef}>
                  {sources?.map((s, index) => (
                    <TouchDelayDraggable key={s.id} draggableId={s.id!.toString()} index={index}>
                      {(provided, snapshot) => (
                        <SourceItem
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          $isDragging={snapshot.isDragging}
                        >
                          <DragHandle {...provided.dragHandleProps}>
                            <MdDragIndicator size={20} />
                          </DragHandle>
                          <span style={{ flex: 1, fontWeight: 500 }}>{s.name}</span>
                          <IconButton onClick={() => handleDeleteSource(s.id!)}>
                            <FiTrash2 size={18} />
                          </IconButton>
                        </SourceItem>
                      )}
                    </TouchDelayDraggable>
                  ))}
                  {provided.placeholder}
                </SourceList>
              )}
            </Droppable>
          </DragDropContext>
        </Section>
      )}

      {currentSubMenu === 'data' && (
        <Section>
          {renderHeader(t.settings.data_management)}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
            <ActionButton onClick={handleExportClick}><FiDownload /> {t.settings.export_backup}</ActionButton>
            <ActionButton onClick={() => fileInputRef.current?.click()} $variant="success"><FiUpload /> {t.settings.import_restore}</ActionButton>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".json"
              onChange={handleImport}
            />

            <div style={{ margin: '1rem 0', borderBottom: '1px solid var(--border-color)' }}></div>

            <div style={{
              padding: '1rem',
              background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(239, 68, 68, 0.2)'
            }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--danger-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiAlertTriangle /> {t.settings.factory_reset}
              </h4>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', opacity: 0.8 }}>
                {t.settings.reset_confirm}
              </p>
              <ActionButton onClick={handleFactoryReset} $variant="secondary" style={{ color: 'var(--danger-color)', borderColor: 'var(--danger-color)', width: '100%' }}>
                <FiTrash2 /> {t.settings.factory_reset}
              </ActionButton>
            </div>
          </div>
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
              title={t.settings.editor_autosave}
              desc={t.settings.editor_autosave_desc}
              checked={autosave}
              onChange={toggleAutosave}
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

      {currentSubMenu === 'language' && (
        <Section>
          {renderHeader(t.settings.language)}
          <LanguageSettings />
        </Section>
      )}

      {currentSubMenu === 'llm' && (
        <Section>
          {renderHeader(t.settings.llm_config)}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <p style={{ fontSize: '0.95rem', lineHeight: '1.5', opacity: 0.8 }}>
              Select an AI service to use for "Random Word" recommendations.
              The app will copy a prompt to your clipboard and open the service in a new tab.
            </p>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>{t.settings.llm_provider}</label>
              <Select
                value={llmProvider}
                onChange={(e) => handleProviderChange(e.target.value)}
              >
                {llmProviders?.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </Select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '1rem', fontWeight: 600 }}>{t.settings.llm_reorder_hint}</label>
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="llm-list" type="llm">
                  {(provided) => (
                    <SourceList {...provided.droppableProps} ref={provided.innerRef}>
                      {llmProviders?.map((p, index) => (
                        <TouchDelayDraggable key={String(p.id)} draggableId={String(p.id)} index={index}>
                          {(provided, snapshot) => (
                            <SourceItem
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              $isDragging={snapshot.isDragging}
                            >
                              <DragHandle {...provided.dragHandleProps}>
                                <MdDragIndicator size={20} />
                              </DragHandle>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600 }}>{p.name}</div>
                                <div style={{ fontSize: '0.75rem', opacity: 0.6, wordBreak: 'break-all' }}>{p.url}</div>
                              </div>
                              <IconButton onClick={() => handleDeleteLLM(p.id!)}>
                                <FiTrash2 size={18} />
                              </IconButton>
                            </SourceItem>
                          )}
                        </TouchDelayDraggable>
                      ))}
                      {provided.placeholder}
                    </SourceList>
                  )}
                </Droppable>
              </DragDropContext>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1.25rem', background: 'var(--surface-color)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t.settings.llm_add_provider}</label>
              <Input
                value={newLLMName}
                onChange={(e) => setNewLLMName(e.target.value)}
                placeholder={t.settings.llm_name_placeholder}
              />
              <Input
                value={newLLMUrl}
                onChange={(e) => setNewLLMUrl(e.target.value)}
                placeholder={t.settings.llm_url_placeholder}
              />
              <ActionButton onClick={handleAddLLM} style={{ marginTop: '0.5rem' }}>
                <FiPlus /> {t.settings.add}
              </ActionButton>
            </div>

            <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.03)', borderRadius: '12px', fontSize: '0.85rem' }}>
              <span style={{ fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>💡 How it works</span>
              1. Click 'Random Word' in the editor.<br />
              2. The prompt is automatically copied.<br />
              3. Paste (Ctrl+V) it into the AI window that opens.
            </div>
          </div>
        </Section>
      )}

      {currentSubMenu === 'learning' && (
        <Section>
          {renderHeader(t.settings.learning)}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <RadioLabel onClick={() => handleLevelChange(0)}>
              <input type="radio" checked={wordLevel === 0} readOnly />
              <div style={{ flex: 1 }}>
                <span style={{ display: 'block', fontWeight: 600 }}>{t.settings.level_0}</span>
                <span style={{ display: 'block', fontSize: '0.85rem', opacity: 0.8 }}>Basic English for young learners</span>
              </div>
            </RadioLabel>
            <RadioLabel onClick={() => handleLevelChange(1)}>
              <input type="radio" checked={wordLevel === 1} readOnly />
              <div style={{ flex: 1 }}>
                <span style={{ display: 'block', fontWeight: 600 }}>{t.settings.level_1}</span>
                <span style={{ display: 'block', fontSize: '0.85rem', opacity: 0.8 }}>Common everyday vocabulary and phrases</span>
              </div>
            </RadioLabel>
            <RadioLabel onClick={() => handleLevelChange(2)}>
              <input type="radio" checked={wordLevel === 2} readOnly />
              <div style={{ flex: 1 }}>
                <span style={{ display: 'block', fontWeight: 600 }}>{t.settings.level_2}</span>
                <span style={{ display: 'block', fontSize: '0.85rem', opacity: 0.8 }}>Intermediate vocabulary for daily life</span>
              </div>
            </RadioLabel>
            <RadioLabel onClick={() => handleLevelChange(3)}>
              <input type="radio" checked={wordLevel === 3} readOnly />
              <div style={{ flex: 1 }}>
                <span style={{ display: 'block', fontWeight: 600 }}>{t.settings.level_3}</span>
                <span style={{ display: 'block', fontSize: '0.85rem', opacity: 0.8 }}>Advanced academic and professional terms</span>
              </div>
            </RadioLabel>
          </div>
        </Section>
      )}

      {currentSubMenu === 'about' && (
        <Section>
          {renderHeader(t.settings.help_title)}
          <p style={{ marginBottom: '1.5rem', lineHeight: '1.6', fontSize: '1.1rem', fontWeight: 500 }}>{t.settings.help_desc}</p>

          <h4 style={{ margin: '1.5rem 0 1rem 0', color: 'var(--primary-color)' }}>{t.settings.help_core_features}</h4>
          <HelpList>
            <li>{t.settings.help_level}</li>
            <li>{t.settings.help_hide}</li>
            <li>{t.settings.help_star}</li>
            <li>{t.settings.help_ai_recommend}</li>
            <li>{t.settings.help_ai_sentence}</li>
            <li>{t.settings.help_threads}</li>
            <li>{t.settings.help_drawing}</li>
          </HelpList>

          <h4 style={{ margin: '2rem 0 1rem 0', color: 'var(--primary-color)' }}>{t.settings.help_essential_features}</h4>
          <HelpList>
            <li>{t.settings.help_theme}</li>
            <li>{t.settings.help_app_lock}</li>
            <li>{t.settings.help_sync}</li>
            <li>{t.settings.help_backup}</li>
            <li>{t.settings.help_offline}</li>
            <li>{t.settings.help_serverless}</li>
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

      {showExportModal && (
        <ModalOverlay onClick={() => setShowExportModal(false)}>
          <ModalContent onClick={e => e.stopPropagation()}>
            <ModalHeader>{t.settings.export_data}</ModalHeader>
            <ModalBody>
              <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 600 }}>{t.settings.export_mode}</label>
              <RadioLabel>
                <input type="radio" checked={exportMode === 'all'} onChange={() => setExportMode('all')} />
                {t.settings.all_data}
              </RadioLabel>
              <RadioLabel>
                <input type="radio" checked={exportMode === 'selected'} onChange={() => setExportMode('selected')} />
                {t.settings.select_logs}
              </RadioLabel>

              <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{t.settings.filename_optional}</label>
                <Input
                  value={exportFileName}
                  onChange={e => setExportFileName(e.target.value)}
                  placeholder={t.settings.enter_filename}
                  style={{ width: '100%' }}
                />
              </div>

              {exportMode === 'selected' && (
                <ScrollableList>
                  {allLogs?.length === 0 ? (
                    <div style={{ padding: '0.5rem', opacity: 0.6 }}>{t.settings.no_logs_found}</div>
                  ) : (
                    allLogs?.map(log => (
                      <CheckboxLabel key={log.id}>
                        <input
                          type="checkbox"
                          checked={selectedLogs.has(log.id!)}
                          onChange={() => toggleLogSelection(log.id!)}
                        />
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {log.title || t.sidebar.untitled}
                        </span>
                      </CheckboxLabel>
                    ))
                  )}
                </ScrollableList>
              )}
            </ModalBody>
            <ModalFooter>
              <ActionButton onClick={() => setShowExportModal(false)} $variant="secondary">{t.settings.cancel}</ActionButton>
              <ActionButton onClick={confirmExport} disabled={exportMode === 'selected' && selectedLogs.size === 0}>
                <FiDownload /> {t.settings.export}
              </ActionButton>
            </ModalFooter>
          </ModalContent>
        </ModalOverlay>
      )}
      <PasswordModal
        isOpen={showPasswordModal}
        title={passwordModalMode === 'export' ? t.settings.backup_password_set : t.settings.backup_password_enter}
        message={passwordModalMode === 'export'
          ? t.settings.backup_password_set_msg
          : t.settings.backup_password_enter_msg}
        onConfirm={handlePasswordConfirm}
        onCancel={() => {
          setShowPasswordModal(false);
          setTempFile(null);
        }}
        allowEmpty={passwordModalMode === 'export'}
        confirmText={passwordModalMode === 'export' ? t.settings.export : 'OK'}
      />
    </Container>
  );
};