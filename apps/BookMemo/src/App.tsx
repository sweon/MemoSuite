import { useLayoutEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ColorThemeProvider, GlobalStyle, InstallPrompt, AuthProvider, LockScreen, useAuth, ModalProvider, LanguageProvider, useLanguage } from '@memosuite/shared';
import { SearchProvider } from './contexts/SearchContext';
import { translations } from './translations';
import { MainLayout } from './components/Layout/MainLayout';
import { ExitGuardProvider } from '@memosuite/shared-drawing';
import { BookDetail } from './components/BookView/BookDetail';
import { AddBookPage } from './components/BookView/AddBookPage';
import { EditBookPage } from './components/BookView/EditBookPage';
import { MemoDetail } from './components/LogView/MemoDetail';
import { EmptyState } from './components/LogView/EmptyState';
import { SettingsPage } from './pages/SettingsPage';
import { AndroidExitHandler } from './components/AndroidExitHandler';

function AppContent() {
  const { t } = useLanguage();
  const { isLocked, isLoading } = useAuth();

  // Reset to home on initial startup or update refresh
  useLayoutEffect(() => {
    if (window.location.hash !== '' && window.location.hash !== '#/') {
      window.location.hash = '#/';
    }
  }, []);

  if (isLoading) return null;
  if (isLocked) return <LockScreen appName="BookMemo" />;

  return (

    <ExitGuardProvider>
      <ColorThemeProvider storageKeyPrefix="bookmemo" GlobalStyleComponent={GlobalStyle}>
        <ModalProvider>
          <SearchProvider>
            <HashRouter>
              <AndroidExitHandler />
              <InstallPrompt appName="BookMemo" t={t} iconPath="./pwa-192x192.png" />
              <Routes>
                <Route path="/" element={<MainLayout />}>
                  <Route index element={<EmptyState />} />
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
