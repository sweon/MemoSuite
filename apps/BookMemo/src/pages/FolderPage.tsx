import React from 'react';
import { FolderList } from '../components/FolderView/FolderList';
import { useFolder } from '../contexts/FolderContext';
import { useNavigate } from 'react-router-dom';

export const FolderPage: React.FC = () => {
    const { currentFolderId, setCurrentFolderId } = useFolder();
    const navigate = useNavigate();

    const handleSelectFolder = (folderId: number) => {
        setCurrentFolderId(folderId);
        navigate('/', { replace: true });
    };

    return (
        <FolderList
            currentFolderId={currentFolderId}
            onSelectFolder={handleSelectFolder}
        />
    );
};
