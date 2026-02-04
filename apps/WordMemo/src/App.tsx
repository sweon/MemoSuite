import { useLayoutEffect, useEffect } from 'react';
import { AuthProvider, ColorThemeProvider, GlobalStyle, InstallPrompt, LanguageProvider, LockScreen, ModalProvider, useAuth, useLanguage } from '@memosuite/shared';

import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';

import { SearchProvider } from './contexts/SearchContext';
import { FolderProvider } from './contexts/FolderContext';
import { translations } from './translations';
import { StudyModeProvider } from './contexts/StudyModeContext';
import { MainLayout } from './components/Layout/MainLayout';
import { MemoDetail } from './components/MemoView/MemoDetail';
import { EmptyState } from './components/MemoView/EmptyState';
import { SettingsPage } from './pages/SettingsPage';
import { FolderPage } from './pages/FolderPage';
import { ExitGuardProvider } from '@memosuite/shared-drawing';
import { AndroidExitHandler } from './components/AndroidExitHandler';
import { db } from './db';

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

        await db.words.add({
          folderId: defaultFolderId,
          title: finalTitle,
          content: draft.content,
          tags: draft.tags,
          sourceId: draft.sourceId,
          createdAt: draft.createdAt, // Keep original creation time
          updatedAt: now,
          isStarred: 1
        });

        await db.autosaves.delete(draft.id!);
      }
    };
    recoverAutosaves();
  }, [isLocked, isLoading]);

  // Reset to home on initial startup or update refresh
  useLayoutEffect(() => {
    if (window.location.hash !== '' && window.location.hash !== '#/') {
      window.location.hash = '#/';
    }
  }, []);

  if (isLoading) return null;
  if (isLocked) return <LockScreen appName="WordMemo" />;

  return (

    <ExitGuardProvider>
      <ColorThemeProvider storageKeyPrefix="wordmemo" defaultLightThemeId="wordmemo_light" defaultDarkThemeId="wordmemo_dark" GlobalStyleComponent={GlobalStyle}>
        <ModalProvider>
          <FolderProvider>
            <SearchProvider>
              <HashRouter>
                <AndroidExitHandler />
                <InstallPrompt appName="WordMemo" t={t} iconPath="./pwa-192x192.png" />
                <Routes>
                  <Route path="/" element={<MainLayout />}>
                    <Route index element={<EmptyState />} />
                    <Route path="folders" element={<FolderPage />} />
                    <Route path="new" element={<MemoDetail />} />
                    <Route path="word/:id" element={<MemoDetail />} />
                    <Route path="settings" element={<SettingsPage />} />
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
    <LanguageProvider appName="wordmemo" initialTranslations={translations}>
      <AuthProvider storageKeyPrefix="wordmemo">
        <StudyModeProvider>
          <AppContent />
        </StudyModeProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;