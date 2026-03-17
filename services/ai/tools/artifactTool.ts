import { tool } from 'ai';
import { z } from 'zod';
import { StageType, Artifact, STAGE_CONFIG } from '../../../types';

/**
 * Artifact Retrieval Tool
 * Allows the AI to "drill down" and read the full content of a specific artifact.
 */
export const createArtifactTool = (artifacts: Record<StageType, Artifact>) => {
    return tool({
        description: 'Read the full content of a specific project artifact/document. Use this when you need detailed information from a stage that is only summarized in your context.',
        inputSchema: z.object({
            stage: z.nativeEnum(StageType).describe('The stage/artifact to read (e.g., "productSpec", "marketAnalysis")'),
        }),
        execute: async ({ stage }: { stage: StageType }) => {
            console.log(`[ArtifactTool] Reading artifact: ${stage}`);

            const artifact = artifacts[stage];

            if (!artifact) {
                return {
                    found: false,
                    content: `No artifact found for stage: ${stage}. It may not have been generated yet.`
                };
            }

            return {
                found: true,
                stage: stage,
                label: STAGE_CONFIG[stage].label,
                content: artifact.content || "(Empty content)"
            };
        },
    });
};
