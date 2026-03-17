
import { useState, useEffect } from 'react';

export interface CreditBalance {
    strategyCredits: number; // For DeepSeek R1 (High intelligence, high cost)
    researchTokens: number;  // For Gemini Flash (High speed, low cost)
}

// Initial "Free Tier" grant
const INITIAL_CREDITS: CreditBalance = {
    strategyCredits: 5,
    researchTokens: 100
};

const STORAGE_KEY = 'bushido_credits';

/**
 * Get current credit balance from local storage
 */
export const getCredits = (): CreditBalance => {
    if (typeof window === 'undefined') return INITIAL_CREDITS;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
        // Initialize if not present
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_CREDITS));
        return INITIAL_CREDITS;
    }

    try {
        return JSON.parse(stored);
    } catch {
        return INITIAL_CREDITS;
    }
};

/**
 * React hook for managing credits
 */
export const useCredits = () => {
    const [credits, setCredits] = useState<CreditBalance>(getCredits());

    // Sync with local storage events (e.g. from other tabs or direct updates)
    useEffect(() => {
        const handleStorage = () => setCredits(getCredits());

        // Listen to native storage events
        window.addEventListener('storage', handleStorage);
        // Listen to custom event for same-window updates
        window.addEventListener('bushido-credit-update', handleStorage);

        return () => {
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener('bushido-credit-update', handleStorage);
        };
    }, []);

    /**
     * Deduct credits. Returns true if successful, false if insufficient funds.
     */
    const deduct = (cost: Partial<CreditBalance>): boolean => {
        const current = getCredits();
        const newBalance = {
            strategyCredits: current.strategyCredits - (cost.strategyCredits || 0),
            researchTokens: current.researchTokens - (cost.researchTokens || 0)
        };

        if (newBalance.strategyCredits < 0 || newBalance.researchTokens < 0) {
            return false; // Insufficient funds
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(newBalance));
        setCredits(newBalance);
        window.dispatchEvent(new Event('bushido-credit-update'));
        return true;
    };

    /**
     * Top up credits (Mock payment)
     */
    const topUp = (amount: Partial<CreditBalance> = { strategyCredits: 10, researchTokens: 200 }) => {
        const current = getCredits();
        const newBalance = {
            strategyCredits: current.strategyCredits + (amount.strategyCredits || 0),
            researchTokens: current.researchTokens + (amount.researchTokens || 0)
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(newBalance));
        setCredits(newBalance);
        window.dispatchEvent(new Event('bushido-credit-update'));
    };

    return { credits, deduct, topUp };
};
