import { useState, useRef } from 'react';
import { getInternalKey } from '../autoBackup/AutoBackupManager';
import { downloadJSON, readJSONFile } from './utils';
import { encryptData, decryptData } from '../utils/crypto';
import { useConfirm } from '../components/ModalProvider';
export const useDataBackup = (adapter, fileNamePrefix, t) => {
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportMode, setExportMode] = useState('all');
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [exportFileName, setExportFileName] = useState('');
    const [exportableItems, setExportableItems] = useState([]);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordModalMode, setPasswordModalMode] = useState('export');
    const [tempData, setTempData] = useState(null);
    const fileInputRef = useRef(null);
    const { confirm } = useConfirm();
    const handleExportClick = async () => {
        setExportMode('all');
        setSelectedIds(new Set());
        setExportFileName(`${fileNamePrefix}-backup-${new Date().toISOString().slice(0, 10)}`);
        if (adapter.getExportableItems) {
            const items = await adapter.getExportableItems();
            setExportableItems(items);
        }
        setShowExportModal(true);
    };
    const confirmExport = async () => {
        setShowExportModal(false);
        setPasswordModalMode('export');
        setShowPasswordModal(true);
    };
    const handlePasswordConfirm = async (password) => {
        setShowPasswordModal(false);
        try {
            if (passwordModalMode === 'export') {
                const ids = exportMode === 'selected' ? Array.from(selectedIds) : undefined;
                const data = await adapter.getBackupData(ids);
                let backupPayload = {
                    version: 1,
                    timestamp: new Date().toISOString(),
                    appName: fileNamePrefix,
                    data
                };
                if (password) {
                    const jsonStr = JSON.stringify(backupPayload);
                    const encryptedContent = await encryptData(jsonStr, password);
                    backupPayload = {
                        version: 1,
                        isEncrypted: true,
                        appName: fileNamePrefix,
                        encryptedContent
                    };
                }
                await downloadJSON(backupPayload, exportFileName || `${fileNamePrefix}-backup`);
            }
            else {
                // Import mode
                if (tempData) {
                    try {
                        const decryptedJSON = await decryptData(tempData.encryptedContent, password);
                        const data = JSON.parse(decryptedJSON);
                        const dataToMerge = data.data || data;
                        await adapter.mergeBackupData(dataToMerge);
                        await confirm({ message: t.settings?.import_success || 'Import successful!', cancelText: null });
                        window.location.reload();
                    }
                    catch (e) {
                        await confirm({ message: t.settings?.invalid_password || 'Invalid Password', cancelText: null });
                    }
                }
            }
        }
        catch (error) {
            console.error('Operation failed:', error);
            await confirm({ message: (t.settings?.export_failed || 'Operation failed: ') + error, cancelText: null });
        }
        setTempData(null);
    };
    const handleImportClick = () => {
        fileInputRef.current?.click();
    };
    const handleImportFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        if (await confirm({ message: t.settings?.import_confirm || 'Overwrite current data with backup?', isDestructive: true })) {
            try {
                const content = await readJSONFile(file);
                if (content.isEncrypted && content.encryptedContent) {
                    // Try internal key first (for auto-backup files)
                    const appNameForRestore = content.appName || fileNamePrefix;
                    try {
                        const internalKey = getInternalKey(appNameForRestore);
                        const decryptedJSON = await decryptData(content.encryptedContent, internalKey);
                        const data = JSON.parse(decryptedJSON);
                        const dataToMerge = data.data || data;
                        await adapter.mergeBackupData(dataToMerge);
                        await confirm({ message: t.settings?.import_success || 'Import successful!', cancelText: null });
                        window.location.reload();
                        return;
                    }
                    catch (e) {
                        // Not an auto-backup file or wrong key, proceed to password modal
                        setTempData(content);
                        setPasswordModalMode('import');
                        setShowPasswordModal(true);
                    }
                }
                else {
                    const dataToMerge = content.data || content;
                    await adapter.mergeBackupData(dataToMerge);
                    await confirm({ message: t.settings?.import_success || 'Import successful!', cancelText: null });
                    window.location.reload();
                }
            }
            catch (err) {
                console.error('Import failed:', err);
                await confirm({ message: (t.settings?.import_failed || 'Import failed: ') + err, cancelText: null });
            }
        }
        // Reset input
        e.target.value = '';
    };
    const handleFactoryReset = async () => {
        if (await confirm({ message: t.settings?.reset_confirm || 'Are you sure you want to delete all data?', isDestructive: true })) {
            try {
                await adapter.clearAllData();
                localStorage.clear(); // Clear settings too
                await confirm({ message: t.settings?.reset_success || 'Reset successful', cancelText: null });
                window.location.reload();
            }
            catch (e) {
                console.error("Reset failed:", e);
                await confirm({ message: "Reset failed: " + e, cancelText: null });
            }
        }
    };
    const toggleItemSelection = (id) => {
        const next = new Set(selectedIds);
        if (next.has(id))
            next.delete(id);
        else
            next.add(id);
        setSelectedIds(next);
    };
    return {
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
    };
};
