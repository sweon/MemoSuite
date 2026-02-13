import React, { useState } from 'react';
import { AppLockSettings, AutoBackupSetup, DataManagementSection, LanguageSettings, ThemeSettings, useColorTheme, useConfirm, useLanguage } from '@memosuite/shared';
import type { UseAutoBackupReturn } from '@memosuite/shared';

import styled from 'styled-components';
import { FiChevronRight, FiArrowLeft, FiDatabase, FiGlobe, FiInfo, FiShare2, FiLock, FiEdit3, FiArrowUpCircle } from 'react-icons/fi';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Toast } from '../components/UI/Toast';
import { bookMemoAdapter } from '../utils/backupAdapter';

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
  border: 1px solid ${({ theme, active }) => (active ? theme.colors.primary : theme.colors.border)};
  background: ${({ theme, active }) => (active ? theme.colors.primary : 'transparent')};
  color: ${({ active }) => (active ? '#fff' : 'inherit')};
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: '1rem',
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
      style={{ width: '28px', height: '28px', cursor: 'pointer', accentColor: 'var(--primary-color)', marginTop: '2px' }}
    />
  </div>
);

type SubMenu = 'main' | 'data' | 'editor' | 'theme' | 'language' | 'about' | 'appLock' | 'updates';

export const SettingsPage: React.FC<{ autoBackup?: UseAutoBackupReturn }> = ({ autoBackup }) => {
  const { t, language } = useLanguage();
  const { confirm } = useConfirm();
  useColorTheme();
  const [currentSubMenu, setCurrentSubMenu] = useState<SubMenu>('main');

  const [spellCheck, setSpellCheck] = useState(() => localStorage.getItem('spellCheck') !== 'false');
  const [lineNumbers, setLineNumbers] = useState(() => localStorage.getItem('editor_line_numbers') === 'true');
  const [tabSize, setTabSize] = useState(() => Number(localStorage.getItem('editor_tab_size')) || 4);
  const [largeSize, setLargeSize] = useState(() => localStorage.getItem('editor_large_size') === 'true');
  const [advancedToolbar, setAdvancedToolbar] = useState(() => localStorage.getItem('editor_advanced_toolbar') !== 'false');
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(() => localStorage.getItem('auto_update_enabled') === 'true');

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

  const toggleAutoUpdate = () => {
    const next = !autoUpdateEnabled;
    setAutoUpdateEnabled(next);
    localStorage.setItem('auto_update_enabled', String(next));
  };

  const handleShare = async () => {
    const shareData = {
      title: 'BookMemo',
      text: t.settings.help_desc,
      url: window.location.origin + window.location.pathname
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
          {autoBackup && (
            <div style={{ marginBottom: '1.5rem' }}>
              <AutoBackupSetup autoBackup={autoBackup} language={language} />
            </div>
          )}
          <DataManagementSection
            adapter={bookMemoAdapter}
            fileNamePrefix="bookmemo"
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
          <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--surface-color)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
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
            <li>{t.settings.help_spreadsheet}</li>
            <li>{t.settings.help_share_memo}</li>
            <li>{t.settings.help_backup}</li>
            <li>{t.settings.help_markdown}</li>
            <li>{t.settings.help_tags}</li>
            <li>{t.settings.help_comments}</li>
            <li>{t.settings.help_app_lock}</li>
            <li>{t.settings.help_math}</li>
          </HelpList>

          <div style={{ marginTop: '2.5rem', padding: '1.5rem', background: 'var(--surface-color)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-color)' }}>{t.settings.memosuite_apps}</h4>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{t.settings.memosuite_apps_desc}</p>
            <ActionButton onClick={() => window.open('https://sweon.github.io/MemoSuite/', '_blank')} style={{ width: '100%' }}>
              <FiShare2 /> {t.settings.memosuite_apps}
            </ActionButton>
          </div>

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

      {toastMessage && (
        <Toast
          message={toastMessage}
          onClose={() => setToastMessage(null)}
        />
      )}
    </Container>
  );
};