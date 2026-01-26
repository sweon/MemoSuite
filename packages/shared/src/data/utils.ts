import { saveFile } from '../utils/file';

export const downloadJSON = async (content: any, fileName: string) => {
    const jsonStr = JSON.stringify(content, null, 2);
    const suggestedName = fileName.endsWith('.json') ? fileName : `${fileName}.json`;
    await saveFile(jsonStr, suggestedName, 'application/json');
};

export const readJSONFile = (file: File): Promise<any> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const data = JSON.parse(text);
                resolve(data);
            } catch (err) {
                reject(new Error('Invalid JSON file'));
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
};
