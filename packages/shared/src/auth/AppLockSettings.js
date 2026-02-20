import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import styled from 'styled-components';
import { useAuth } from './AuthContext';
const Container = styled.div `
  background: var(--surface-color);
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  margin-bottom: 2rem;
`;
const ToggleRow = styled.div `
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ $hasContent }) => $hasContent ? '1.5rem' : '0'};
`;
const Label = styled.div `
  span:first-child {
    display: block;
    font-weight: 600;
    font-size: 1.05rem;
    margin-bottom: 0.4rem;
    color: var(--text-color);
  }
  
  span:last-child {
    display: block;
    font-size: 0.9rem;
    color: var(--text-secondary);
    line-height: 1.4;
    opacity: 0.8;
  }
`;
const ToggleSwitch = styled.label `
  position: relative;
  display: inline-block;
  width: 50px;
  height: 30px;
  flex-shrink: 0;
  cursor: pointer;
`;
const ToggleSlider = styled.span `
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${({ $checked, theme }) => $checked
    ? theme.colors?.primary || '#34C759' // iOS Green priority
    : '#E9E9EA' // iOS inactive gray
};
  transition: background-color 0.3s ease;
  border-radius: 30px;
  border: 1px solid rgba(0,0,0,0.05);
  
  &::before {
    content: '';
    position: absolute;
    height: 26px;
    width: 26px;
    left: 2px;
    bottom: 2px;
    background-color: #ffffff;
    border-radius: 50%;
    transition: transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
    transform: ${({ $checked }) => $checked ? 'translateX(20px)' : 'translateX(0)'};
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
`;
const HiddenCheckbox = styled.input `
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
`;
const OptionsContainer = styled.div `
  border-top: 1px solid var(--border-color);
  padding-top: 1.5rem;
`;
const SectionTitle = styled.span `
  display: block;
  font-weight: 600;
  font-size: 0.95rem;
  margin-bottom: 1rem;
  color: var(--text-color);
`;
const SetupSection = styled.div `
  margin-top: 1rem;
`;
const PinInputRow = styled.div `
  display: flex;
  gap: 0.5rem;
`;
const Input = styled.input `
  flex: 1;
  padding: 0.75rem 1rem;
  padding-right: 44px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--background-color);
  color: var(--text-color);
  font-size: 1rem;
  
  &:focus {
    outline: none;
    border-color: var(--primary-color);
  }
`;
const PasswordWrapper = styled.div `
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
`;
const VisibilityButton = styled.button `
  position: absolute;
  right: 8px;
  background: none;
  border: none;
  padding: 6px;
  cursor: pointer;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.6;
  transition: opacity 0.2s, background-color 0.2s;
  border-radius: 4px;

  &:hover {
    background: rgba(0, 0, 0, 0.05);
    color: var(--text-color);
    opacity: 1;
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;
const EyeIcon = () => (_jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" }), _jsx("circle", { cx: "12", cy: "12", r: "3" })] }));
const EyeOffIcon = () => (_jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" }), _jsx("line", { x1: "1", y1: "1", x2: "23", y2: "23" })] }));
const Button = styled.button `
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  padding: 0.75rem 1.25rem;
  background: ${({ $variant }) => $variant === 'secondary' ? 'transparent' : 'var(--primary-color)'};
  color: ${({ $variant }) => $variant === 'secondary' ? 'inherit' : 'white'};
  border: ${({ $variant }) => $variant === 'secondary' ? '1px solid var(--border-color)' : 'none'};
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.95rem;
  transition: all 0.2s;
  
  &:hover {
    filter: brightness(1.1);
    transform: translateY(-1px);
  }
`;
const StatusText = styled.span `
  display: block;
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
`;
const InfoBox = styled.div `
  margin-top: 1rem;
  padding: 1rem;
  background: var(--background-color);
  border-radius: 8px;
  font-size: 0.9rem;
  color: var(--text-secondary);
`;
export const AppLockSettings = ({ t }) => {
    const { config, updateConfig, setPin, isBiometricAvailable, isMobile } = useAuth();
    const [showPin, setShowPin] = React.useState(false);
    const handleToggle = (checked) => {
        if (checked && config.lockMethod === 'none') {
            if (isMobile) {
                updateConfig({ lockEnabled: true, lockMethod: 'biometric', preferredMethod: 'biometric' });
            }
            else {
                updateConfig({ lockEnabled: true, lockMethod: 'pin' });
            }
        }
        else {
            updateConfig({ lockEnabled: checked });
        }
    };
    const handleSavePin = async () => {
        const input = document.getElementById('pin-input');
        if (input && input.value.length >= 4) {
            await setPin(input.value);
            input.value = '';
            alert(t?.settings?.pin_set_success || 'PIN set successfully!');
        }
        else {
            alert(t?.settings?.pin_min_digits || 'PIN must be at least 4 digits');
        }
    };
    return (_jsxs(Container, { title: t?.settings?.app_lock, children: [_jsxs(ToggleRow, { "$hasContent": config.lockEnabled, children: [_jsxs(Label, { children: [_jsx("span", { children: t?.settings?.enable_app_lock || 'Enable App Lock' }), _jsx("span", { children: t?.settings?.enable_app_lock_desc || 'Protect your data with PIN, pattern, or biometric' })] }), _jsxs(ToggleSwitch, { children: [_jsx(HiddenCheckbox, { type: "checkbox", checked: config.lockEnabled, onChange: (e) => handleToggle(e.target.checked) }), _jsx(ToggleSlider, { "$checked": config.lockEnabled })] })] }), config.lockEnabled && (_jsx(OptionsContainer, { children: isMobile ? (
                /* MOBILE: System Lock Only */
                _jsxs("div", { style: { marginBottom: '1.5rem' }, children: [_jsx(SectionTitle, { children: t?.settings?.lock_method || 'Authentication Method' }), _jsxs(InfoBox, { style: { marginTop: 0 }, children: ["\uD83D\uDD10 ", _jsx("b", { children: t?.settings?.biometric || 'System Authentication' }), _jsx("br", {}), t?.settings?.biometric_desc || "Uses your phone's screen lock (FaceID, Fingerprint, Pattern, or PIN)."] }), !isBiometricAvailable && (_jsxs("div", { style: { marginTop: '0.8rem', color: 'var(--error-color, #ff4d4f)', fontSize: '0.9rem' }, children: ["\u26A0\uFE0F ", t?.settings?.biometric_not_available || "Your device doesn't support system authentication or it's not set up."] }))] })) : (
                /* DESKTOP: PIN Only */
                _jsxs("div", { style: { marginBottom: '1.5rem' }, children: [_jsx(SectionTitle, { children: t?.settings?.lock_method || 'Authentication Method' }), _jsxs(InfoBox, { style: { marginTop: 0, marginBottom: '1.5rem' }, children: ["\uD83D\uDD22 ", _jsx("b", { children: t?.settings?.pin_code || 'PIN Code' }), _jsx("br", {}), t?.settings?.pin_code_desc || 'Enter a 4-6 digit number to unlock the app.'] }), _jsxs(SetupSection, { style: { marginTop: 0 }, children: [_jsx(SectionTitle, { children: config.pinHash ? (t?.settings?.change_pin || 'Change PIN') : (t?.settings?.set_pin || 'Set PIN') }), _jsxs(PinInputRow, { children: [_jsxs(PasswordWrapper, { children: [_jsx(Input, { type: showPin ? "text" : "password", inputMode: "numeric", pattern: "[0-9]*", maxLength: 6, placeholder: t?.settings?.pin_placeholder || "Enter 4-6 digit PIN", id: "pin-input" }), _jsx(VisibilityButton, { type: "button", onClick: () => setShowPin(!showPin), title: showPin ? "Hide PIN" : "Show PIN", children: showPin ? _jsx(EyeOffIcon, {}) : _jsx(EyeIcon, {}) })] }), _jsx(Button, { onClick: handleSavePin, children: t?.settings?.save || 'Save' })] }), config.pinHash ? (_jsxs(StatusText, { style: { color: 'var(--success-color, #34C759)' }, children: ["\u2713 ", t?.settings?.pin_is_set || 'PIN is set'] })) : (_jsxs(StatusText, { style: { color: 'var(--warning-color, #faad14)' }, children: ["\u26A0\uFE0F ", t?.settings?.pin_not_set || 'PIN is not set yet'] }))] })] })) }))] }));
};
