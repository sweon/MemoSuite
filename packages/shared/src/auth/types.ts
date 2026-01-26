export type LockMethod = 'none' | 'pin' | 'biometric' | 'pattern';

export interface AuthConfig {
    lockEnabled: boolean;
    lockMethod: LockMethod;
    preferredMethod?: LockMethod; // User's preferred default method (e.g., 'biometric' or 'pattern')
    pinHash?: string; // SHA-256 hashed PIN
    pattern?: string; // Pattern as string of indices
}

export interface AuthContextType {
    isLocked: boolean;
    isLoading: boolean;
    config: AuthConfig;

    // Configuration
    updateConfig: (config: Partial<AuthConfig>) => void;
    setPin: (pin: string) => Promise<void>;
    setPattern: (pattern: number[]) => Promise<void>;

    // Authentication
    unlock: () => void;
    lock: () => void;
    verifyPin: (pin: string) => Promise<boolean>;
    verifyPattern: (pattern: number[]) => Promise<boolean>;
    verifyBiometric: () => Promise<boolean>;

    // Feature detection
    isBiometricAvailable: boolean;
    isMobile: boolean;
}
