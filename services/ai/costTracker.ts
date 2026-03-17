import { ModelSpec } from './neural-engine';

export interface UsageEvent {
    timestamp: number;
    projectId: string;
    stage: string;
    modelId: string;
    tokensIn: number;
    tokensOut: number;
    cost: number;
}

const STORAGE_KEY = 'bushido_cost_metrics';

export const CostTracker = {
    /**
     * Track a generation event and calculate estimated cost.
     */
    track: async (
        projectId: string,
        stage: string,
        model: ModelSpec,
        tokensIn: number,
        tokensOut: number
    ): Promise<number> => {
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
            // Persist to LocalStorage for MVP
            const currentDataStr = localStorage.getItem(STORAGE_KEY);
            const currentData: UsageEvent[] = currentDataStr ? JSON.parse(currentDataStr) : [];

            currentData.push(event);

            // Retention policy: Keep last 1000 events
            if (currentData.length > 1000) {
                currentData.splice(0, currentData.length - 1000);
            }

            localStorage.setItem(STORAGE_KEY, JSON.stringify(currentData));

            console.debug(`[NeuralEngine] Cost: $${totalCost.toFixed(6)} | Model: ${model.id} | Stage: ${stage}`);
        } catch (e) {
            console.error('[CostTracker] Failed to persist cost metric', e);
        }

        return totalCost;
    },

    /**
     * Get total accrued cost for a specific project.
     */
    getProjectCost: (projectId: string): number => {
        try {
            const currentDataStr = localStorage.getItem(STORAGE_KEY);
            if (!currentDataStr) return 0;

            const currentData: UsageEvent[] = JSON.parse(currentDataStr);
            return currentData
                .filter(e => e.projectId === projectId)
                .reduce((sum, e) => sum + e.cost, 0);
        } catch (e) {
            console.error('[CostTracker] Failed to calculate project cost', e);
            return 0;
        }
    },

    /**
     * Get aggregated stats for debugging/admin
     */
    getStats: () => {
        const currentDataStr = localStorage.getItem(STORAGE_KEY);
        const events: UsageEvent[] = currentDataStr ? JSON.parse(currentDataStr) : [];
        return {
            totalEvents: events.length,
            totalCost: events.reduce((sum, e) => sum + e.cost, 0)
        };
    }
};
