import React, { createContext, useContext, useState, type ReactNode } from 'react';

type StudyMode = 'none' | 'hide-meanings' | 'hide-words';

interface StudyModeContextType {
    studyMode: StudyMode;
    setStudyMode: (mode: StudyMode) => void;
}

const StudyModeContext = createContext<StudyModeContextType | undefined>(undefined);

export const StudyModeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [studyMode, setStudyMode] = useState<StudyMode>('none');

    return (
        <StudyModeContext.Provider value={{ studyMode, setStudyMode }}>
            {children}
        </StudyModeContext.Provider>
    );
};

export const useStudyMode = () => {
    const context = useContext(StudyModeContext);
    if (context === undefined) {
        throw new Error('useStudyMode must be used within a StudyModeProvider');
    }
    return context;
};
