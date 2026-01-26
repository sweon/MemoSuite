import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ColorThemeProvider, GlobalStyle, InstallPrompt, AuthProvider, LockScreen, useAuth, ModalProvider } from '@memosuite/shared';
import { SearchProvider } from './contexts/SearchContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { MainLayout } from './components/Layout/MainLayout';
import { ExitGuardProvider } from '@memosuite/shared-drawing';

import { MemoDetail } from './components/LogView/MemoDetail';
import { SmartRedirect } from './components/LogView/SmartRedirect';
import { SettingsPage } from './pages/SettingsPage';
import { AndroidExitHandler } from './components/AndroidExitHandler';

function AppContent() {
  const { t } = useLanguage();
  const { isLocked, isLoading } = useAuth();

  if (isLoading) return null;
  if (isLocked) return <LockScreen appName="HandMemo" />;

  return (
    <ExitGuardProvider>
      <ColorThemeProvider storageKeyPrefix="handmemo" GlobalStyleComponent={GlobalStyle}>
        <ModalProvider>
          <SearchProvider>
            <HashRouter>
              <AndroidExitHandler />
              <InstallPrompt appName="HandMemo" t={t} iconPath="./pwa-192x192.png" />
              <Routes>
                <Route path="/" element={<MainLayout />}>
                  <Route index element={<SmartRedirect />} />
                  <Route path="memo/new" element={<MemoDetail />} />
                  <Route path="memo/:id" element={<MemoDetail />} />
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
    <LanguageProvider>
      <AuthProvider storageKeyPrefix="handmemo">
        <AppContent />
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
