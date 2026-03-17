/**
 * Usage Tracking Service
 * Tracks free tier usage with daily reset and device fingerprinting
 */

const STORAGE_KEY = 'bushido_usage';
const DEVICE_ID_KEY = 'bushido_device_id';

export const FREE_TIER_DAILY_LIMIT = 5;

interface UsageState {
    generationsUsed: number;
    lastResetDate: string; // ISO date string (YYYY-MM-DD)
    deviceId: string;
}

/**
 * Generate a simple UUID for device tracking
 */
const generateDeviceId = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

/**
 * Get today's date as ISO string (YYYY-MM-DD)
 */
const getTodayDate = (): string => {
    return new Date().toISOString().split('T')[0];
};

/**
 * Get or create device ID
 */
export const getDeviceId = (): string => {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
        deviceId = generateDeviceId();
        localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
};

/**
 * Get current usage state, resetting if new day
 */
export const getUsage = (): UsageState => {
    const today = getTodayDate();
    const deviceId = getDeviceId();

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            const usage: UsageState = JSON.parse(stored);

            // Reset if new day
            if (usage.lastResetDate !== today) {
                const reset: UsageState = {
                    generationsUsed: 0,
                    lastResetDate: today,
                    deviceId,
                };
                localStorage.setItem(STORAGE_KEY, JSON.stringify(reset));
                return reset;
            }

            return usage;
        } catch {
            // Corrupted data, reset
        }
    }

    // Initialize new usage state
    const initial: UsageState = {
        generationsUsed: 0,
        lastResetDate: today,
        deviceId,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
};

/**
 * Check if user can generate (under daily limit)
 */
export const canGenerate = (): boolean => {
    const usage = getUsage();
    return usage.generationsUsed < FREE_TIER_DAILY_LIMIT;
};

/**
 * Get remaining free generations for today
 */
export const getRemainingGenerations = (): number => {
    const usage = getUsage();
    return Math.max(0, FREE_TIER_DAILY_LIMIT - usage.generationsUsed);
};

/**
 * Increment usage counter (call after successful generation)
 */
export const incrementUsage = (): void => {
    const usage = getUsage();
    usage.generationsUsed += 1;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(usage));
};

/**
 * Check if user has their own API key configured
 */
// Hosted Model Transition: Always return true to bypass BYOK checks
export const hasOwnApiKey = (apiKey?: string): boolean => {
    return true; // Hosted model assumes "system key" is always available
};

/**
 * Get usage summary for UI display
 */
export const getUsageSummary = (): {
    used: number;
    limit: number;
    remaining: number;
    resetsAt: string;
} => {
    const usage = getUsage();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    return {
        used: usage.generationsUsed,
        limit: FREE_TIER_DAILY_LIMIT,
        remaining: getRemainingGenerations(),
        resetsAt: tomorrow.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
};
