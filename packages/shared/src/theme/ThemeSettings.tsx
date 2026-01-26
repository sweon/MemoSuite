import React from 'react';
import styled from 'styled-components';
import { FiCheck } from 'react-icons/fi';
import { useColorTheme } from './ThemeContext';

const SettingsSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const Subsection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const SubsectionTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: ${({ theme }) => theme.colors.text};
`;

const ThemeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.75rem;
`;

const ThemeCard = styled.button<{ $active: boolean; $isDark: boolean; $cardBg: string }>`
  position: relative;
  padding: 0.75rem;
  border-radius: 12px;
  border: ${({ theme, $active }) => $active ? `2px solid ${theme.colors.primary}` : '1px solid rgba(0,0,0,0.1)'};
  background: ${({ $cardBg }) => $cardBg};
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: ${({ $active, theme, $isDark }) =>
    $active
      ? `0 4px 12px ${theme.colors.primary}33`
      : $isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)'
  };
  overflow: hidden;
  text-align: left;

  &:hover {
    transform: translateY(-2px);
    border-color: ${({ theme, $active }) => $active ? theme.colors.primary : theme.colors.border};
  }
`;

const ColorPreview = styled.div`
  display: flex;
  gap: 2px;
  margin-bottom: 0.5rem;
  border-radius: 4px;
  overflow: hidden;
  height: 24px;
`;

const ColorBlock = styled.div<{ $bg: string }>`
  flex: 1;
  height: 100%;
  background: ${({ $bg }) => $bg};
`;

const ThemeName = styled.div<{ $isDark: boolean }>`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${({ $isDark }) => $isDark ? '#ffffff' : '#000000'};
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.5rem;

  svg {
    color: ${({ $isDark }) => $isDark ? '#ffffff' : '#000000'};
  }
`;

const CurrentBadge = styled.div`
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 0.65rem;
  padding: 2px 6px;
  border-radius: 4px;
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  font-weight: 600;
`;


interface ThemeSettingsProps {
  t: {
    light_modes: string;
    dark_modes: string;
    current_theme: string;
    names?: Record<string, string>;
  }
}

export const ThemeSettings: React.FC<ThemeSettingsProps> = ({ t }) => {
  const {
    currentThemeId,
    setThemeById,
    lightThemes,
    darkThemes,
  } = useColorTheme();

  return (
    <SettingsSection>

      <Subsection>
        <SubsectionTitle>☀️ {t.light_modes}</SubsectionTitle>
        <ThemeGrid>
          {lightThemes.map((theme) => (
            <ThemeCard
              key={theme.id}
              $active={currentThemeId === theme.id}
              $isDark={false}
              $cardBg={theme.colors.background}
              onClick={() => setThemeById(theme.id)}
            >
              <ColorPreview>
                <ColorBlock $bg={theme.colors.primary} />
                <ColorBlock $bg={theme.colors.success} />
                <ColorBlock $bg={theme.colors.danger} />
              </ColorPreview>
              <ThemeName $isDark={false}>
                <span>{t.names?.[theme.name] || theme.name}</span>
                {currentThemeId === theme.id && <FiCheck size={16} />}
              </ThemeName>
              {currentThemeId === theme.id && <CurrentBadge>{t.current_theme}</CurrentBadge>}
            </ThemeCard>
          ))}
        </ThemeGrid>
      </Subsection>

      <Subsection>
        <SubsectionTitle>🌙 {t.dark_modes}</SubsectionTitle>
        <ThemeGrid>
          {darkThemes.map((theme) => (
            <ThemeCard
              key={theme.id}
              $active={currentThemeId === theme.id}
              $isDark={true}
              $cardBg={theme.colors.background}
              onClick={() => setThemeById(theme.id)}
            >
              <ColorPreview>
                <ColorBlock $bg={theme.colors.primary} />
                <ColorBlock $bg={theme.colors.success} />
                <ColorBlock $bg={theme.colors.danger} />
              </ColorPreview>
              <ThemeName $isDark={true}>
                <span>{t.names?.[theme.name] || theme.name}</span>
                {currentThemeId === theme.id && <FiCheck size={16} />}
              </ThemeName>
              {currentThemeId === theme.id && <CurrentBadge>{t.current_theme}</CurrentBadge>}
            </ThemeCard>
          ))}
        </ThemeGrid>
      </Subsection>
    </SettingsSection>
  );
};
