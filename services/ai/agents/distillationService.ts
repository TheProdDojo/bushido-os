
import { generateObject } from 'ai';
import { z } from 'zod';
import { ModelRegistry } from '../modelRegistry';
import { AlignmentReport, StrategicUpdate, StrategicUpdateZodSchema } from '../../../types/beads';
import { StageType } from '../../../types';
import { NeuralRouter } from '../neuralRouter';

export const distillLearnings = async (report: AlignmentReport): Promise<StrategicUpdate> => {
    console.log(`[Distillation] Analyzing report with score: ${report.score}`);

    const modelSpec = NeuralRouter.selectModel(StageType.PRODUCT_SPEC, 'structured_output');
    const model = ModelRegistry.create(modelSpec);

    const prompt = `
    ALIGNMENT REPORT:
    Score: ${report.score}/100
    Aligned: ${report.aligned}
    
    DISCREPANCIES:
    ${JSON.stringify(report.discrepancies, null, 2)}

    YOUR TASK:
    1. Analyze the discrepancies to understand the root cause of the misalignment.
    2. Distill "Key Learnings" for the product team.
    3. Suggest specific updates to the original Product Spec to prevent this in the future (e.g., clarify a constraint, add a feature).
    4. Estimate the "Complexity Score" (0-10) of the current implementation state based on the friction found.

    OUTPUT: A structured Strategic Update.
    `;

    const { object } = await generateObject({
        model,
        prompt,
        schema: StrategicUpdateZodSchema
    });

    return object;
};
