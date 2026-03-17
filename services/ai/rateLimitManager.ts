import { AIProvider, ModelSpec } from './neural-engine';

interface RateLimitState {
    count: number;
    resetAt: number;
}

const STORAGE_KEY = 'bushido_rate_limits';

export const RateLimitManager = {
    /**
     * Check if a provider/model is within its rate limit.
     */
    canUse: (spec: ModelSpec): boolean => {
        if (!spec.rateLimit) return true; // No limit defined

        const state = RateLimitManager.getState(spec.provider);
        const now = Date.now();

        // Check if window has reset
        if (now > state.resetAt) {
            RateLimitManager.reset(spec.provider, spec.rateLimit.window);
            return true;
        }

        return state.count < spec.rateLimit.requests;
    },

    /**
     * Increment usage for a provider/model.
     */
    increment: (spec: ModelSpec) => {
        if (!spec.rateLimit) return;

        const state = RateLimitManager.getState(spec.provider);
        const now = Date.now();

        // Auto-reset if needed (though canUse should handle this, double safety)
        if (now > state.resetAt) {
            RateLimitManager.reset(spec.provider, spec.rateLimit.window);
        } else {
            state.count++;
            RateLimitManager.saveState(spec.provider, state);
        }
    },

    // --- Internal Helpers ---

    getState: (provider: string): RateLimitState => {
        try {
            const allStates = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            return allStates[provider] || { count: 0, resetAt: 0 };
        } catch {
            return { count: 0, resetAt: 0 };
        }
    },

    saveState: (provider: string, state: RateLimitState) => {
        try {
            const allStates = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            allStates[provider] = state;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(allStates));
        } catch (e) {
            console.error('[RateLimitManager] Failed to save state', e);
        }
    },

    reset: (provider: string, windowType: 'minute' | 'hour' | 'day') => {
        const now = Date.now();
        let resetAt = now;

        switch (windowType) {
            case 'minute': resetAt += 60 * 1000; break;
            case 'hour': resetAt += 60 * 60 * 1000; break;
            case 'day': resetAt += 24 * 60 * 60 * 1000; break;
        }

        const newState = { count: 0, resetAt };
        RateLimitManager.saveState(provider, newState);
        console.debug(`[RateLimitManager] Reset limits for ${provider}. Next reset: ${new Date(resetAt).toLocaleTimeString()}`);
    }
};
