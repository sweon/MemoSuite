import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
  backdrop-filter: blur(2px);
`;

const Dialog = styled.div`
  background: ${({ theme }) => theme.colors.surface || '#fff'};
  width: 320px;
  max-width: 85vw;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
`;

const Content = styled.div`
  padding: 24px 20px 20px;
  text-align: center;
`;

const Message = styled.div`
  color: ${({ theme }) => theme.colors.text || '#000'};
  font-size: 1rem;
  line-height: 1.4;
  margin-bottom: 1rem;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px;
  padding-right: 44px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border || '#ccc'};
  background: ${({ theme }) => theme.colors.background || '#f5f5f5'};
  color: ${({ theme }) => theme.colors.text || '#000'};
  font-size: 1rem;
  outline: none;
  box-sizing: border-box;
  
  &:focus {
    border-color: ${({ theme }) => theme.colors.primary || '#007aff'};
    box-shadow: 0 0 0 2px ${({ theme }) => (theme.colors.primary || '#007aff') + '33'};
  }
`;

const PasswordWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
`;

const VisibilityButton = styled.button`
  position: absolute;
  right: 8px;
  background: none;
  border: none;
  padding: 6px;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.textSecondary || '#666'};
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.6;
  transition: opacity 0.2s, background-color 0.2s;
  border-radius: 4px;

  &:hover {
    background: rgba(0, 0, 0, 0.05);
    opacity: 1;
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);



const ButtonGroup = styled.div`
  display: flex;
  border-top: 1px solid ${({ theme }) => theme.colors.border || '#ccc'};
`;

const Button = styled.button<{ $primary?: boolean }>`
  flex: 1;
  background: transparent;
  border: none;
  border-right: 1px solid ${({ theme }) => theme.colors.border || '#ccc'};
  padding: 14px;
  font-size: 1rem;
  font-weight: ${({ $primary }) => $primary ? '600' : '400'};
  color: ${({ theme, $primary }) =>
    $primary ? (theme.colors.primary || '#007aff') : (theme.colors.textSecondary || '#666')
  };
  cursor: pointer;
  
  &:last-child {
    border-right: none;
  }
  
  &:active {
    background: ${({ theme }) => theme?.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'};
  }
`;

interface PasswordModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  onConfirm: (password: string) => void;
  onCancel: () => void;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  allowEmpty?: boolean;
}

export const PasswordModal: React.FC<PasswordModalProps> = ({
  isOpen,
  title,
  message = 'Enter password',
  onConfirm,
  onCancel,
  placeholder = 'Password',
  confirmText = 'OK',
  cancelText = 'Cancel',
  allowEmpty = false
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (!allowEmpty && !password) return;
    onConfirm(password);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <Overlay onClick={onCancel}>
      <Dialog onClick={e => e.stopPropagation()}>
        <Content>
          {title && <h3 style={{ margin: '0 0 0.5rem 0' }}>{title}</h3>}
          <Message>{message}</Message>
          <PasswordWrapper>
            <Input
              ref={inputRef}
              type={showPassword ? "text" : "password"}
              placeholder={placeholder}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="off"
            />
            <VisibilityButton
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </VisibilityButton>
          </PasswordWrapper>

        </Content>
        <ButtonGroup>
          <Button onClick={onCancel}>{cancelText}</Button>
          <Button onClick={handleSubmit} $primary disabled={!allowEmpty && !password}>
            {confirmText}
          </Button>
        </ButtonGroup>
      </Dialog>
    </Overlay>
  );
};
