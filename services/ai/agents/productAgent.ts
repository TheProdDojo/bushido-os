
import { generateObject } from 'ai';
import { z } from 'zod';
import { ModelRegistry } from '../modelRegistry';
import { SpecSchema, PrdSchema, UserStoryZodSchema, StrategyPackage } from '../../../types/beads';
import { BeadClient } from '../beadClient';
import { runSpecComplianceAudit } from './alignmentService';
import { StageType, STAGE_CONFIG } from '../../../types';
import { NeuralRouter } from '../neuralRouter';

export const generatePrd = async (input: StrategyPackage | SpecSchema, critique?: string): Promise<PrdSchema> => {
    // Determine if we have a full StrategyPackage or just a bare spec
    const isPackage = 'pillarSummaries' in input;
    const spec: SpecSchema = isPackage ? (input as StrategyPackage).spec : (input as SpecSchema);
    const pkg = isPackage ? (input as StrategyPackage) : null;

    console.log(`[ProductAgent] Generating PRD for: ${spec.title} ${critique ? '(Retry with Critique)' : ''} ${isPackage ? '(Full Strategy Package)' : '(Spec only)'}`);

    const modelSpec = NeuralRouter.selectModel(StageType.PRODUCT_SPEC, 'structured_output');
    const model = ModelRegistry.create(modelSpec);

    // Build strategy context if available
    let strategyContext = '';
    if (pkg) {
        const pillarEntries = Object.entries(pkg.pillarSummaries)
            .map(([stage, summary]) => {
                const label = STAGE_CONFIG[stage as keyof typeof STAGE_CONFIG]?.label || stage;
                return `### ${label}\n${summary}`;
            })
            .join('\n\n');

        const insightsText = pkg.roastInsights.length > 0
            ? pkg.roastInsights.map(i =>
                `- [${i.persona}] ${i.flaw || i.suggestion} → TARGET: ${STAGE_CONFIG[i.targetPillar]?.label || i.targetPillar}`
            ).join('\n')
            : 'None';

        strategyContext = `
    STRATEGY CONTEXT (Battle-Tested — Roast Score: ${pkg.roastScore}/100):
    
    ${pillarEntries}

    ACTIONED ROAST INSIGHTS (These MUST be reflected in user stories):
    ${insightsText}
    `;
    }

    const prompt = `
    PRODUCT: "${spec.title}"
    DESCRIPTION: "${spec.description}"
    ${strategyContext}
    
    FEATURES: 
    ${JSON.stringify(spec.features, null, 2)}
    
    CONSTRAINTS:
    ${JSON.stringify(spec.constraints, null, 2)}
    
    PREVIOUS FEEDBACK (Must Address):
    ${critique || "None"}
    
    YOUR TASK:
    1. Extract "Non-Negotiables" from the constraints and strategy insights.
    2. Convert Features into User Stories with detailed acceptance criteria.
    ${pkg ? '3. Ensure stories reflect the FULL strategy context — market positioning, user pain points, and roast feedback.' : '3. Ensure strictly aligned with the Spec.'}
    
    OUTPUT: A structured PRD object.
    `;

    const schema = z.object({
        nonNegotiables: z.array(z.string()),
        stories: z.array(UserStoryZodSchema)
    });

    const { object } = await generateObject({
        model,
        prompt,
        schema
    });

    return {
        id: `prd-${Date.now()}`,
        version: "1.0.0",
        lastUpdated: new Date().toISOString(),
        nonNegotiables: object.nonNegotiables,
        stories: object.stories,
        rawSpec: spec
    };
};

/**
 * The Ralph Wiggum Loop: Generate -> Audit -> Fix
 */
export const runProductAgentLoop = async () => {
    console.log('[RalphWiggum] Starting Product Agent Loop...');

    // 1. Read Context (Bead)
    const spec = await BeadClient.read<SpecSchema>('spec.json');
    if (!spec) {
        console.error('No spec.json found via BeadClient');
        return;
    }

    let attempts = 0;
    const MAX_ATTEMPTS = 3;
    let critique = "";

    while (attempts < MAX_ATTEMPTS) {
        console.log(`[Loop] Attempt ${attempts + 1}/${MAX_ATTEMPTS}`);

        // 2. Generate
        const prd = await generatePrd(spec, critique);

        // 3. Persist Draft
        await BeadClient.write('prd.json', prd);

        // 4. Audit (TAME)
        const privacy = await runSpecComplianceAudit(prd, spec);
        console.log(`[Loop] Alignment Score: ${privacy.score}`);

        // 5. Gate Check
        if (privacy.score >= 90 && privacy.aligned) {
            console.log('[Loop] Success! PRD Aligned.');
            return prd;
        }

        // 6. Critique for next loop
        critique = `The previous PRD scored ${privacy.score}/100. Discrepancies: ${JSON.stringify(privacy.discrepancies)}. Please fix these.`;
        attempts++;

        await BeadClient.write(`alignment-report-${attempts}.json`, privacy);
    }

    console.warn('[Loop] Failed to converge after max attempts.');
    return null;
};
