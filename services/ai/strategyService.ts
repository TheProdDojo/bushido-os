/**
 * Strategy Service — Summarize, Evolve, Package
 * 
 * Powers the distillation pipeline between pillar generation and the Product Agent.
 */

import { streamText, generateText } from 'ai';
import { Artifact, StageType, STAGE_CONFIG } from '../../types';
import { AIConfig } from './types';
import { NeuralRouter } from './neuralRouter';
import { ModelRegistry } from './modelRegistry';
import { ActionableRoastItem, StrategyPackage, SpecSchema } from '../../types/beads';
import { StrategyRoastResult } from './agents/roastService';

// The 5 strategy pillars (excludes DEEP_RESEARCH)
const PILLAR_STAGES: StageType[] = [
    StageType.MARKET_ANALYSIS,
    StageType.USER_PERSONA,
    StageType.SOLUTION_CONCEPT,
    StageType.PRODUCT_SPEC,
    StageType.EXECUTION_ROADMAP,
];

/**
 * Summarize a single pillar artifact into a ~500-word strategic brief.
 */
export const summarizePillar = async (
    artifact: Artifact,
    config: AIConfig
): Promise<string> => {
    if (!artifact.content || artifact.content.trim().length < 50) {
        return `(${STAGE_CONFIG[artifact.type].label}: No substantial content yet)`;
    }

    const spec = NeuralRouter.selectModel(StageType.MARKET_ANALYSIS);
    if (!NeuralRouter.isAvailable(spec, config)) {
        // Fallback: return first 800 chars as a crude summary
        return artifact.content.slice(0, 800);
    }

    const model = ModelRegistry.create(spec, config);

    const { text } = await generateText({
        model,
        system: `You are a strategy analyst for BushidoOS. Your job is to distill lengthy artifacts into dense, actionable strategic summaries.`,
        prompt: `
ARTIFACT: ${STAGE_CONFIG[artifact.type].label}

FULL CONTENT:
${artifact.content}

TASK:
Distill this into a dense ~500-word strategic summary. Focus on:
- Key findings and data points
- Strategic implications
- Risks and opportunities identified
- Critical decisions made

RULES:
- No filler. Every sentence must carry strategic weight.
- Preserve specific numbers, metrics, and data points.
- Use bullet points for key findings.
- Maximum 500 words.

OUTPUT only the summary, no preamble.`,
    });

    return text;
};

/**
 * Summarize all 5 pillar artifacts in parallel.
 */
export const summarizeStrategy = async (
    artifacts: Record<StageType, Artifact>,
    config: AIConfig
): Promise<Record<string, string>> => {
    const summaries: Record<string, string> = {};

    const results = await Promise.all(
        PILLAR_STAGES.map(async (stage) => {
            const artifact = artifacts[stage];
            if (!artifact) return { stage, summary: `(${STAGE_CONFIG[stage].label}: Not generated)` };
            const summary = await summarizePillar(artifact, config);
            return { stage, summary };
        })
    );

    for (const { stage, summary } of results) {
        summaries[stage] = summary;
    }

    return summaries;
};

/**
 * Evolve specific pillars based on actioned roast feedback.
 * Returns only the updated artifacts (not unchanged ones).
 */
export const evolveStrategy = async (
    artifacts: Record<StageType, Artifact>,
    actionItems: ActionableRoastItem[],
    idea: string,
    config: AIConfig
): Promise<Record<StageType, Artifact>> => {
    // Group action items by target pillar
    const itemsByPillar: Record<string, ActionableRoastItem[]> = {};
    for (const item of actionItems) {
        const key = item.targetPillar;
        if (!itemsByPillar[key]) itemsByPillar[key] = [];
        itemsByPillar[key].push(item);
    }

    const affectedStages = Object.keys(itemsByPillar) as StageType[];
    const updatedArtifacts: Record<StageType, Artifact> = { ...artifacts };

    // Evolve each affected pillar
    for (const stage of affectedStages) {
        const artifact = artifacts[stage];
        if (!artifact || !artifact.content) continue;

        const feedback = itemsByPillar[stage];
        const feedbackText = feedback.map(f =>
            `[${f.persona}] Flaw: ${f.flaw} → Suggestion: ${f.suggestion}`
        ).join('\n');

        const spec = NeuralRouter.selectModel(stage);
        if (!NeuralRouter.isAvailable(spec, config)) continue;

        const model = ModelRegistry.create(spec, config);

        const { text } = await generateText({
            model,
            system: `You are a strategy evolution agent for BushidoOS. You refine existing strategy artifacts based on expert feedback.`,
            prompt: `
PRODUCT IDEA: "${idea}"

CURRENT ${STAGE_CONFIG[stage].label}:
${artifact.content}

EXPERT FEEDBACK TO ADDRESS:
${feedbackText}

TASK:
Rewrite the ${STAGE_CONFIG[stage].label} artifact, incorporating the expert feedback above.
- Address every flaw and suggestion listed.
- Preserve all existing good content that wasn't criticized.
- Maintain the same format and section structure.
- Mark evolved sections with a subtle "🔄" indicator at the section heading level.

OUTPUT only the revised artifact content in Markdown. No preamble.`,
        });

        updatedArtifacts[stage] = {
            ...artifact,
            content: text,
            lastUpdated: Date.now(),
        };
    }

    return updatedArtifacts;
};

/**
 * Assemble the StrategyPackage — the canonical input for the Product Agent.
 * Pure function, no AI calls.
 */
export const assembleStrategyPackage = (
    artifacts: Record<StageType, Artifact>,
    summaries: Record<string, string>,
    roastResult: StrategyRoastResult,
    actionItems: ActionableRoastItem[],
    idea: string
): StrategyPackage => {
    // Extract the SpecSchema from the Product Spec artifact
    let spec: SpecSchema;
    const specArtifact = artifacts[StageType.PRODUCT_SPEC];

    try {
        // Product Spec is stored as a JSON code block
        const jsonMatch = specArtifact?.content?.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch) {
            spec = JSON.parse(jsonMatch[1]);
        } else if (specArtifact?.content) {
            spec = JSON.parse(specArtifact.content);
        } else {
            throw new Error('No spec content');
        }
    } catch {
        // Fallback: create minimal spec from idea
        spec = {
            id: `spec-${Date.now()}`,
            title: idea,
            version: '1.0.0',
            lastUpdated: new Date().toISOString(),
            description: idea,
            definitions: { featureFlags: [], userRoles: [], entities: {} },
            features: [],
            constraints: { techStack: [], codingStandards: [], excludedPatterns: [] },
        };
    }

    return {
        idea,
        pillarSummaries: summaries,
        roastScore: roastResult.overallScore,
        roastInsights: actionItems.filter(item => item.actioned),
        spec,
    };
};
