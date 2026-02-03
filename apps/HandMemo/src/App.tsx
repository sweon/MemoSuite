import { useLayoutEffect, useEffect } from 'react';
import { AuthProvider, ColorThemeProvider, GlobalStyle, InstallPrompt, LanguageProvider, LockScreen, ModalProvider, useAuth, useLanguage } from '@memosuite/shared';

import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';

import { SearchProvider } from './contexts/SearchContext';
import { FolderProvider } from './contexts/FolderContext';
import { translations } from './translations';
import { MainLayout } from './components/Layout/MainLayout';
import { ExitGuardProvider } from '@memosuite/shared-drawing';

import { MemoDetail } from './components/MemoView/MemoDetail';
import { EmptyState } from './components/MemoView/EmptyState';
import { SettingsPage } from './pages/SettingsPage';
import { FolderPage } from './pages/FolderPage';
import { AndroidExitHandler } from './components/AndroidExitHandler';
import { Toast } from './components/UI/Toast';
import pkg from '../package.json';
import { db } from './db';
import { useParams } from 'react-router-dom';

const MemoDetailWrapper = () => {
  const { id } = useParams();
  return <MemoDetail key={id} />;
};

function AppContent() {
  const { t } = useLanguage();
  const { isLocked, isLoading } = useAuth();

  // Automatic recovery of orphaned autosaves on startup
  useEffect(() => {
    const recoverAutosaves = async () => {
      if (isLocked || isLoading) return;

      const orphaned = await db.autosaves.filter(a => a.originalId === undefined).toArray();
      if (orphaned.length === 0) return;

      const folders = await db.folders.toArray();
      const defaultFolderId = folders[0]?.id;

      for (const draft of orphaned) {
        if (!draft.content.trim() && !draft.title.trim() && !draft.commentDraft) {
          await db.autosaves.delete(draft.id!);
          continue;
        }

        const now = new Date();
        const firstLine = draft.content.split('\n')[0].replace(/[#*`\s]/g, ' ').trim();
        const finalTitle = draft.title.trim() || firstLine.substring(0, 50) || `(Recovered) ${now.toLocaleString()}`;

        await db.memos.add({
          folderId: defaultFolderId,
          title: finalTitle,
          content: draft.content,
          tags: draft.tags,
          createdAt: draft.createdAt, // Keep original creation time
          updatedAt: now,
          type: 'normal'
        });

        await db.autosaves.delete(draft.id!);
      }
    };
    recoverAutosaves();
  }, [isLocked, isLoading]);

  // No longer reset hash to home on startup, as it breaks deep links and share targets.
  // The app should honor the current URL.
  useLayoutEffect(() => {
    // If we have search params but NO hash, we might want to ensure we're at root
    // But HashRouter handles this usually.
  }, []);

  if (isLoading) return null;
  if (isLocked) return <LockScreen appName="HandMemo" />;

  const currentVersion = pkg.version;
  const lastVersion = localStorage.getItem('handmemo_version');
  const isUpdated = lastVersion && lastVersion !== currentVersion;

  return (
    <ExitGuardProvider>
      <ColorThemeProvider storageKeyPrefix="handmemo" GlobalStyleComponent={GlobalStyle}>
        <ModalProvider>
          <FolderProvider>
            <SearchProvider>
              <HashRouter>
                <AndroidExitHandler />
                <InstallPrompt appName="HandMemo" t={t} iconPath="./pwa-192x192.png" />
                {isUpdated && (
                  <Toast
                    message={`${t.sidebar.app_updated} (v${currentVersion})`}
                    onClose={() => localStorage.setItem('handmemo_version', currentVersion)}
                    duration={5000}
                  />
                )}
                <Routes>
                  <Route path="/" element={<MainLayout />}>
                    <Route index element={<EmptyState />} />
                    <Route path="memo/new" element={<MemoDetail key="new" />} />
                    <Route path="memo/:id" element={<MemoDetailWrapper />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="folders" element={<FolderPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Route>
                </Routes>
              </HashRouter>
            </SearchProvider>
          </FolderProvider>
        </ModalProvider>
      </ColorThemeProvider>
    </ExitGuardProvider>
  );
}

function App() {
  return (
    <LanguageProvider appName="handmemo" initialTranslations={translations}>
      <AuthProvider storageKeyPrefix="handmemo">
        <AppContent />
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;