
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generatePrd } from './productAgent';
import { SpecSchema } from '../../../types/beads';

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

describe('ProductAgent', () => {
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
        features: [
            {
                id: "F-001",
                name: "GPS Tracking",
                userStory: "As an owner, I want to see my dog's location in real-time.",
                acceptanceCriteria: ["Map updates every 5s"],
                priority: "critical"
            }
        ],
        constraints: {
            techStack: ["React", "Node", "Postgres"],
            codingStandards: [],
            excludedPatterns: []
        }
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should generate a PRD with non-negotiables and user stories', async () => {
        (generateObject as any).mockResolvedValue({
            object: {
                nonNegotiables: ["Must use Postgres", "Must use React"],
                stories: [
                    {
                        id: "US-001",
                        story: "As an owner, I want to see my dog on a map.",
                        acceptanceCriteria: ["Map renders", "Pin updates"],
                        passes: false,
                        priority: "critical"
                    }
                ]
            },
            usage: {}
        });

        const prd = await generatePrd(mockSpec);

        expect(prd).toBeDefined();
        expect(prd.rawSpec).toEqual(mockSpec);
        expect(prd.nonNegotiables).toContain("Must use Postgres");
        expect(prd.stories).toHaveLength(1);
        expect(prd.stories[0].passes).toBe(false);
        expect(prd.stories[0].priority).toBe("critical");
    });
});
