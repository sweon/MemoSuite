import React, { useState, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { createPortal } from 'react-dom';
import { FiChevronDown, FiCheck } from 'react-icons/fi';
import { isMobileDevice } from '../autoBackup/AutoBackupManager';

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideUp = keyframes`
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
`;

const slideDown = keyframes`
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
`;

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  z-index: 10000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  animation: ${fadeIn} 0.2s ease-out;
`;

const BottomSheet = styled.div`
  width: 100%;
  max-width: 500px;
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 20px 20px 0 0;
  padding: 20px;
  padding-bottom: max(24px, env(safe-area-inset-bottom));
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
  animation: ${slideUp} 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  max-height: 80vh;
  overflow-y: auto;
`;

const DropdownMenu = styled.div<{ $rect: DOMRect }>`
  position: absolute;
  top: ${({ $rect }) => $rect.bottom + 8}px;
  left: ${({ $rect }) => $rect.left}px;
  width: ${({ $rect }) => Math.max($rect.width, 200)}px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  padding: 8px;
  box-shadow: ${({ theme }) => theme.shadows.large};
  z-index: 10000;
  animation: ${slideDown} 0.15s ease-out;
`;

const SheetHeader = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;
`;

const Handle = styled.div`
  width: 40px;
  height: 4px;
  background: ${({ theme }) => theme.colors.border};
  border-radius: 2px;
  margin-bottom: 12px;
`;

const SheetTitle = styled.div`
  font-size: 1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
`;

const OptionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const OptionItem = styled.div<{ $active: boolean }>`
  padding: 14px 16px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: all 0.2s;
  background: ${({ $active, theme }) => $active ? `${theme.colors.primary}15` : 'transparent'};
  color: ${({ $active, theme }) => $active ? theme.colors.primary : theme.colors.text};
  font-weight: ${({ $active }) => $active ? '600' : '400'};

  &:active {
    background: ${({ theme }) => `${theme.colors.primary}25`};
    transform: scale(0.98);
  }

  @media (hover: hover) {
    &:hover {
      background: ${({ $active, theme }) => $active ? `${theme.colors.primary}20` : theme.colors.border};
    }
  }
`;

const SelectButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => `${theme.colors.primary}05`};
  }

  &:active {
    transform: scale(0.98);
  }

  svg {
    margin-left: 8px;
    color: ${({ theme }) => theme.colors.textSecondary};
  }
`;

export interface SortOption {
    value: string;
    label: string;
}

interface SortSelectProps {
    value: string;
    options: SortOption[];
    onChange: (value: string) => void;
    title?: string;
}

export const SortSelect: React.FC<SortSelectProps> = ({ value, options, onChange, title = 'Sort By' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [rect, setRect] = useState<DOMRect | null>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const mobile = isMobileDevice();

    const handleOpen = () => {
        if (buttonRef.current) {
            setRect(buttonRef.current.getBoundingClientRect());
        }
        setIsOpen(true);
    };

    const handleClose = () => setIsOpen(false);

    const handleSelect = (val: string) => {
        onChange(val);
        handleClose();
    };

    const selectedOption = options.find(o => o.value === value) || options[0];

    return (
        <>
            <SelectButton ref={buttonRef} onClick={handleOpen} type="button">
                <span>{selectedOption?.label}</span>
                <FiChevronDown size={16} />
            </SelectButton>

            {isOpen && createPortal(
                mobile ? (
                    <Overlay onClick={handleClose}>
                        <BottomSheet onClick={e => e.stopPropagation()}>
                            <SheetHeader>
                                <Handle />
                                <SheetTitle>{title}</SheetTitle>
                            </SheetHeader>
                            <OptionList>
                                {options.map(opt => (
                                    <OptionItem
                                        key={opt.value}
                                        $active={opt.value === value}
                                        onClick={() => handleSelect(opt.value)}
                                    >
                                        <span>{opt.label}</span>
                                        {opt.value === value && <FiCheck size={18} />}
                                    </OptionItem>
                                ))}
                            </OptionList>
                        </BottomSheet>
                    </Overlay>
                ) : (
                    <Overlay onClick={handleClose} style={{ background: 'transparent', backdropFilter: 'none' }}>
                        <DropdownMenu
                            $rect={rect!}
                            onClick={e => e.stopPropagation()}
                        >
                            {options.map(opt => (
                                <OptionItem
                                    key={opt.value}
                                    $active={opt.value === value}
                                    onClick={() => handleSelect(opt.value)}
                                    style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                                >
                                    <span>{opt.label}</span>
                                    {opt.value === value && <FiCheck size={16} />}
                                </OptionItem>
                            ))}
                        </DropdownMenu>
                    </Overlay>
                ),
                document.body
            )}
        </>
    );
};
