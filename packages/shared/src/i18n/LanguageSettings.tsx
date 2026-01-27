import React, { useState } from 'react';
import styled from 'styled-components';
import { useLanguage } from './LanguageContext';
import { TranslationManager } from './TranslationManager';
import { FiGlobe, FiEdit3, FiX } from 'react-icons/fi';

const SettingsItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  margin-bottom: 0.75rem;
`;

const Info = styled.div`
  flex: 1;
`;

const Title = styled.span`
  display: block;
  font-weight: 600;
  font-size: 1.05rem;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 0.2rem;
`;

const Desc = styled.span`
  display: block;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  opacity: 0.8;
`;

const Select = styled.select`
  padding: 0.6rem 1rem;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.95rem;
  cursor: pointer;
  outline: none;
  max-width: 240px;
  text-overflow: ellipsis;

  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const TranslateButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.75rem 1.25rem;
  background: ${({ theme }) => `${theme.colors.primary}11`};
  color: ${({ theme }) => theme.colors.primary};
  border: 1px solid ${({ theme }) => `${theme.colors.primary}22`};
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;

  &:hover {
    background: ${({ theme }) => `${theme.colors.primary}22`};
    transform: translateY(-1px);
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: flex-start; /* Better for scrolling from top */
  z-index: 2000;
  backdrop-filter: blur(8px);
  overflow-y: auto; /* Enable safe scroll for entire modal */
  padding: 1rem;
  
  @media (min-width: 768px) {
    align-items: center;
    padding: 2rem;
  }
`;

const ModalContent = styled.div`
  background: ${({ theme }) => theme.colors.background};
  width: 100%;
  max-width: 1100px;
  height: 85vh; /* Fixed height relative to viewport to ensure containment */
  display: flex;
  flex-direction: column;
  border-radius: 24px;
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.6);
  overflow: hidden; 
  position: relative;
  margin: auto;
  border: 1px solid ${({ theme }) => theme.colors.border};

  @media (max-width: 1024px) {
    width: 95%;
    height: 90vh;
  }
`;

const ModalHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: ${({ theme }) => theme.colors.surface};
`;

const CloseButton = styled.button`
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.textSecondary};
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #ef444411;
    color: #ef4444;
    border-color: #ef444433;
  }
`;

const ManagerWrapper = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto; /* The entire content inside modal body scrolls together */

  /* Premium High-Visibility Scrollbar */
  &::-webkit-scrollbar {
    width: 10px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border};
    border-radius: 10px;
    border: 2px solid ${({ theme }) => theme.colors.background};
  }
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.colors.primary};
  }
`;

export const LanguageSettings: React.FC = () => {
  const { language, setLanguage, availableLanguages, t } = useLanguage();
  const [showManager, setShowManager] = useState(false);

  return (
    <>
      <SettingsItem>
        <Info>
          <Title>{t.settings?.language || 'UI Language'}</Title>
          <Desc>{t.settings?.language_desc || 'Change the display language'}</Desc>
        </Info>
        <Select
          value={language}
          onChange={(e) => setLanguage(e.target.value as any)}
        >
          {availableLanguages.map(l => (
            <option key={l.code} value={l.code}>
              {l.nativeName} ({l.name})
            </option>
          ))}
        </Select>
      </SettingsItem>

      <SettingsItem>
        <Info>
          <Title>{t.settings?.translate || 'Translate UI'}</Title>
          <Desc>{t.settings?.translate_desc || 'Help us translate the app into your language'}</Desc>
        </Info>
        <TranslateButton onClick={() => setShowManager(true)}>
          <FiEdit3 /> {t.settings?.translate || 'Translate'}
        </TranslateButton>
      </SettingsItem>

      {showManager && (
        <ModalOverlay onClick={() => setShowManager(false)}>
          <ModalContent onClick={e => e.stopPropagation()}>
            <ModalHeader>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white'
                }}>
                  <FiGlobe size={20} />
                </div>
                <h2 style={{ margin: 0, fontSize: '1.25rem' }}>UI Localization</h2>
              </div>
              <CloseButton onClick={() => setShowManager(false)}>
                <FiX size={20} />
              </CloseButton>
            </ModalHeader>
            <ManagerWrapper>
              <TranslationManager />
            </ManagerWrapper>
          </ModalContent>
        </ModalOverlay>
      )}
    </>
  );
};
