import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

interface FolderContextType {
    currentFolderId: number | null;
    setCurrentFolderId: (id: number | null) => void;
    currentFolder: { id: number; name: string; isReadOnly: boolean } | null;
    showFolderList: boolean;
    setShowFolderList: (show: boolean) => void;
}

const FolderContext = createContext<FolderContextType | undefined>(undefined);

interface FolderProviderProps {
    children: ReactNode;
}

export const FolderProvider: React.FC<FolderProviderProps> = ({ children }) => {
    const [currentFolderId, setCurrentFolderIdState] = useState<number | null>(() => {
        const saved = localStorage.getItem('bookmemo_current_folder_id');
        return saved ? parseInt(saved, 10) : null;
    });
    const [showFolderList, setShowFolderList] = useState(false);

    const folders = useLiveQuery(() => db.folders.toArray());

    // Ensure we have a valid folder selected
    useEffect(() => {
        if (folders && folders.length > 0) {
            if (currentFolderId === null || !folders.find(f => f.id === currentFolderId)) {
                // Select the first folder as default
                setCurrentFolderIdState(folders[0].id!);
            }
        }
    }, [folders, currentFolderId]);

    // Persist current folder selection
    useEffect(() => {
        if (currentFolderId !== null) {
            localStorage.setItem('bookmemo_current_folder_id', String(currentFolderId));
        }
    }, [currentFolderId]);

    const currentFolder = folders?.find(f => f.id === currentFolderId) || null;

    const setCurrentFolderId = (id: number | null) => {
        setCurrentFolderIdState(id);
        setShowFolderList(false); // Close folder list when selecting a folder
    };

    return (
        <FolderContext.Provider value={{
            currentFolderId,
            setCurrentFolderId,
            currentFolder: currentFolder ? {
                id: currentFolder.id!,
                name: currentFolder.name,
                isReadOnly: currentFolder.isReadOnly
            } : null,
            showFolderList,
            setShowFolderList
        }}>
            {children}
        </FolderContext.Provider>
    );
};

export const useFolder = (): FolderContextType => {
    const context = useContext(FolderContext);
    if (!context) {
        throw new Error('useFolder must be used within a FolderProvider');
    }
    return context;
};
