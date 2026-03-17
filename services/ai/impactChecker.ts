import { generateText } from 'ai';
import { ModelRegistry } from './modelRegistry';
import { NeuralRouter } from './neuralRouter';
import { MODEL_SPECS } from './neural-engine';
import { CostTracker } from './costTracker';

export const ImpactChecker = {
    /**
     * Analyze if a user instruction requires detailed regeneration or just a simple copy edit.
     * Returns TRUE if structural/impactful (requires full regeneration).
     * Returns FALSE if cosmetic (can be quick edit).
     */
    shouldRegenerate: async (
        artifactType: string,
        currentContent: string,
        userInstruction: string
    ): Promise<boolean> => {
        // Try to use lightweight free model (Cerebras 8B @ 30 RPM)
        let spec = MODEL_SPECS.CEREBRAS_LLAMA;

        // Fallback to Groq 8B if Cerebras unavailable
        if (!NeuralRouter.isAvailable(spec)) {
            spec = MODEL_SPECS.GROQ_LLAMA;
        }

        // Deep fallback
        if (!NeuralRouter.isAvailable(spec)) {
            // If even free tiers are down, default to TRUE (safe side)
            return true;
        }

        const model = ModelRegistry.create(spec);

        const prompt = `
        You are an AI Cost Optimizer.
        Analyze the user's edit instruction for a "${artifactType}" document.
        
        USER INSTRUCTION: "${userInstruction}"
        DOCUMENT EXCERPT: "${currentContent.substring(0, 300)}..."
        
        EXAMPLES OF STRUCTURAL CHANGES (YES):
        - "Change business model to subscription"
        - "Add a new user role"
        - "Switch tech stack to Python"
        
        EXAMPLES OF COSMETIC CHANGES (NO):
        - "Fix typos"
        - "Make tone more professional"
        - "Add a sentence about market growth"
        
        Does this require regenerating the technical architecture/logic?
        Answer ONLY with "YES" or "NO".
        `;

        try {
            const { text, usage } = await generateText({ model, prompt });
            CostTracker.track('SYSTEM', 'IMPACT_CHECK', spec, usage.inputTokens || 0, usage.outputTokens || 0);

            return text.trim().toUpperCase().includes('YES');
        } catch (e) {
            console.error('[ImpactChecker] Failed', e);
            return true; // Fail safe
        }
    }
};
