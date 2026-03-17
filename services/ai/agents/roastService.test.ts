
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runRoast, RoastResult } from './roastService';
import { SpecSchema } from '../../../types/beads';
import { AIConfig } from '../types';

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

describe('RoastService', () => {
    const mockSpec: SpecSchema = {
        id: "test-id",
        title: "Uber for Dog Walking",
        version: "1.0.0",
        lastUpdated: new Date().toISOString(),
        description: "An on-demand platform connecting dog owners with vetted dog walkers.",
        definitions: {
            featureFlags: [],
            userRoles: ["owner", "walker"],
            entities: {}
        },
        features: [],
        constraints: {
            techStack: [],
            codingStandards: [],
            excludedPatterns: []
        }
    };

    const mockConfig: AIConfig = {
        provider: 'openai',
        apiKey: 'test-key',
        modelName: 'gpt-4o'
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should run roast with all personas and aggregate results', async () => {
        // Setup mock responses based on persona (system prompt)
        (generateObject as any).mockImplementation(({ system }) => {
            let verdict = 'approved';
            let score = 80;

            if (system.includes('Agentic CEO')) {
                score = 60;
                verdict = 'needs_work';
            } else if (system.includes('Senior Software Engineer')) {
                score = 90;
            }

            return Promise.resolve({
                object: {
                    verdict,
                    score,
                    criticalFlaws: ['Mock Flaw'],
                    suggestions: ['Mock Suggestion']
                },
                usage: { inputTokens: 10, outputTokens: 10 }
            });
        });

        const result = await runRoast(mockSpec, mockConfig);

        expect(result).toBeDefined();
        expect(result.feedbacks).toHaveLength(4); // CEO, DEV, DESIGN, MARKETING

        // Verify scores
        // CEO: 60, DEV: 90, DESIGN: 80 (default), MARKETING: 80 (default)
        // Average: (60+90+80+80)/4 = 310/4 = 77.5 -> 78
        expect(result.overallScore).toBe(78);

        // Verify summary
        expect(result.summary).toContain('3/4 personas approved');

        // Verify individual feedbacks
        const ceoFeedback = result.feedbacks.find(f => f.persona === 'Agentic CEO');
        expect(ceoFeedback).toBeDefined();
        expect(ceoFeedback?.verdict).toBe('needs_work');
    });

    it('should handle errors gracefully for a persona', async () => {
        (generateObject as any).mockImplementation(({ system }) => {
            if (system.includes('Agentic CEO')) {
                return Promise.reject(new Error('API Failure'));
            }
            return Promise.resolve({
                object: {
                    verdict: 'approved',
                    score: 80,
                    criticalFlaws: [],
                    suggestions: []
                },
                usage: {}
            });
        });

        const result = await runRoast(mockSpec, mockConfig);

        expect(result.feedbacks).toHaveLength(4);

        const ceoFeedback = result.feedbacks.find(f => f.persona === 'Agentic CEO');
        expect(ceoFeedback?.verdict).toBe('needs_work');
        expect(ceoFeedback?.criticalFlaws).toContain('Agent failed to respond');
        expect(ceoFeedback?.score).toBe(0);

        // Average with 0: (0+80+80+80)/4 = 240/4 = 60
        expect(result.overallScore).toBe(60);
    });
});
