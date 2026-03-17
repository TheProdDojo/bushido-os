/**
 * Beads Architecture Types
 * Defines the schema for the "Context Bridge" between BushidoOS and External Agents (Cursor/Windsurf).
 */

import { z } from 'zod';
import { StageType } from '../types';

export const SpecZodSchema = z.object({
    id: z.string(),
    title: z.string(),
    version: z.string(),
    lastUpdated: z.string(),
    description: z.string().describe("High-level product description"),
    definitions: z.object({
        featureFlags: z.array(z.string()),
        userRoles: z.array(z.string()),
        entities: z.record(z.string(), z.object({
            name: z.string(),
            description: z.string(),
            fields: z.record(z.string(), z.string())
        }))
    }),
    features: z.array(z.object({
        id: z.string(),
        name: z.string(),
        userStory: z.string(),
        acceptanceCriteria: z.array(z.string()),
        priority: z.enum(['critical', 'high', 'medium', 'low'])
    })),
    constraints: z.object({
        techStack: z.array(z.string()),
        codingStandards: z.array(z.string()),
        excludedPatterns: z.array(z.string())
    }),
    apiEndpoints: z.array(z.object({
        method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
        path: z.string(),
        description: z.string(),
        auth: z.boolean().describe("Whether this endpoint requires authentication"),
    })).optional().describe("Key API endpoints for the product"),
    nonFunctionalRequirements: z.object({
        performance: z.array(z.string()).describe("Performance targets, e.g. 'Page load under 2s'"),
        security: z.array(z.string()).describe("Security requirements, e.g. 'OWASP Top 10 compliance'"),
        scalability: z.array(z.string()).describe("Scalability targets, e.g. 'Support 10k concurrent users'"),
    }).optional().describe("Non-functional requirements"),
    integrations: z.array(z.object({
        name: z.string(),
        type: z.enum(['api', 'database', 'auth', 'payment', 'analytics', 'other']),
        description: z.string(),
    })).optional().describe("External service integrations"),
});

export type SpecSchema = z.infer<typeof SpecZodSchema>;
export type FeatureSpec = SpecSchema['features'][number];
export type EntityDefinition = SpecSchema['definitions']['entities'][string];

export interface BeadsContext {
    projectId: string;
    strategySummary: string;
    activeStage: StageType;
    recentDecisions: string[];
}

export interface CursorRules {
    description: string;
    globs: string[];
    instructions: string[];
}

// --- PRD / Handshake Types ---

export const UserStoryZodSchema = z.object({
    id: z.string(),
    story: z.string(),
    acceptanceCriteria: z.array(z.string()),
    passes: z.boolean().default(false),
    priority: z.enum(['critical', 'high', 'medium', 'low'])
});

export const PrdZodSchema = z.object({
    id: z.string(),
    version: z.string(),
    lastUpdated: z.string(),
    nonNegotiables: z.array(z.string()).describe("Architectural and constraint non-negotiables"),
    stories: z.array(UserStoryZodSchema),
    rawSpec: SpecZodSchema // embed the full spec for context
});


export type UserStory = z.infer<typeof UserStoryZodSchema>;
export type PrdSchema = z.infer<typeof PrdZodSchema>;

// --- Alignment Audit Types ---

export const DiscrepancyZodSchema = z.object({
    severity: z.enum(['critical', 'warning']),
    title: z.string(),
    description: z.string(),
    violatedItem: z.string().describe("ID of the Non-Negotiable or User Story violated"),
    suggestedFix: z.string()
});

export const AlignmentReportZodSchema = z.object({
    timestamp: z.string(),
    score: z.number().min(0).max(100),
    aligned: z.boolean(),
    discrepancies: z.array(DiscrepancyZodSchema)
});

export type Discrepancy = z.infer<typeof DiscrepancyZodSchema>;
export type AlignmentReport = z.infer<typeof AlignmentReportZodSchema>;

// --- Context Distillation Types ---

export const StrategicUpdateZodSchema = z.object({
    timestamp: z.string(),
    sourceReportId: z.string(),
    keyLearnings: z.array(z.string()).describe("Key learnings from the alignment report"),
    suggestedSpecUpdates: z.array(z.string()).describe("Suggestions to update the original Spec"),
    complexityScore: z.number().min(0).max(10),
});

export type StrategicUpdate = z.infer<typeof StrategicUpdateZodSchema>;

// --- Strategy Pipeline Types ---

export interface ActionableRoastItem {
    persona: string;
    flaw: string;
    suggestion: string;
    targetPillar: StageType;
    actioned: boolean;
}

export interface StrategyPackage {
    idea: string;
    pillarSummaries: Record<string, string>;  // StageType → dense summary
    roastScore: number;
    roastInsights: ActionableRoastItem[];     // Only the actioned items
    spec: SpecSchema;
}
