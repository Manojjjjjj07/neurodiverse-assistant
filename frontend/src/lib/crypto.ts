/**
 * Crypto Utilities - Client-side encryption using Web Crypto API
 * 
 * WHY CLIENT-SIDE ENCRYPTION:
 * - User maintains control of their emotional data
 * - Server is "zero-knowledge" - can store but never read
 * - Hardware-accelerated on modern devices
 * - AES-GCM provides both confidentiality and integrity
 */

/**
 * Generate a new encryption key for the user
 * This key should be derived from user password or stored securely
 */
export async function generateEncryptionKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
        {
            name: 'AES-GCM',
            length: 256,
        },
        true, // extractable (for export/backup)
        ['encrypt', 'decrypt']
    );
}

/**
 * Derive an encryption key from a password
 * Uses PBKDF2 for secure key derivation
 */
export async function deriveKeyFromPassword(
    password: string,
    salt: Uint8Array
): Promise<CryptoKey> {
    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        'PBKDF2',
        false,
        ['deriveKey']
    );

    // Derive AES-GCM key
    return await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt as BufferSource,
            iterations: 100000,
            hash: 'SHA-256',
        },
        keyMaterial,
        {
            name: 'AES-GCM',
            length: 256,
        },
        true,
        ['encrypt', 'decrypt']
    );
}

/**
 * Export a CryptoKey to base64 for storage
 */
export async function exportKey(key: CryptoKey): Promise<string> {
    const rawKey = await crypto.subtle.exportKey('raw', key);
    return arrayBufferToBase64(rawKey);
}

/**
 * Import a key from base64 string
 */
export async function importKey(base64Key: string): Promise<CryptoKey> {
    const rawKey = base64ToArrayBuffer(base64Key);
    return await crypto.subtle.importKey(
        'raw',
        rawKey,
        {
            name: 'AES-GCM',
            length: 256,
        },
        true,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypt data using AES-GCM
 * Returns base64-encoded ciphertext and IV
 */
export async function encryptData(
    data: string,
    key: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
    // Generate random IV (12 bytes for AES-GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encode data to bytes
    const encodedData = new TextEncoder().encode(data);

    // Encrypt
    const ciphertext = await crypto.subtle.encrypt(
        {
            name: 'AES-GCM',
            iv,
        },
        key,
        encodedData
    );

    return {
        ciphertext: arrayBufferToBase64(ciphertext),
        iv: arrayBufferToBase64(iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength)),
    };
}

/**
 * Decrypt data using AES-GCM
 */
export async function decryptData(
    ciphertext: string,
    iv: string,
    key: CryptoKey
): Promise<string> {
    const ciphertextBuffer = base64ToArrayBuffer(ciphertext);
    const ivBuffer = base64ToArrayBuffer(iv);

    const decrypted = await crypto.subtle.decrypt(
        {
            name: 'AES-GCM',
            iv: new Uint8Array(ivBuffer),
        },
        key,
        ciphertextBuffer
    );

    return new TextDecoder().decode(decrypted);
}

/**
 * Generate a random salt for password derivation
 */
export function generateSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(16));
}

// Utility functions for base64 conversion

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]!);
    }
    return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}
