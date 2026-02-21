export type LockMethod = 'none' | 'pin' | 'biometric' | 'pattern';
export interface AuthConfig {
    lockEnabled: boolean;
    lockMethod: LockMethod;
    preferredMethod?: LockMethod;
    pinHash?: string;
    pattern?: string;
}
export interface AuthContextType {
    isLocked: boolean;
    isLoading: boolean;
    config: AuthConfig;
    updateConfig: (config: Partial<AuthConfig>) => void;
    setPin: (pin: string) => Promise<void>;
    setPattern: (pattern: number[]) => Promise<void>;
    unlock: () => void;
    lock: () => void;
    verifyPin: (pin: string) => Promise<boolean>;
    verifyPattern: (pattern: number[]) => Promise<boolean>;
    verifyBiometric: () => Promise<boolean>;
    isBiometricAvailable: boolean;
    isMobile: boolean;
}
