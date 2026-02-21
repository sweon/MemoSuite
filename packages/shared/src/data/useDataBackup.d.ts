import type { DataAdapter } from './types';
export declare const useDataBackup: (adapter: DataAdapter, fileNamePrefix: string, t: any) => {
    showExportModal: boolean;
    setShowExportModal: import("react").Dispatch<import("react").SetStateAction<boolean>>;
    exportMode: "selected" | "all";
    setExportMode: import("react").Dispatch<import("react").SetStateAction<"selected" | "all">>;
    selectedIds: Set<string | number>;
    toggleItemSelection: (id: string | number) => void;
    exportFileName: string;
    setExportFileName: import("react").Dispatch<import("react").SetStateAction<string>>;
    exportableItems: {
        id: string | number;
        title: string;
    }[];
    handleExportClick: () => Promise<void>;
    confirmExport: () => Promise<void>;
    handleImportClick: () => void;
    handleImportFile: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
    handleFactoryReset: () => Promise<void>;
    fileInputRef: import("react").RefObject<HTMLInputElement>;
    showPasswordModal: boolean;
    setShowPasswordModal: import("react").Dispatch<import("react").SetStateAction<boolean>>;
    passwordModalMode: "export" | "import";
    handlePasswordConfirm: (password: string) => Promise<void>;
};
