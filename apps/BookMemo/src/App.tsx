import { useLayoutEffect, useEffect } from 'react';
import { AuthProvider, ColorThemeProvider, GlobalStyle, InstallPrompt, LanguageProvider, LockScreen, ModalProvider, useAuth, useLanguage, requestPersistence } from '@memosuite/shared';

import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';

import { SearchProvider } from './contexts/SearchContext';
import { FolderProvider } from './contexts/FolderContext';
import { translations } from './translations';
import { MainLayout } from './components/Layout/MainLayout';
import { ExitGuardProvider } from '@memosuite/shared-drawing';
import { BookDetail } from './components/BookView/BookDetail';
import { AddBookPage } from './components/BookView/AddBookPage';
import { EditBookPage } from './components/BookView/EditBookPage';
import { MemoDetail } from './components/MemoView/MemoDetail';
import { EmptyState } from './components/MemoView/EmptyState';
import { SettingsPage } from './pages/SettingsPage';
import { FolderPage } from './pages/FolderPage';
import { AndroidExitHandler } from './components/AndroidExitHandler';

import { db } from './db';

function AppContent() {
  const { t } = useLanguage();
  const { isLocked, isLoading } = useAuth();

  // Request storage persistence on startup
  useEffect(() => {
    requestPersistence();
  }, []);

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
        const finalTitle = draft.title.trim() || `(Recovered) ${now.toLocaleString()}`;

        await db.memos.add({
          folderId: defaultFolderId,
          bookId: draft.bookId,
          title: finalTitle,
          content: draft.content,
          tags: draft.tags,
          pageNumber: draft.pageNumber,
          quote: draft.quote,
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
  }, []);

  if (isLoading) return null;
  if (isLocked) return <LockScreen appName="BookMemo" />;

  return (

    <ExitGuardProvider>
      <ColorThemeProvider storageKeyPrefix="bookmemo" defaultLightThemeId="bookmemo_light" defaultDarkThemeId="bookmemo_dark" GlobalStyleComponent={GlobalStyle}>
        <ModalProvider>
          <FolderProvider>
            <SearchProvider>
              <HashRouter>
                <AndroidExitHandler />
                <InstallPrompt appName="BookMemo" t={t} iconPath="./pwa-192x192.png" />
                <Routes>
                  <Route path="/" element={<MainLayout />}>
                    <Route index element={<EmptyState />} />
                    <Route path="folders" element={<FolderPage />} />
                    <Route path="book/new" element={<AddBookPage />} />
                    <Route path="book/:bookId" element={<BookDetail />}>
                      <Route path="edit" element={<EditBookPage />} />
                      <Route path="memo/:id" element={<MemoDetail />} />
                      <Route path="new" element={<MemoDetail />} />
                    </Route>
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
    <LanguageProvider appName="bookmemo" initialTranslations={translations}>
      <AuthProvider storageKeyPrefix="bookmemo">
        <AppContent />
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;