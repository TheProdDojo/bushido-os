
import { generateObject } from 'ai';
import { z } from 'zod';
import { ModelRegistry } from '../modelRegistry';
import { AIConfig } from '../types';
import { SpecSchema } from '../../../types/beads';
import { Artifact, StageType, STAGE_CONFIG } from '../../../types';
import { NeuralRouter } from '../neuralRouter';

// --- Roast Personas ---

export interface RoastPersona {
    id: string;
    role: string;
    focus: string;
    systemPrompt: string;
}

export const ROAST_PERSONAS: Record<string, RoastPersona> = {
    CEO: {
        id: 'agentic-ceo',
        role: 'Agentic CEO',
        focus: 'Business Viability, CAC, ROI',
        systemPrompt: `You are an Agentic CEO. Your goal is to ensure the product makes money and is sustainable.
        Focus on:
        - Business Model viability.
        - Customer Acquisition Cost (CAC) vs Lifetime Value (LTV).
        - Market timing and fit.
        - "Who pays for this?"
        Be critical but constructive. If the idea is a money pit, say so.`
    },
    DEV: {
        id: 'dev-agent',
        role: 'Senior Engineer',
        focus: 'Feasibility, Tech Debt, Scale',
        systemPrompt: `You are a Senior Software Engineer. Your goal is to ensure the product is buildable and scalable.
        Focus on:
        - Technical feasibility with current tech (2026).
        - Hidden technical debt or complexity.
        - Security and privacy risks.
        - "Is this over-engineered?"
        Be pragmatic. If it's vaporware, call it out.`
    },
    DESIGN: {
        id: 'designer',
        role: 'Lead Designer',
        focus: 'UX, UI, Delight',
        systemPrompt: `You are a Lead Product Designer. Your goal is to ensure the product is usable and delightful.
        Focus on:
        - User Experience (UX) friction.
        - Visual appeal and "Cool Factor".
        - Accessibility and inclusivity.
        - "Would I actually use this?"
        Be demanding. If it's ugly or confusing, roast it.`
    },
    MARKETING: {
        id: 'marketing',
        role: 'Growth Hacker',
        focus: 'Go-to-Market, Virality, Positioning',
        systemPrompt: `You are a Growth Marketing Lead. Your goal is to ensure the product can be sold.
        Focus on:
        - Value proposition clarity.
        - Viral loops and network effects.
        - Competitive positioning.
        - "How do we get the first 1,000 users?"
        Be creative. If the story is boring, rewrite it.`
    }
};

// --- Result Interfaces ---

export interface RoastFeedback {
    persona: string;
    verdict: 'approved' | 'rejected' | 'needs_work';
    score: number; // 0-100
    criticalFlaws: string[];
    suggestions: string[];
}

export interface RoastResult {
    overallScore: number;
    feedbacks: RoastFeedback[];
    summary: string;
}

// --- Implementation ---

const runPersonaRoast = async (spec: SpecSchema, persona: RoastPersona): Promise<RoastFeedback> => {
    const modelSpec = NeuralRouter.selectModel(StageType.PRODUCT_SPEC, 'structured_output');
    const model = ModelRegistry.create(modelSpec);

    const prompt = `
    PRODUCT: "${spec.title}"
    CONTEXT: ${spec.description}
    FEATURES: 
    ${JSON.stringify(spec.features.map(f => f.name + ": " + f.userStory), null, 2)}
    
    YOUR TASK: Review this product spec from your perspective as ${persona.role}.
    `;

    const schema = z.object({
        verdict: z.enum(['approved', 'rejected', 'needs_work']),
        score: z.number().min(0).max(100).describe("Score based on your specific focus area (0-100)"),
        criticalFlaws: z.array(z.string()).describe("Top 3 fatal flaws or major risks"),
        suggestions: z.array(z.string()).describe("Top 3 actionable improvements")
    });

    try {
        const { object } = await generateObject({
            model,
            system: persona.systemPrompt,
            prompt,
            schema
        });

        return {
            persona: persona.role,
            ...object
        };
    } catch (error) {
        console.error(`Error in roast by ${persona.role}:`, error);
        return {
            persona: persona.role,
            verdict: 'needs_work',
            score: 0,
            criticalFlaws: ['Agent failed to respond'],
            suggestions: ['Retry the roast']
        };
    }
};

export const runRoast = async (spec: SpecSchema, config: AIConfig): Promise<RoastResult> => {
    console.log(`[RoastSwarm] Initiating roast for: ${spec.title}`);

    // Run all personas in parallel
    const promises = Object.values(ROAST_PERSONAS).map(persona => runPersonaRoast(spec, persona));
    const feedbacks = await Promise.all(promises);

    // Calculate overall score
    const totalScore = feedbacks.reduce((acc, f) => acc + f.score, 0);
    const overallScore = Math.round(totalScore / feedbacks.length);

    // Generate summary
    const passed = feedbacks.filter(f => f.verdict === 'approved').length;
    const summary = `Roast Complete. ${passed}/${feedbacks.length} personas approved. Overall Score: ${overallScore}/100.`;

    return {
        overallScore,
        feedbacks,
        summary
    };
};

// --- Strategy Roast V2 (Summary-Based, Pillar-Attributed) ---

export interface AttributedFlaw {
    text: string;
    targetPillar: StageType;
}

export interface StrategyRoastFeedback {
    persona: string;
    verdict: 'approved' | 'rejected' | 'needs_work';
    score: number;
    criticalFlaws: AttributedFlaw[];
    suggestions: AttributedFlaw[];
}

export interface StrategyRoastResult {
    overallScore: number;
    feedbacks: StrategyRoastFeedback[];
    summary: string;
}

const PILLAR_STAGES: StageType[] = [
    StageType.MARKET_ANALYSIS,
    StageType.USER_PERSONA,
    StageType.SOLUTION_CONCEPT,
    StageType.PRODUCT_SPEC,
    StageType.EXECUTION_ROADMAP,
];

const roastStrategyPersona = async (
    pillarSummaries: Record<string, string>,
    idea: string,
    persona: RoastPersona
): Promise<StrategyRoastFeedback> => {
    const modelSpec = NeuralRouter.selectModel(StageType.PRODUCT_SPEC, 'structured_output');
    const model = ModelRegistry.create(modelSpec);

    const strategyContext = PILLAR_STAGES.map(stage => {
        const label = STAGE_CONFIG[stage].label;
        const summary = pillarSummaries[stage] || '(Not yet generated)';
        return `## ${label}\n${summary}`;
    }).join('\n\n---\n\n');

    const prompt = `
    PRODUCT IDEA: "${idea}"

    FULL STRATEGY (5 Bushido Pillars — Distilled Summaries):
    ${strategyContext}

    YOUR TASK: Review this ENTIRE business strategy from your perspective as ${persona.role}.
    Focus on ${persona.focus}. Evaluate the strategy holistically — how well do the pillars support each other?
    
    For EVERY flaw and suggestion, you MUST specify which pillar it applies to.
    Valid pillar values: MARKET_ANALYSIS, USER_PERSONA, SOLUTION_CONCEPT, PRODUCT_SPEC, EXECUTION_ROADMAP
    `;

    const schema = z.object({
        verdict: z.enum(['approved', 'rejected', 'needs_work']),
        score: z.number().min(0).max(100).describe("Score based on your specific focus area (0-100)"),
        criticalFlaws: z.array(z.object({
            text: z.string().describe("The flaw description"),
            targetPillar: z.enum(['MARKET_ANALYSIS', 'USER_PERSONA', 'SOLUTION_CONCEPT', 'PRODUCT_SPEC', 'EXECUTION_ROADMAP']).describe("Which pillar this flaw primarily affects")
        })).describe("Top 3 fatal flaws or major risks across the entire strategy"),
        suggestions: z.array(z.object({
            text: z.string().describe("The suggestion description"),
            targetPillar: z.enum(['MARKET_ANALYSIS', 'USER_PERSONA', 'SOLUTION_CONCEPT', 'PRODUCT_SPEC', 'EXECUTION_ROADMAP']).describe("Which pillar this suggestion primarily applies to")
        })).describe("Top 3 actionable improvements")
    });

    try {
        const { object } = await generateObject({
            model,
            system: persona.systemPrompt,
            prompt,
            schema
        });

        return {
            persona: persona.role,
            verdict: object.verdict,
            score: object.score,
            criticalFlaws: object.criticalFlaws.map(f => ({ text: f.text, targetPillar: f.targetPillar as StageType })),
            suggestions: object.suggestions.map(s => ({ text: s.text, targetPillar: s.targetPillar as StageType })),
        };
    } catch (error) {
        console.error(`Error in strategy roast by ${persona.role}:`, error);
        return {
            persona: persona.role,
            verdict: 'needs_work',
            score: 0,
            criticalFlaws: [{ text: 'Agent failed to respond', targetPillar: StageType.PRODUCT_SPEC }],
            suggestions: [{ text: 'Retry the roast', targetPillar: StageType.PRODUCT_SPEC }],
        };
    }
};

/**
 * Roast the full strategy using dense pillar summaries.
 * Returns pillar-attributed feedback for the human gate.
 */
export const roastStrategy = async (
    pillarSummaries: Record<string, string>,
    idea: string,
    config: AIConfig
): Promise<StrategyRoastResult> => {
    console.log(`[RoastSwarm] Initiating full strategy roast for: "${idea.slice(0, 60)}..."`);

    const promises = Object.values(ROAST_PERSONAS).map(persona =>
        roastStrategyPersona(pillarSummaries, idea, persona)
    );
    const feedbacks = await Promise.all(promises);

    const totalScore = feedbacks.reduce((acc, f) => acc + f.score, 0);
    const overallScore = Math.round(totalScore / feedbacks.length);
    const passed = feedbacks.filter(f => f.verdict === 'approved').length;
    const summary = `Strategy Roast Complete. ${passed}/${feedbacks.length} personas approved. Overall Score: ${overallScore}/100.`;

    return { overallScore, feedbacks, summary };
};

import { BeadClient } from '../beadClient';

export const roastIdea = async (idea: string, config: AIConfig): Promise<RoastResult> => {
    // Create a temporary spec from the raw idea string
    const tempSpec: SpecSchema = {
        id: 'temp-roast-' + Date.now(),
        title: 'Product Concept',
        version: '0.0.1',
        lastUpdated: new Date().toISOString(),
        description: idea,
        definitions: {
            featureFlags: [],
            userRoles: [],
            entities: {}
        },
        features: [
            {
                id: 'feat-1',
                name: 'Core Value Proposition',
                userStory: idea,
                acceptanceCriteria: [],
                priority: 'critical' as any
            }
        ],
        constraints: {
            techStack: [],
            codingStandards: [],
            excludedPatterns: []
        }
    };

    return runRoast(tempSpec, config);
};

export const runRoastLoop = async () => {
    console.log('[RoastLoop] Starting AI Roast...');

    // 1. Read Context
    const spec = await BeadClient.read<SpecSchema>('spec.json');
    if (!spec) {
        console.error('No spec.json found. Cannot roast nothing.');
        return;
    }

    // 2. Roast
    // Mock config for now as it's not strictly used in runRoast yet
    const result = await runRoast(spec, { provider: 'openai', modelName: 'gpt-4o' });

    // 3. Persist
    await BeadClient.write('roast.json', result);
    console.log('[RoastLoop] Roast complete and saved to roast.json');

    return result;
};
