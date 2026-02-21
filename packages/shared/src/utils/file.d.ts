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
export declare const saveFile: (content: string, suggestedName: string, contentType: string) => Promise<boolean>;
