
function uint8ToB64(uint8: Uint8Array): string {
    const CHUNK_SIZE = 0x8000;
    let index = 0;
    const length = uint8.length;
    let result = '';
    while (index < length) {
        const slice = uint8.subarray(index, Math.min(index + CHUNK_SIZE, length));
        result += String.fromCharCode(...slice);
        index += CHUNK_SIZE;
    }
    return btoa(result);
}

function b64ToUint8(b64: string): Uint8Array {
    const binString = atob(b64);
    const size = binString.length;
    const uint8 = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
        uint8[i] = binString.charCodeAt(i);
    }
    return uint8;
}

export async function encryptData(data: string, password: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataUint8 = encoder.encode(data);

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const passwordKey = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );

    const key = await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        passwordKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        dataUint8
    );

    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);

    return uint8ToB64(combined);
}

export async function decryptData(encryptedBase64: string, password: string): Promise<string> {
    const encoder = new TextEncoder();
    const combined = b64ToUint8(encryptedBase64);

    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const data = combined.slice(28);

    const passwordKey = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );

    const key = await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        passwordKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
    );

    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        data
    );

    return new TextDecoder().decode(decrypted);
}
