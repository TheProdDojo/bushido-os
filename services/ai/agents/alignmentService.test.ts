
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runAlignmentAudit } from './alignmentService';
import { PrdSchema, SpecSchema } from '../../../types/beads';

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

describe('AlignmentService', () => {
    const mockSpec: SpecSchema = {
        id: "test-id",
        title: "Test App",
        version: "1.0.0",
        lastUpdated: new Date().toISOString(),
        description: "Test Description",
        definitions: { featureFlags: [], userRoles: [], entities: {} },
        features: [],
        constraints: { techStack: [], codingStandards: [], excludedPatterns: [] }
    };

    const mockPrd: PrdSchema = {
        id: "prd-001",
        version: "1.0.0",
        lastUpdated: new Date().toISOString(),
        nonNegotiables: ["Must use TypeScript", "No Any Types"],
        stories: [
            {
                id: "US-001",
                story: "User can login",
                acceptanceCriteria: ["Login button exists"],
                passes: false,
                priority: "critical"
            }
        ],
        rawSpec: mockSpec
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should detect alignment issues', async () => {
        (generateObject as any).mockResolvedValue({
            object: {
                timestamp: new Date().toISOString(),
                score: 40,
                aligned: false,
                discrepancies: [
                    {
                        severity: 'critical',
                        title: 'Technical Constraint Violation',
                        description: 'Found usage of JavaScript instead of TypeScript',
                        violatedItem: 'Must use TypeScript',
                        suggestedFix: 'Migrate file to .ts'
                    }
                ]
            },
            usage: {}
        });

        const report = await runAlignmentAudit(mockPrd, "const x = 1; // JS file context");

        expect(report).toBeDefined();
        expect(report.aligned).toBe(false);
        expect(report.score).toBe(40);
        expect(report.discrepancies).toHaveLength(1);
        expect(report.discrepancies[0].violatedItem).toBe('Must use TypeScript');
    });

    it('should report passing alignment', async () => {
        (generateObject as any).mockResolvedValue({
            object: {
                timestamp: new Date().toISOString(),
                score: 100,
                aligned: true,
                discrepancies: []
            },
            usage: {}
        });

        const report = await runAlignmentAudit(mockPrd, "import { x } from './y'; // Clean TS");

        expect(report.aligned).toBe(true);
        expect(report.discrepancies).toHaveLength(0);
    });
});
