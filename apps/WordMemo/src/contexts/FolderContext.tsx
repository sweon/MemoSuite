import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Folder } from '../db';

const MAX_FOLDER_DEPTH = 5;

interface BreadcrumbItem {
    id: number;
    name: string;
    isHome: boolean;
}

interface FolderContextType {
    currentFolderId: number | null;
    setCurrentFolderId: (id: number | null) => void;
    currentFolder: Folder | null;
    homeFolder: Folder | null;
    breadcrumbs: BreadcrumbItem[];
    subfolders: Folder[];
    showFolderList: boolean;
    setShowFolderList: (show: boolean) => void;
    navigateToHome: () => void;
    navigateToFolder: (folderId: number) => void;
    navigateUp: () => void;
    getFolderPath: (folderId: number) => Folder[];
    getSubfolders: (folderId: number) => Folder[];
    getAllDescendantFolderIds: (folderId: number) => number[];
    getFolderDepth: (folderId: number) => number;
    canCreateSubfolder: (parentId: number) => boolean;
    createFolder: (name: string, parentId: number) => Promise<number | undefined>;
    moveFolder: (folderId: number, newParentId: number) => Promise<boolean>;
    allFolders: Folder[];
}

const FolderContext = createContext<FolderContextType | undefined>(undefined);

interface FolderProviderProps {
    children: ReactNode;
}

export const FolderProvider: React.FC<FolderProviderProps> = ({ children }) => {
    const [currentFolderId, setCurrentFolderIdState] = useState<number | null>(() => {
        const saved = localStorage.getItem('wordmemo_current_folder_id');
        return saved ? parseInt(saved, 10) : null;
    });
    const [showFolderList, setShowFolderList] = useState(false);

    const folders = useLiveQuery(() => db.folders.toArray()) || [];

    const homeFolder = folders.find(f => f.isHome) || null;

    // Ensure we have a valid folder selected
    useEffect(() => {
        if (folders.length > 0) {
            if (currentFolderId === null || !folders.find(f => f.id === currentFolderId)) {
                const home = folders.find(f => f.isHome);
                if (home) {
                    setCurrentFolderIdState(home.id!);
                } else {
                    setCurrentFolderIdState(folders[0].id!);
                }
            }
        } else if (folders.length === 0) {
            // Auto-create home folder if none exist
            const createHome = async () => {
                const now = new Date();
                await db.folders.add({
                    name: '홈',
                    parentId: null,
                    isHome: true,
                    isReadOnly: true,
                    excludeFromGlobalSearch: false,
                    createdAt: now,
                    updatedAt: now
                });
            };
            createHome();
        }
    }, [folders, currentFolderId]);

    // Persist current folder selection
    useEffect(() => {
        if (currentFolderId !== null) {
            localStorage.setItem('wordmemo_current_folder_id', String(currentFolderId));
        }
    }, [currentFolderId]);

    const currentFolder = folders.find(f => f.id === currentFolderId) || null;

    // Get folder path from home to target folder
    const getFolderPath = useCallback((folderId: number): Folder[] => {
        const path: Folder[] = [];
        let current = folders.find(f => f.id === folderId);

        while (current) {
            path.unshift(current);
            if (current.isHome || !current.parentId) break;
            current = folders.find(f => f.id === current!.parentId);
        }

        return path;
    }, [folders]);

    // Get direct subfolders of a folder
    const getSubfolders = useCallback((folderId: number): Folder[] => {
        return folders
            .filter(f => f.parentId === folderId)
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [folders]);

    // Get all descendant folder IDs recursively
    const getAllDescendantFolderIds = useCallback((folderId: number): number[] => {
        const result: number[] = [];
        const stack = [folderId];

        while (stack.length > 0) {
            const currentId = stack.pop()!;
            const children = folders.filter(f => f.parentId === currentId);
            for (const child of children) {
                if (child.id) {
                    result.push(child.id);
                    stack.push(child.id);
                }
            }
        }

        return result;
    }, [folders]);

    // Get folder depth (home = 0)
    const getFolderDepth = useCallback((folderId: number): number => {
        let depth = 0;
        let current = folders.find(f => f.id === folderId);

        while (current && !current.isHome && current.parentId) {
            depth++;
            current = folders.find(f => f.id === current!.parentId);
        }

        return depth;
    }, [folders]);

    // Check if a subfolder can be created under the given parent
    const canCreateSubfolder = useCallback((parentId: number): boolean => {
        return getFolderDepth(parentId) < MAX_FOLDER_DEPTH;
    }, [getFolderDepth]);

    // Create a new folder
    const createFolder = useCallback(async (name: string, parentId: number): Promise<number | undefined> => {
        if (!canCreateSubfolder(parentId)) {
            console.error('Maximum folder depth reached');
            return undefined;
        }

        const now = new Date();
        const id = await db.folders.add({
            name,
            parentId,
            isHome: false,
            isReadOnly: false,
            excludeFromGlobalSearch: false,
            createdAt: now,
            updatedAt: now
        });

        return id as number;
    }, [canCreateSubfolder]);

    // Move a folder to a new parent
    const moveFolder = useCallback(async (folderId: number, newParentId: number): Promise<boolean> => {
        const folder = folders.find(f => f.id === folderId);
        if (!folder || folder.isHome) return false;

        // Check if moving would exceed max depth
        const folderMaxSubDepth = (id: number): number => {
            const children = folders.filter(f => f.parentId === id);
            if (children.length === 0) return 0;
            return 1 + Math.max(...children.map(c => folderMaxSubDepth(c.id!)));
        };

        const newParentDepth = getFolderDepth(newParentId);
        const subTreeDepth = folderMaxSubDepth(folderId);

        if (newParentDepth + 1 + subTreeDepth > MAX_FOLDER_DEPTH) {
            console.error('Moving would exceed maximum folder depth');
            return false;
        }

        // Check for circular reference
        const descendants = getAllDescendantFolderIds(folderId);
        if (descendants.includes(newParentId)) {
            console.error('Cannot move folder into its own descendant');
            return false;
        }

        await db.folders.update(folderId, {
            parentId: newParentId,
            updatedAt: new Date()
        });

        return true;
    }, [folders, getFolderDepth, getAllDescendantFolderIds]);

    // Breadcrumbs for current folder
    const breadcrumbs: BreadcrumbItem[] = currentFolderId
        ? getFolderPath(currentFolderId).map(f => ({
            id: f.id!,
            name: f.name,
            isHome: f.isHome || false
        }))
        : [];

    // Current folder's subfolders
    const subfolders = currentFolderId ? getSubfolders(currentFolderId) : [];

    const setCurrentFolderId = (id: number | null) => {
        setCurrentFolderIdState(id);
        setShowFolderList(false);
    };

    const navigateToHome = () => {
        if (homeFolder) {
            setCurrentFolderId(homeFolder.id!);
        }
    };

    const navigateToFolder = (folderId: number) => {
        setCurrentFolderId(folderId);
    };

    const navigateUp = () => {
        if (currentFolder && currentFolder.parentId && !currentFolder.isHome) {
            setCurrentFolderId(currentFolder.parentId);
        }
    };

    return (
        <FolderContext.Provider value={{
            currentFolderId,
            setCurrentFolderId,
            currentFolder,
            homeFolder,
            breadcrumbs,
            subfolders,
            showFolderList,
            setShowFolderList,
            navigateToHome,
            navigateToFolder,
            navigateUp,
            getFolderPath,
            getSubfolders,
            getAllDescendantFolderIds,
            getFolderDepth,
            canCreateSubfolder,
            createFolder,
            moveFolder,
            allFolders: folders
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
