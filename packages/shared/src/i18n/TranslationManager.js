import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { useLanguage } from './LanguageContext';
import { flattenObject } from './utils';
import { FiDownload, FiUpload, FiRefreshCw, FiSearch, FiX, FiCheck, FiEdit3 } from 'react-icons/fi';
const fadeIn = keyframes `
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;
const Container = styled.div `
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-bottom: 2rem; /* Give some space at the bottom */
  animation: ${fadeIn} 0.3s ease-out;
`;
const HeaderComp = styled.div `
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  background: ${({ theme }) => theme.colors.surface};
  padding: 0.75rem 1rem;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
`;
const TitleGroup = styled.div `
  display: flex;
  flex-direction: column;
`;
const Title = styled.h3 `
  margin: 0;
  color: ${({ theme }) => theme.colors.text};
  font-size: 1.1rem;
  font-weight: 700;
`;
const Subtitle = styled.span `
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  opacity: 0.7;
`;
const Controls = styled.div `
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
`;
const SearchWrapper = styled.div `
  position: relative;
  width: 100%;
`;
const SearchInput = styled.input `
  width: 100%;
  padding: 0.5rem 1rem 0.5rem 2.2rem;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.85rem;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;
const SearchIcon = styled(FiSearch) `
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: ${({ theme }) => theme.colors.textSecondary};
  opacity: 0.5;
`;
const Select = styled.select `
  padding: 0.5rem;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.85rem;
  cursor: pointer;
  outline: none;
`;
const Button = styled.button `
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  border: 1px solid ${({ theme, $variant }) => $variant === 'primary' ? theme.colors.primary :
    $variant === 'danger' ? '#ef4444' :
        theme.colors.border};
  background: ${({ theme, $variant }) => $variant === 'primary' ? theme.colors.primary :
    $variant === 'danger' ? '#ef444411' :
        theme.colors.surface};
  color: ${({ theme, $variant }) => $variant === 'primary' ? 'white' :
    $variant === 'danger' ? '#ef4444' :
        theme.colors.text};
  cursor: pointer;
  font-weight: 500;
  font-size: 0.85rem;
  white-space: nowrap;

  &:hover {
    background: ${({ theme, $variant }) => $variant === 'primary' ? theme.colors.primary :
    $variant === 'danger' ? '#ef444422' :
        theme.colors.background};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
const TableWrapper = styled.div `
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.background};
  overflow: hidden; /* Round corners handle content */
`;
const Table = styled.table `
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  table-layout: fixed;

  th, td {
    padding: 0.4rem 0.75rem;
    text-align: left;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
    word-break: break-all;
  }

  th {
    background: ${({ theme }) => theme.colors.surface};
    position: sticky;
    top: 0;
    z-index: 10;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.textSecondary};
    text-transform: uppercase;
    font-size: 0.75rem;
    padding: 0.5rem 0.75rem;
  }

  tr:hover {
    background: ${({ theme }) => theme.colors.surface};
  }
`;
const Input = styled.textarea `
  width: 100%;
  padding: 0.3rem 0.5rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  border-radius: 6px;
  font-family: inherit;
  font-size: 0.85rem;
  resize: none;
  overflow: hidden;
  min-height: 3rem;
  transition: border-color 0.2s;

  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
    outline: none;
    background: ${({ theme }) => theme.colors.background};
  }
`;
const EnglishValue = styled.div `
  font-weight: 600;
  margin-bottom: 0.15rem;
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.9rem;
`;
const KeyText = styled.div `
  font-family: 'SFMono-Regular', monospace;
  font-size: 0.7rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  opacity: 0.6;
  background: ${({ theme }) => theme.colors.surface};
  padding: 1px 4px;
  border-radius: 4px;
  display: inline-block;
`;
const StatusIndicator = styled.div `
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.7rem;
  color: ${({ $translated, theme }) => $translated ? '#10b981' : theme.colors.textSecondary};
  margin-top: 0.15rem;
`;
export const TranslationManager = () => {
    const { allTranslations, updateTranslation, updateTranslations, availableLanguages, importTranslations, resetTranslations, language, t } = useLanguage();
    const [targetLang, setTargetLang] = useState(language === 'en' ? 'ko' : language);
    const [search, setSearch] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const baseKeys = useMemo(() => {
        return flattenObject(allTranslations['en'] || {});
    }, [allTranslations]);
    const targetFlat = useMemo(() => {
        return flattenObject(allTranslations[targetLang] || {});
    }, [allTranslations, targetLang]);
    const filteredKeys = useMemo(() => {
        if (!search)
            return Object.entries(baseKeys);
        const q = search.toLowerCase();
        return Object.entries(baseKeys).filter(([key, val]) => key.toLowerCase().includes(q) || val.toLowerCase().includes(q));
    }, [baseKeys, search]);
    const handleExport = () => {
        const data = allTranslations[targetLang] || {};
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `${targetLang}_translation.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };
    const handleImport = (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result);
                importTranslations(targetLang, json);
            }
            catch (err) {
                console.error(err);
                alert('Failed to parse JSON');
            }
        };
        reader.readAsText(file);
    };
    const initializeWithEnglish = () => {
        setIsProcessing(true);
        const updates = {};
        let count = 0;
        Object.entries(baseKeys).forEach(([key, val]) => {
            if (!targetFlat[key]) {
                updates[key] = val;
                count++;
            }
        });
        if (count > 0) {
            updateTranslations(targetLang, updates);
            // Parent container handles scrolling
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        setTimeout(() => setIsProcessing(false), 800);
    };
    const targetLangName = availableLanguages.find(l => l.code === targetLang)?.nativeName || targetLang;
    return (_jsxs(Container, { children: [_jsxs(HeaderComp, { children: [_jsxs(TitleGroup, { children: [_jsx(Title, { children: t.i18n?.title || 'Translation Editor' }), _jsxs(Subtitle, { children: ["Editing: ", targetLangName] })] }), _jsxs(Controls, { children: [_jsx(Select, { value: targetLang, onChange: (e) => setTargetLang(e.target.value), children: availableLanguages.map(l => (_jsxs("option", { value: l.code, children: [l.nativeName, " (", l.name, ")"] }, l.code))) }), _jsxs(Button, { onClick: initializeWithEnglish, disabled: isProcessing, children: [_jsx(FiEdit3, {}), " ", isProcessing ? '...' : 'Edit'] }), _jsxs(Button, { onClick: handleExport, children: [_jsx(FiDownload, {}), " ", t.i18n?.export || 'Export'] }), _jsxs("label", { style: { display: 'inline-block' }, children: [_jsxs(Button, { as: "span", children: [_jsx(FiUpload, {}), " ", t.i18n?.import || 'Import'] }), _jsx("input", { type: "file", accept: ".json", onChange: handleImport, style: { display: 'none' } })] }), _jsx(Button, { onClick: () => {
                                    if (confirm(t.i18n?.reset_confirm || 'Reset translations?')) {
                                        resetTranslations(targetLang);
                                    }
                                }, "$variant": "danger", children: _jsx(FiRefreshCw, {}) })] })] }), _jsxs(SearchWrapper, { children: [_jsx(SearchIcon, {}), _jsx(SearchInput, { placeholder: t.i18n?.search_keys || "Search...", value: search, onChange: e => setSearch(e.target.value) }), search && (_jsx(FiX, { style: { position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', opacity: 0.5 }, onClick: () => setSearch('') }))] }), _jsx(TableWrapper, { children: _jsxs(Table, { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { style: { width: '40%' }, children: t.i18n?.key_english || 'English' }), _jsx("th", { children: t.i18n?.translation || 'Translation' })] }) }), _jsx("tbody", { children: filteredKeys.map(([key, baseValue]) => {
                                const val = targetFlat[key] || '';
                                const isTranslated = !!val && val !== baseValue;
                                return (_jsxs("tr", { children: [_jsxs("td", { children: [_jsx(EnglishValue, { children: baseValue }), _jsx(KeyText, { children: key })] }), _jsxs("td", { children: [_jsx(Input, { value: val, placeholder: baseValue, onChange: (e) => updateTranslation(targetLang, key, e.target.value), rows: 1, onInput: (e) => {
                                                        const target = e.target;
                                                        target.style.height = 'auto';
                                                        target.style.height = target.scrollHeight + 'px';
                                                    } }), _jsx(StatusIndicator, { "$translated": isTranslated, children: isTranslated ? (_jsxs(_Fragment, { children: [_jsx(FiCheck, { size: 12 }), " Translated"] })) : !!val ? (_jsx("span", { style: { opacity: 0.8 }, children: "Ready" })) : (_jsx("span", { style: { opacity: 0.5 }, children: "Empty" })) })] })] }, key));
                            }) })] }) })] }));
};
