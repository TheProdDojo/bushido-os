
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { distillLearnings } from './distillationService';
import { AlignmentReport } from '../../../types/beads';

// Mock dependencies
vi.mock('ai', () => ({
    generateObject: vi.fn()
}));
vi.mock('../modelRegistry', () => ({
    ModelRegistry: {
        create: vi.fn().mockReturnValue({}),
        hasKey: vi.fn().mockReturnValue(true)
    }
}));
vi.mock('../neuralRouter', () => ({
    NeuralRouter: {
        selectModel: vi.fn().mockReturnValue({ id: 'mock-model', provider: 'google' }),
        isAvailable: vi.fn().mockReturnValue(true)
    }
}));

import { generateObject } from 'ai';

describe('DistillationService', () => {
    const mockReport: AlignmentReport = {
        timestamp: new Date().toISOString(),
        score: 40,
        aligned: false,
        discrepancies: [
            {
                severity: 'critical',
                title: 'Missing Feature',
                description: 'User login not implemented',
                violatedItem: 'US-001',
                suggestedFix: 'Implement Auth0'
            }
        ]
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should generate strategic updates from alignment report', async () => {
        (generateObject as any).mockResolvedValue({
            object: {
                timestamp: new Date().toISOString(),
                sourceReportId: "report-123",
                keyLearnings: ["Team is struggling with Auth", "Spec was too vague on Auth provider"],
                suggestedSpecUpdates: ["Explicitly mandate Auth0 in constraints"],
                complexityScore: 8
            },
            usage: {}
        });

        const update = await distillLearnings(mockReport);

        expect(update).toBeDefined();
        expect(update.keyLearnings.length).toBeGreaterThan(0);
        expect(update.suggestedSpecUpdates[0]).toContain("Auth0");
        expect(update.complexityScore).toBe(8);
    });
});
