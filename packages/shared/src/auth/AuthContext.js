import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
const AuthContext = createContext(undefined);
// Simple hash function for PIN (in production, use a proper crypto library)
async function hashPin(pin) {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin + 'memosuite_salt');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
// Pattern to string
function patternToString(pattern) {
    return pattern.join('-');
}
// Detect mobile device
function detectMobile() {
    if (typeof navigator === 'undefined')
        return false;
    const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isTouchDevice = 'maxTouchPoints' in navigator && navigator.maxTouchPoints > 0;
    // Check if it's a mobile UA or a touch device with smaller screen OR strictly a tablet/mobile UA
    return isMobileUserAgent || (isTouchDevice && window.matchMedia('(max-width: 1600px)').matches);
}
export const AuthProvider = ({ children, storageKeyPrefix = 'default' }) => {
    const storageKey = `memosuite_lock_config_${storageKeyPrefix}`;
    const [config, setConfig] = useState({
        lockEnabled: false,
        lockMethod: 'none',
    });
    const [isLocked, setIsLocked] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
    const [isMobile] = useState(() => detectMobile());
    // Check biometric availability
    useEffect(() => {
        const checkBiometric = async () => {
            if (window.PublicKeyCredential) {
                try {
                    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
                    setIsBiometricAvailable(available);
                }
                catch {
                    setIsBiometricAvailable(false);
                }
            }
        };
        checkBiometric();
    }, []);
    // Load config on mount
    useEffect(() => {
        // Try new prefixed key first, then fall back to old generic key for backward compatibility if possible
        let savedConfig = localStorage.getItem(storageKey);
        // migration logic: if no prefixed config exists but old config exists, migrate it
        if (!savedConfig && storageKeyPrefix !== 'default') {
            const oldConfig = localStorage.getItem('memosuite_lock_config');
            if (oldConfig) {
                savedConfig = oldConfig;
                localStorage.setItem(storageKey, oldConfig);
            }
        }
        if (savedConfig) {
            try {
                const parsed = JSON.parse(savedConfig);
                setConfig(parsed);
                // If lock is enabled, start locked
                if (parsed.lockEnabled && parsed.lockMethod !== 'none') {
                    setIsLocked(true);
                }
            }
            catch (e) {
                console.error('Failed to parse lock config', e);
            }
        }
        setIsLoading(false);
    }, [storageKey, storageKeyPrefix]);
    const updateConfig = useCallback((newConfig) => {
        setConfig(prev => {
            const updated = { ...prev, ...newConfig };
            localStorage.setItem(storageKey, JSON.stringify(updated));
            return updated;
        });
    }, [storageKey]);
    const setPin = useCallback(async (pin) => {
        const pinHash = await hashPin(pin);
        updateConfig({
            lockMethod: 'pin',
            pinHash,
            lockEnabled: true
        });
    }, [updateConfig]);
    const setPattern = useCallback(async (pattern) => {
        updateConfig({
            lockMethod: 'pattern',
            pattern: patternToString(pattern),
            lockEnabled: true
        });
    }, [updateConfig]);
    const verifyPin = useCallback(async (pin) => {
        if (!config.pinHash)
            return false;
        const inputHash = await hashPin(pin);
        return inputHash === config.pinHash;
    }, [config.pinHash]);
    const verifyPattern = useCallback(async (pattern) => {
        if (!config.pattern)
            return false;
        return patternToString(pattern) === config.pattern;
    }, [config.pattern]);
    const verifyBiometric = useCallback(async () => {
        if (!isBiometricAvailable)
            return false;
        try {
            // Use WebAuthn for biometric verification
            // This creates a simple challenge that requires user verification (fingerprint/face)
            const challenge = new Uint8Array(32);
            crypto.getRandomValues(challenge);
            const credential = await navigator.credentials.create({
                publicKey: {
                    challenge,
                    rp: { name: 'MemoSuite', id: window.location.hostname || 'localhost' },
                    user: {
                        id: new Uint8Array(16),
                        name: 'local-user',
                        displayName: 'Local User'
                    },
                    pubKeyCredParams: [
                        { type: 'public-key', alg: -7 }, // ES256
                        { type: 'public-key', alg: -257 } // RS256
                    ],
                    authenticatorSelection: {
                        authenticatorAttachment: 'platform',
                        userVerification: 'required'
                    },
                    timeout: 60000
                }
            });
            return credential !== null;
        }
        catch (e) {
            console.error('Biometric verification failed:', e);
            return false;
        }
    }, [isBiometricAvailable]);
    const unlock = useCallback(() => {
        setIsLocked(false);
    }, []);
    const lock = useCallback(() => {
        if (config.lockEnabled && config.lockMethod !== 'none') {
            setIsLocked(true);
        }
    }, [config.lockEnabled, config.lockMethod]);
    return (_jsx(AuthContext.Provider, { value: {
            isLocked: config.lockEnabled ? isLocked : false,
            isLoading,
            config,
            updateConfig,
            setPin,
            setPattern,
            verifyPin,
            verifyPattern,
            verifyBiometric,
            unlock,
            lock,
            isBiometricAvailable,
            isMobile
        }, children: children }));
};
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
