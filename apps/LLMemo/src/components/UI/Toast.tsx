import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes } from 'styled-components';

const fadeInOut = keyframes`
  0% { opacity: 0; transform: translateY(20px) scale(0.95); }
  15% { opacity: 1; transform: translateY(0) scale(1.05); }
  20% { opacity: 1; transform: translateY(0) scale(1); }
  80% { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-20px) scale(0.95); }
`;

const pulse = keyframes`
  0% { transform: scale(1); box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2); }
  50% { transform: scale(1.02); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3); }
  100% { transform: scale(1); box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2); }
`;

const ToastWrapper = styled.div<{ $position?: 'bottom' | 'centered' | 'left-centered' }>`
  position: fixed;
  z-index: 999999;
  left: 16px;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: calc(100vw - 32px);
  
  /* Always centered vertically as requested for phone screen alignment */
  top: 50%;
  transform: translateY(-50%);
`;

const ToastContainer = styled.div<{ $variant?: 'default' | 'warning' | 'danger' }>`
  background: ${({ $variant }) =>
    $variant === 'warning' ? '#f59e0b' :
      $variant === 'danger' ? '#ef4444' :
        'rgba(0, 0, 0, 0.9)'};
  color: white;
  padding: 12px 18px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
  text-align: left;
  white-space: pre-wrap;
  line-height: 1.5;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  gap: 10px;
  width: max-content;
  max-width: 100%;
  
  animation: ${fadeInOut} 2.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards,
             ${({ $variant }) => $variant === 'warning' ? pulse : 'none'} 1.5s ease-in-out infinite;

  svg {
    flex-shrink: 0;
    font-size: 1.2rem;
  }
`;

interface ToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
  variant?: 'default' | 'warning' | 'danger';
  icon?: React.ReactNode;
  position?: 'bottom' | 'centered' | 'left-centered';
}

export const Toast: React.FC<ToastProps> = ({ message, onClose, duration = 2500, variant = 'default', icon, position = 'bottom' }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return createPortal(
    <ToastWrapper $position={position}>
      <ToastContainer $variant={variant}>
        {icon}
        <span>{message}</span>
      </ToastContainer>
    </ToastWrapper>,
    document.body
  );
};
