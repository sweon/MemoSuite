import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ColorThemeProvider, GlobalStyle, InstallPrompt, AuthProvider, LockScreen, useAuth, ModalProvider } from '@memosuite/shared';
import { SearchProvider } from './contexts/SearchContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext'; // Added this import
import { MainLayout } from './components/Layout/MainLayout';
import { LogDetail } from './components/LogView/LogDetail';
import { EmptyState } from './components/LogView/EmptyState';
import { SettingsPage } from './pages/SettingsPage';
import { ExitGuardProvider } from '@memosuite/shared-drawing';

import { AndroidExitHandler } from './components/AndroidExitHandler';

function AppContent() {
  const { t } = useLanguage();
  const { isLocked, isLoading } = useAuth();

  if (isLoading) return null;
  if (isLocked) return <LockScreen appName="LLMemo" />;

  return (

    <ExitGuardProvider>
      <ColorThemeProvider storageKeyPrefix="llmemo" GlobalStyleComponent={GlobalStyle}>
        <ModalProvider>
          <SearchProvider>
            <HashRouter>
              <AndroidExitHandler />
              <InstallPrompt appName="LLMemo" t={t} iconPath="./pwa-192x192.png" />
              <Routes>
                <Route path="/" element={<MainLayout />}>
                  <Route index element={<EmptyState />} />
                  <Route path="new" element={<LogDetail />} />
                  <Route path="log/:id" element={<LogDetail />} />
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
      <AuthProvider storageKeyPrefix="llmemo">
        <AppContent />
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
