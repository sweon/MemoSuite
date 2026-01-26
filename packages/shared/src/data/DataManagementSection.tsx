
import React from 'react';
import { FiDownload, FiUpload, FiAlertTriangle, FiTrash2 } from 'react-icons/fi';
import { PasswordModal } from '../components/PasswordModal';
import type { DataManagementProps } from './types';
import { useDataBackup } from './useDataBackup';
import {
    ActionButton,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    RadioLabel,
    Input,
    ScrollableList,
    CheckboxLabel
} from './styles';

export const DataManagementSection: React.FC<DataManagementProps> = ({ adapter, fileNamePrefix, t }) => {
    const {
        showExportModal,
        setShowExportModal,
        exportMode,
        setExportMode,
        selectedIds,
        toggleItemSelection,
        exportFileName,
        setExportFileName,
        exportableItems,
        handleExportClick,
        confirmExport,
        handleImportClick,
        handleImportFile,
        handleFactoryReset,
        fileInputRef,
        showPasswordModal,
        setShowPasswordModal,
        passwordModalMode,
        handlePasswordConfirm
    } = useDataBackup(adapter, fileNamePrefix, t);

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
            <ActionButton onClick={handleExportClick}><FiDownload /> {t.settings?.export_backup || 'Export / Backup'}</ActionButton>
            <ActionButton onClick={handleImportClick} $variant="success"><FiUpload /> {t.settings?.import_restore || 'Import / Restore'}</ActionButton>
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".json"
                onChange={handleImportFile}
            />

            <div style={{ margin: '1rem 0', borderBottom: '1px solid var(--border-color)' }}></div>

            <div style={{
                padding: '1rem',
                background: 'rgba(239, 68, 68, 0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(239, 68, 68, 0.2)'
            }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--danger-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FiAlertTriangle /> {t.settings?.factory_reset || 'Factory Reset'}
                </h4>
                <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', opacity: 0.8 }}>
                    {t.settings?.reset_confirm || 'This action cannot be undone.'}
                </p>
                <ActionButton onClick={handleFactoryReset} $variant="secondary" style={{ color: 'var(--danger-color)', borderColor: 'var(--danger-color)', width: '100%' }}>
                    <FiTrash2 /> {t.settings?.factory_reset || 'Factory Reset'}
                </ActionButton>
            </div>

            {showExportModal && (
                <ModalOverlay onClick={() => setShowExportModal(false)}>
                    <ModalContent onClick={e => e.stopPropagation()}>
                        <ModalHeader>{t.settings?.export_data || 'Export Data'}</ModalHeader>
                        <ModalBody>
                            <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 600 }}>{t.settings?.export_mode || 'Export Mode'}</label>
                            <RadioLabel>
                                <input type="radio" checked={exportMode === 'all'} onChange={() => setExportMode('all')} />
                                {t.settings?.all_data || 'All Data'}
                            </RadioLabel>
                            <RadioLabel>
                                <input type="radio" checked={exportMode === 'selected'} onChange={() => setExportMode('selected')} />
                                {t.settings?.select_logs || t.settings?.select_memos || t.settings?.select_words || 'Select Items'}
                            </RadioLabel>

                            <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{t.settings?.filename_optional || 'Filename (Optional)'}</label>
                                <Input
                                    value={exportFileName}
                                    onChange={e => setExportFileName(e.target.value)}
                                    placeholder={t.settings?.enter_filename || 'Enter filename'}
                                    style={{ width: '100%' }}
                                />
                            </div>

                            {exportMode === 'selected' && (
                                <ScrollableList>
                                    {exportableItems.length === 0 ? (
                                        <div style={{ padding: '0.5rem', opacity: 0.6 }}>{t.settings?.no_logs_found || t.settings?.no_memos_found || t.settings?.no_words_found || 'No items found'}</div>
                                    ) : (
                                        exportableItems.map(item => (
                                            <CheckboxLabel key={item.id}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(item.id)}
                                                    onChange={() => toggleItemSelection(item.id)}
                                                />
                                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {item.title || t.sidebar?.untitled || t.log_detail?.untitled || 'Untitled'}
                                                </span>
                                            </CheckboxLabel>
                                        ))
                                    )}
                                </ScrollableList>
                            )}
                        </ModalBody>
                        <ModalFooter>
                            <ActionButton onClick={() => setShowExportModal(false)} $variant="secondary">{t.settings?.cancel || 'Cancel'}</ActionButton>
                            <ActionButton onClick={confirmExport} disabled={exportMode === 'selected' && selectedIds.size === 0}>
                                <FiDownload /> {t.settings?.export || 'Export'}
                            </ActionButton>
                        </ModalFooter>
                    </ModalContent>
                </ModalOverlay>
            )}
            <PasswordModal
                isOpen={showPasswordModal}
                title={passwordModalMode === 'export' ? (t.settings?.backup_password_set || 'Set Backup Password') : (t.settings?.backup_password_enter || 'Enter Backup Password')}
                message={passwordModalMode === 'export'
                    ? (t.settings?.backup_password_set_msg || 'Enter a password to encrypt your backup file. Leave empty to save without encryption.')
                    : (t.settings?.backup_password_enter_msg || 'This backup file is encrypted. Please enter the password to restore.')}
                onConfirm={handlePasswordConfirm}
                onCancel={() => setShowPasswordModal(false)}
                allowEmpty={passwordModalMode === 'export'}
                confirmText={passwordModalMode === 'export' ? (t.settings?.export || 'Export') : 'OK'}
            />
        </div>
    );
};
