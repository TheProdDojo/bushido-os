
import { generateObject } from 'ai';
import { z } from 'zod';
import { ModelRegistry } from '../modelRegistry';
import { PrdSchema, AlignmentReport, AlignmentReportZodSchema } from '../../../types/beads';
import { StageType } from '../../../types';
import { NeuralRouter } from '../neuralRouter';
import { MODEL_SPECS } from '../neural-engine';

export const runAlignmentAudit = async (prd: PrdSchema, codebaseContext: string): Promise<AlignmentReport> => {
    console.log(`[AlignmentAudit] Auditing PRD: ${prd.rawSpec?.title || prd.id} against codebase context.`);

    const prompt = `
    PRD CONTEXT:
    Non-Negotiables: ${JSON.stringify(prd.nonNegotiables)}
    User Stories: ${JSON.stringify(prd.stories.map(s => ({ id: s.id, story: s.story, criteria: s.acceptanceCriteria })))}

    CODEBASE CONTEXT:
    ${codebaseContext}

    YOUR TASK:
    1. Analyze the provided CODEBASE CONTEXT to see if it aligns with the PRD.
    2. Check if any "Non-Negotiables" are violated (e.g. using wrong tech stack, missing directory structure).
    3. Check if "User Stories" are implemented or if there is evidence of them being missing/broken.
    4. Generate an Alignment Report.

    SCORING:
    - 100: Perfect alignment.
    - < 50: Major architectural violations or missing critical features.
    `;

    // Try the NeuralRouter's preferred model first, then fallback chain
    const modelChain = [
        NeuralRouter.selectModel(StageType.PRODUCT_SPEC, 'structured_output'),
        MODEL_SPECS.GEMINI_FLASH,
        MODEL_SPECS.GEMINI_PRO,
    ];

    for (const modelSpec of modelChain) {
        try {
            const model = ModelRegistry.create(modelSpec);
            console.log(`[AlignmentAudit] Using model: ${modelSpec.label || modelSpec.id}`);
            const { object } = await generateObject({
                model,
                prompt,
                schema: AlignmentReportZodSchema
            });
            return object;
        } catch (err: any) {
            console.warn(`[AlignmentAudit] Model ${modelSpec.id} failed: ${err.message}. Trying next...`);
            continue;
        }
    }

    // All models failed — return a fallback report
    console.error('[AlignmentAudit] All models failed. Returning fallback report.');
    return {
        aligned: false,
        score: 0,
        discrepancies: [{
            violatedItem: 'AUDIT_FAILURE',
            title: 'Audit could not complete',
            description: 'All AI models failed to generate the alignment report. Check API keys and model availability.',
            severity: 'critical' as any,
            suggestedFix: 'Ensure VITE_GEMINI_API_KEY is set in .env.local'
        }]
    } as AlignmentReport;
};

export const runSpecComplianceAudit = async (prd: PrdSchema, spec: any): Promise<AlignmentReport> => {
    console.log(`[AlignmentAudit] Checking PRD compliance with Spec...`);

    const modelSpec = NeuralRouter.selectModel(StageType.PRODUCT_SPEC, 'structured_output');
    const model = ModelRegistry.create(modelSpec);

    const prompt = `
    SPECIFICATION:
    ${JSON.stringify(spec)}

    GENERATED PRD:
    ${JSON.stringify(prd)}

    YOUR TASK:
    1. Verify if the PRD faithfully captures the intent of the Spec.
    2. Check for "hallucinations" (features in PRD not in Spec).
    3. Check for "amnesia" (features in Spec missing from PRD).
    4. Validate that 'Non-Negotiables' are preserved.

    OUTPUT: Alignment Report.
    `;

    const { object } = await generateObject({
        model,
        prompt,
        schema: AlignmentReportZodSchema
    });

    return object;
}
