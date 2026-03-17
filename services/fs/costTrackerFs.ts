/**
 * Filesystem CostTracker — JSON file instead of localStorage.
 * 
 * Tracks AI usage costs per model/event and persists to .bushido/.cost-ledger.json
 */

import { BeadFs } from './beadFs.js';
import type { ModelSpec } from '../ai/neural-engine.js';

export interface UsageEvent {
    timestamp: number;
    projectId: string;
    stage: string;
    modelId: string;
    tokensIn: number;
    tokensOut: number;
    cost: number;
}

const LEDGER_FILE = '.cost-ledger.json';
const MAX_EVENTS = 1000;

function readLedger(): UsageEvent[] {
    const data = BeadFs.read<UsageEvent[]>(LEDGER_FILE);
    return data || [];
}

function writeLedger(events: UsageEvent[]): void {
    BeadFs.write(LEDGER_FILE, events);
}

export const CostTrackerFs = {
    /**
     * Track a generation event and calculate estimated cost.
     */
    track: (
        projectId: string,
        stage: string,
        model: ModelSpec,
        tokensIn: number,
        tokensOut: number
    ): number => {
        const costIn = (model.costPer1M ? model.costPer1M.input : 0) * (tokensIn / 1_000_000);
        const costOut = (model.costPer1M ? model.costPer1M.output : 0) * (tokensOut / 1_000_000);
        const totalCost = costIn + costOut;

        const event: UsageEvent = {
            timestamp: Date.now(),
            projectId,
            stage,
            modelId: model.id,
            tokensIn,
            tokensOut,
            cost: totalCost
        };

        try {
            const events = readLedger();
            events.push(event);

            // Retention policy: Keep last MAX_EVENTS events
            if (events.length > MAX_EVENTS) {
                events.splice(0, events.length - MAX_EVENTS);
            }

            writeLedger(events);
        } catch (e) {
            console.error('[CostTrackerFs] Failed to persist cost metric', e);
        }

        return totalCost;
    },

    /**
     * Get total accrued cost for a specific project.
     */
    getProjectCost: (projectId: string): number => {
        try {
            const events = readLedger();
            return events
                .filter(e => e.projectId === projectId)
                .reduce((sum, e) => sum + e.cost, 0);
        } catch (e) {
            console.error('[CostTrackerFs] Failed to calculate project cost', e);
            return 0;
        }
    },

    /**
     * Get aggregated stats.
     */
    getStats: () => {
        const events = readLedger();
        return {
            totalEvents: events.length,
            totalCost: events.reduce((sum, e) => sum + e.cost, 0)
        };
    }
};
