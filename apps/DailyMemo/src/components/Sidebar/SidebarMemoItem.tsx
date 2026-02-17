import React from 'react';
import type { Memo } from '../../db';
import { MemoItemLink, MemoTitle, MemoDate, ThreadToggleBtn, PinToggleButton, ItemFooter, ItemActions } from './itemStyles';
import { FiCornerDownRight, FiPenTool } from 'react-icons/fi';
import { BsKeyboard, BsPinAngle } from 'react-icons/bs';
import { RiTable2 } from 'react-icons/ri';
import { FaYoutube } from 'react-icons/fa';
import styled from 'styled-components';

const TypeIcon = styled.div<{ $color: string }>`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: ${({ theme }) => theme.radius.small};
    background-color: ${props => props.$color};
    color: white;
    flex-shrink: 0;
    margin-right: 12px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    transition: ${({ theme }) => theme.effects.transition};
    
    svg {
        width: 13px;
        height: 13px;
    }
`;

const TitleRow = styled.div`
    display: flex;
    align-items: center;
    min-width: 0;
    flex: 1;
`;

interface Props {
    memo: Memo;
    isActive: boolean;
    onClick?: (skipHistory?: boolean) => void;
    formatDate: (date: Date) => string;
    inThread?: boolean;
    untitledText: string;
    isThreadHead?: boolean;
    childCount?: number;
    collapsed?: boolean;
    onToggle?: (id: string) => void;
    threadId?: string;
    collapseText?: string;
    moreText?: string;
    isCombineTarget?: boolean;
    isMovingMode?: boolean;
    onTogglePin?: (id: number, e: React.MouseEvent) => void;
}


export const SidebarMemoItem: React.FC<Props> = ({
    memo,
    isActive,
    onClick,
    formatDate,
    inThread,
    untitledText,
    isThreadHead,
    childCount,
    collapsed,
    onToggle,
    threadId,
    collapseText,
    moreText,
    isCombineTarget,
    isMovingMode,
    onTogglePin
}) => {

    const isDrawing = memo.content.includes('```fabric');
    const isSpreadsheet = memo.content.includes('```spreadsheet');
    const isYoutube = /youtube\.com|youtu\.be/.test(memo.content);

    return (
        <div
            data-memo-id={memo.id}
            style={{
                marginBottom: '2px',
                transition: 'background-color 0.1s ease-out, border-color 0.1s ease-out',
                borderRadius: '8px',
                border: isCombineTarget ? `2px solid #0072B2` : '2px solid transparent',
                backgroundColor: isCombineTarget ? 'rgba(0, 114, 178, 0.05)' : 'transparent',
            }}
        >
            <MemoItemLink
                to={isMovingMode ? '#' : `/memo/${memo.id}`}
                $isActive={isActive}
                $inThread={inThread}
                onClick={(e: React.MouseEvent) => {
                    if (isMovingMode) {
                        e.preventDefault();
                    }
                    onClick?.(true);
                }}
            >
                <TitleRow>
                    {isSpreadsheet ? (
                        <TypeIcon $color="#009E73" title="Sheet">
                            <RiTable2 />
                        </TypeIcon>
                    ) : isDrawing ? (
                        <TypeIcon $color="#D55E00" title="Drawing">
                            <FiPenTool />
                        </TypeIcon>
                    ) : isYoutube ? (
                        <TypeIcon $color="#FF0000" title="YouTube">
                            <FaYoutube />
                        </TypeIcon>
                    ) : (
                        <TypeIcon $color="#0072B2" title="Text">
                            <BsKeyboard />
                        </TypeIcon>
                    )}
                    <MemoTitle title={memo.title || untitledText} $isUntitled={!memo.title}>
                        {memo.title || untitledText}
                    </MemoTitle>
                </TitleRow>
                <ItemFooter>
                    <MemoDate>
                        {formatDate(memo.createdAt)}
                    </MemoDate>
                    <ItemActions>
                        {onTogglePin && memo.id && (
                            <PinToggleButton
                                $pinned={!!memo.pinnedAt}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onTogglePin(memo.id!, e);
                                }}
                                title={memo.pinnedAt ? 'Unpin' : 'Pin to top'}
                            >
                                <BsPinAngle size={12} style={{ transform: memo.pinnedAt ? 'none' : 'rotate(45deg)' }} />
                            </PinToggleButton>
                        )}
                    </ItemActions>
                </ItemFooter>
            </MemoItemLink>

            {isThreadHead && childCount && childCount > 0 && onToggle && threadId && (
                <div style={{ paddingLeft: '0.5rem' }}>
                    <ThreadToggleBtn onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onToggle(threadId);
                    }}>
                        <FiCornerDownRight />
                        {collapsed ?
                            (moreText || 'More').replace('{count}', String(childCount)) :
                            (collapseText || 'Collapse')}
                    </ThreadToggleBtn>
                </div>
            )}
        </div>
    );
};
