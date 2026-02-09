import React from 'react';
import { FolderList } from '../components/FolderView/FolderList';
import { useFolder } from '../contexts/FolderContext';

export const FolderPage: React.FC = () => {
    const { currentFolderId, setCurrentFolderId } = useFolder();

    const handleSelectFolder = (folderId: number) => {
        setCurrentFolderId(folderId);
    };

    return (
        <FolderList
            currentFolderId={currentFolderId}
            onSelectFolder={handleSelectFolder}
        />
    );
};
