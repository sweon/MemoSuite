import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { useAuth } from './AuthContext';
const shake = keyframes `
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-10px); }
  75% { transform: translateX(10px); }
`;
const Overlay = styled.div `
  position: fixed;
  inset: 0;
  background: ${({ theme }) => theme?.colors?.background || '#1a1a2e'};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 2rem;
`;
const Title = styled.h2 `
  color: ${({ theme }) => theme?.colors?.text || '#fff'};
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
  font-weight: 600;
`;
const Subtitle = styled.p `
  color: ${({ theme }) => theme?.colors?.textSecondary || '#888'};
  font-size: 0.95rem;
  margin-bottom: 2rem;
`;
const PinDisplay = styled.div `
  display: flex;
  gap: 12px;
  margin-bottom: 2rem;
  animation: ${({ $error }) => $error ? shake : 'none'} 0.3s ease-in-out;
`;
const PinDot = styled.div `
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid ${({ theme }) => theme?.colors?.primary || '#6366f1'};
  background: ${({ $filled, theme }) => $filled ? (theme?.colors?.primary || '#6366f1') : 'transparent'};
  transition: all 0.15s ease;
`;
const Keypad = styled.div `
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  max-width: 280px;
`;
const KeyButton = styled.button `
  width: 72px;
  height: 72px;
  border-radius: 50%;
  border: 1px solid ${({ theme }) => theme?.colors?.border || '#333'};
  background: ${({ theme }) => theme?.colors?.surface || '#252542'};
  color: ${({ theme }) => theme?.colors?.text || '#fff'};
  font-size: 1.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background: ${({ theme }) => theme?.colors?.primary || '#6366f1'};
    border-color: ${({ theme }) => theme?.colors?.primary || '#6366f1'};
  }
  
  &:active {
    transform: scale(0.95);
  }
  
  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;
const ActionButton = styled.button `
  background: transparent;
  border: none;
  color: ${({ theme }) => theme?.colors?.primary || '#6366f1'};
  font-size: 1rem;
  cursor: pointer;
  padding: 8px 16px;
  border-radius: 8px;
  
  &:hover {
    background: ${({ theme }) => theme?.colors?.surface || 'rgba(255,255,255,0.1)'};
  }
  
  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;
const BiometricButton = styled.button `
  margin-top: 1.5rem;
  padding: 12px 24px;
  background: ${({ theme }) => theme?.colors?.surface || '#252542'};
  border: 1px solid ${({ theme }) => theme?.colors?.border || '#333'};
  border-radius: 12px;
  color: ${({ theme }) => theme?.colors?.text || '#fff'};
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  
  &:hover {
    border-color: ${({ theme }) => theme?.colors?.primary || '#6366f1'};
  }
`;
const ErrorText = styled.p `
  color: #ef4444;
  font-size: 0.9rem;
  margin-top: 1rem;
`;
export const LockScreen = ({ appName = 'MemoSuite' }) => {
    const { verifyPin, verifyBiometric, unlock, isBiometricAvailable, isMobile, config, setPin: savePin } = useAuth();
    // Determine lock method strictly based on platform
    const currentMethod = isMobile ? 'biometric' : 'pin';
    const isPinSet = !!config?.pinHash;
    const [pin, setPin] = useState('');
    const [error, setError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [biometricAttempted, setBiometricAttempted] = useState(false);
    // Auto-trigger biometric only if it's the current method (Mobile/System Lock)
    React.useEffect(() => {
        const attemptBiometric = async () => {
            if (currentMethod !== 'biometric' || biometricAttempted)
                return;
            if (isMobile && isBiometricAvailable) {
                setBiometricAttempted(true);
                try {
                    const isValid = await verifyBiometric();
                    if (isValid) {
                        unlock();
                    }
                }
                catch (e) {
                    console.log('Auto biometric failed or cancelled');
                }
            }
        };
        const timer = setTimeout(attemptBiometric, 300);
        return () => clearTimeout(timer);
    }, [currentMethod, biometricAttempted, isMobile, isBiometricAvailable, verifyBiometric, unlock]);
    const handleCheckPin = useCallback(async (currentPin) => {
        if (currentPin.length < 4)
            return;
        if (!isPinSet && currentMethod === 'pin') {
            try {
                await savePin(currentPin);
                unlock();
            }
            catch (e) {
                setError(true);
                setErrorMessage('Failed to save PIN');
                setPin('');
            }
            return;
        }
        const isValid = await verifyPin(currentPin);
        if (isValid) {
            unlock();
        }
        else {
            setError(true);
            setErrorMessage('Incorrect PIN');
            setTimeout(() => setPin(''), 300);
        }
    }, [verifyPin, unlock, isPinSet, currentMethod, savePin, setPin, setError, setErrorMessage]);
    const handlePinInput = useCallback(async (digit) => {
        if (pin.length >= 6)
            return;
        const newPin = pin + digit;
        setPin(newPin);
        setError(false);
        setErrorMessage('');
        // Auto-verify if 6 digits are reached
        if (newPin.length === 6) {
            handleCheckPin(newPin);
        }
    }, [pin, handleCheckPin, setPin, setError, setErrorMessage]);
    const handleBackspace = useCallback(() => {
        setPin(prev => prev.slice(0, -1));
        setError(false);
        setErrorMessage('');
    }, [setPin, setError, setErrorMessage]);
    // Keyboard support
    React.useEffect(() => {
        const handleKeyDown = (e) => {
            if (currentMethod !== 'pin')
                return;
            if (e.key >= '0' && e.key <= '9') {
                handlePinInput(e.key);
            }
            else if (e.key === 'Backspace') {
                handleBackspace();
            }
            else if (e.key === 'Enter') {
                if (pin.length >= 4) {
                    handleCheckPin(pin);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentMethod, handlePinInput, handleBackspace, handleCheckPin, pin]);
    const handleBiometricClick = useCallback(async () => {
        setErrorMessage('');
        const isValid = await verifyBiometric();
        if (isValid) {
            unlock();
        }
        else {
            setErrorMessage('Verification failed');
        }
    }, [verifyBiometric, unlock, setErrorMessage]);
    const renderPinLock = () => (_jsxs(_Fragment, { children: [_jsx(PinDisplay, { "$error": error, children: [0, 1, 2, 3, 4, 5].map(i => (_jsx(PinDot, { "$filled": i < pin.length }, i))) }), _jsxs(Keypad, { children: [[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (_jsx(KeyButton, { onClick: () => handlePinInput(num.toString()), children: num }, num))), _jsx(KeyButton, { onClick: () => handleCheckPin(pin), disabled: pin.length < 4, style: { fontSize: '1.2rem', background: (pin.length >= 4 ? 'var(--primary-color)' : undefined) }, children: "OK" }), _jsx(KeyButton, { onClick: () => handlePinInput('0'), children: "0" }), _jsx(ActionButton, { onClick: handleBackspace, disabled: pin.length === 0, children: "\u232B" })] })] }));
    const renderBiometricLock = () => (_jsx(_Fragment, { children: _jsx(BiometricButton, { onClick: handleBiometricClick, style: { marginTop: 0 }, children: "\uD83D\uDD10 \uBCF8\uC778 \uC778\uC99D" }) }));
    return (_jsxs(Overlay, { children: [_jsxs(Title, { children: ["\uD83D\uDD12 ", appName] }), _jsxs(Subtitle, { children: [currentMethod === 'pin' && (!isPinSet ? 'Set a new PIN code (4-6 digits)' : 'Enter your PIN code'), currentMethod === 'biometric' && 'Unlock using Fingerprint, Face ID, or Screen Pattern'] }), currentMethod === 'pin' && renderPinLock(), currentMethod === 'biometric' && renderBiometricLock(), errorMessage && _jsx(ErrorText, { children: errorMessage })] }));
};
