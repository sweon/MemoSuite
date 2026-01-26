/**
 * File utility functions for MemoSuite
 */

/**
 * Downloads a string as a file using the modern File System Access API if available,
 * falling back to traditional <a> tag download.
 * 
 * @param content The string content to save
 * @param suggestedName The default filename suggested to the user
 * @param contentType The MIME type (e.g. 'application/json')
 */
export const saveFile = async (content: string, suggestedName: string, contentType: string) => {
    // 1. Try modern File System Access API first (supported in Chrome/Edge/Opera)
    // This allows the user to explicitly choose the filename and directory.
    if ('showSaveFilePicker' in window) {
        try {
            const handle = await (window as any).showSaveFilePicker({
                suggestedName,
                types: [{
                    description: 'JSON Files',
                    accept: { [contentType]: ['.json'] },
                }],
            });
            const writable = await handle.createWritable();
            await writable.write(content);
            await writable.close();
            return true;
        } catch (err: any) {
            // User cancelled or error occurred
            if (err.name === 'AbortError') return false;
            console.error('File System Access API failed', err);
            // Fall back to <a> tag below
        }
    }

    // 2. Traditional fallback for Safari, Firefox, and older browsers
    const a = document.createElement("a");
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = suggestedName;
    document.body.appendChild(a);
    a.click();

    // Clean up
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    }, 100);

    return true;
};
