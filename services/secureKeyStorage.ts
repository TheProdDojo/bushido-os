/**
 * Secure Key Storage Service
 * Uses Web Crypto API for client-side encryption of API keys
 */

const ENCRYPTION_KEY_NAME = 'bushido_encryption_key';
const ENCRYPTED_KEYS_STORAGE = 'bushido_encrypted_keys';

interface EncryptedData {
    iv: string; // Base64 encoded IV
    data: string; // Base64 encoded encrypted data
}

interface StoredKeys {
    llmApiKey?: EncryptedData;
    tavilyApiKey?: EncryptedData;
}

/**
 * Get or create the encryption key
 */
const getEncryptionKey = async (): Promise<CryptoKey> => {
    const storedKey = localStorage.getItem(ENCRYPTION_KEY_NAME);

    if (storedKey) {
        try {
            const keyData = JSON.parse(storedKey);
            return await crypto.subtle.importKey(
                'jwk',
                keyData,
                { name: 'AES-GCM', length: 256 },
                true,
                ['encrypt', 'decrypt']
            );
        } catch {
            // Key corrupted, generate new one
        }
    }

    // Generate new encryption key
    const key = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );

    // Export and store the key
    const exportedKey = await crypto.subtle.exportKey('jwk', key);
    localStorage.setItem(ENCRYPTION_KEY_NAME, JSON.stringify(exportedKey));

    return key;
};

/**
 * Encrypt a string value
 */
const encryptValue = async (value: string): Promise<EncryptedData> => {
    const key = await getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();

    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoder.encode(value)
    );

    return {
        iv: btoa(String.fromCharCode(...iv)),
        data: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    };
};

/**
 * Decrypt an encrypted value
 */
const decryptValue = async (encrypted: EncryptedData): Promise<string> => {
    const key = await getEncryptionKey();

    const iv = new Uint8Array(
        atob(encrypted.iv).split('').map(c => c.charCodeAt(0))
    );
    const data = new Uint8Array(
        atob(encrypted.data).split('').map(c => c.charCodeAt(0))
    );

    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        data
    );

    return new TextDecoder().decode(decrypted);
};

/**
 * Get stored encrypted keys
 */
const getStoredKeys = (): StoredKeys => {
    const stored = localStorage.getItem(ENCRYPTED_KEYS_STORAGE);
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch {
            return {};
        }
    }
    return {};
};

/**
 * Save encrypted keys
 */
const saveStoredKeys = (keys: StoredKeys): void => {
    localStorage.setItem(ENCRYPTED_KEYS_STORAGE, JSON.stringify(keys));
};

/**
 * Store an API key securely
 */
export const storeApiKey = async (
    keyType: 'llmApiKey' | 'tavilyApiKey',
    value: string
): Promise<void> => {
    if (!value) {
        // Remove key if empty
        const keys = getStoredKeys();
        delete keys[keyType];
        saveStoredKeys(keys);
        return;
    }

    const encrypted = await encryptValue(value);
    const keys = getStoredKeys();
    keys[keyType] = encrypted;
    saveStoredKeys(keys);
};

/**
 * Retrieve a stored API key
 */
export const getApiKey = async (
    keyType: 'llmApiKey' | 'tavilyApiKey'
): Promise<string | null> => {
    const keys = getStoredKeys();
    const encrypted = keys[keyType];

    if (!encrypted) {
        return null;
    }

    try {
        return await decryptValue(encrypted);
    } catch {
        // Decryption failed, key may be corrupted
        return null;
    }
};

/**
 * Check if an API key is stored (without decrypting)
 */
export const hasStoredKey = (keyType: 'llmApiKey' | 'tavilyApiKey'): boolean => {
    const keys = getStoredKeys();
    return !!keys[keyType];
};

/**
 * Clear all stored keys
 */
export const clearAllKeys = (): void => {
    localStorage.removeItem(ENCRYPTED_KEYS_STORAGE);
};

/**
 * Migrate plain-text keys to encrypted storage
 * Call this once on app init to upgrade existing users
 */
export const migrateUnencryptedKeys = async (): Promise<void> => {
    // Check for old plain-text storage
    const oldConfig = localStorage.getItem('bushido_ai_config');
    if (oldConfig) {
        try {
            const config = JSON.parse(oldConfig);
            if (config.apiKey && typeof config.apiKey === 'string') {
                await storeApiKey('llmApiKey', config.apiKey);
                // Remove plain-text key from old config
                delete config.apiKey;
                localStorage.setItem('bushido_ai_config', JSON.stringify(config));
            }
            if (config.tavilyApiKey && typeof config.tavilyApiKey === 'string') {
                await storeApiKey('tavilyApiKey', config.tavilyApiKey);
                delete config.tavilyApiKey;
                localStorage.setItem('bushido_ai_config', JSON.stringify(config));
            }
        } catch {
            // Migration failed, leave as-is
        }
    }
};
