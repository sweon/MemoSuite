import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
const TooltipBox = styled.div `
  position: fixed;
  top: ${props => props.$top}px;
  left: ${props => props.$left}px;
  transform: translateX(-50%);
  padding: 4px 8px;
  background-color: rgba(33, 33, 33, 0.95);
  color: #fff;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  pointer-events: none;
  z-index: 99999;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  margin-top: -8px; 
  opacity: 1;
  visibility: visible;
  backdrop-filter: blur(4px);
  
  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    margin-left: -4px;
    border-width: 4px;
    border-style: solid;
    border-color: rgba(33, 33, 33, 0.95) transparent transparent transparent;
  }
`;
export const Tooltip = ({ content, children, hoverDelay = 300, touchDelay = 600 }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const timerRef = useRef(null);
    const childRef = useRef(null);
    const calculatePosition = () => {
        if (childRef.current) {
            const rect = childRef.current.getBoundingClientRect();
            setCoords({
                top: rect.top - 4,
                left: rect.left + (rect.width / 2)
            });
        }
    };
    const handleMouseEnter = () => {
        timerRef.current = window.setTimeout(() => {
            calculatePosition();
            setIsVisible(true);
        }, hoverDelay);
    };
    const handleMouseLeave = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        setIsVisible(false);
    };
    const handleTouchStart = () => {
        timerRef.current = window.setTimeout(() => {
            calculatePosition();
            setIsVisible(true);
        }, touchDelay);
    };
    const handleTouchEnd = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        setTimeout(() => setIsVisible(false), 2000);
    };
    useEffect(() => {
        return () => {
            if (timerRef.current)
                clearTimeout(timerRef.current);
        };
    }, []);
    if (!content)
        return _jsx(_Fragment, { children: children });
    return (_jsxs("div", { style: { display: 'contents' }, children: [_jsx("div", { ref: childRef, onMouseEnter: handleMouseEnter, onMouseLeave: handleMouseLeave, onTouchStart: handleTouchStart, onTouchEnd: handleTouchEnd, style: { display: 'inline-flex' }, children: children }), isVisible && createPortal(_jsx(TooltipBox, { "$top": coords.top, "$left": coords.left, children: content }), document.body)] }));
};
