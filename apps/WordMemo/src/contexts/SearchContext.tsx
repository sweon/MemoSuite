import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface SearchContextType {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const useSearch = () => {
    const context = useContext(SearchContext);
    if (!context) {
        throw new Error('useSearch must be used within a SearchProvider');
    }
    return context;
};

export const SearchProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [searchQuery, setSearchQuery] = useState('');

    return (
        <SearchContext.Provider value={{ searchQuery, setSearchQuery }}>
            {children}
        </SearchContext.Provider>
    );
};
