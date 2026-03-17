import { StageType } from '../../types';
import { ModelSpec, MODEL_SPECS } from './neural-engine';
import { ModelRegistry } from './modelRegistry';
import { RateLimitManager } from './rateLimitManager';

export type ModelIntent = 'reasoning' | 'vision' | 'structured_output';

export const NeuralRouter = {
    /**
     * Select the optimal model for a given stage, handling fallbacks and rate limits.
     * Optional `intent` allows capability-based selection (e.g., agents needing structured output).
     */
    selectModel: (stage: StageType, intent?: ModelIntent): ModelSpec => {
        // Intent overrides: vision tasks always need Gemini (multimodal)
        if (intent === 'vision') {
            return MODEL_SPECS.GEMINI_FLASH;
        }

        // Intent: structured_output → Free-tier models with structured output support
        // Used by agents that previously hardcoded GPT-4o
        if (intent === 'structured_output') {
            const structuredChain = [
                MODEL_SPECS.CEREBRAS_GPT,     // Free, 65K context, structured output
                MODEL_SPECS.GROQ_LLAMA_70B,   // Low-cost, 131K context, structured output
                MODEL_SPECS.GEMINI_FLASH,     // Free, structured output + vision
            ];

            for (const spec of structuredChain) {
                if (NeuralRouter.isAvailable(spec)) {
                    return spec;
                }
            }

            return MODEL_SPECS.GEMINI_FLASH;
        }

        // Deep Research: Always use Gemini Flash for native Search integration
        if ((stage as any) === 'DEEP_RESEARCH') {
            return MODEL_SPECS.GEMINI_FLASH;
        }

        // Strategy & Analysis: Gemini Flash (free, supports tools + structured output) -> Gemini Pro -> DeepSeek R1 (reasoning only, no tools)
        if (stage === StageType.MARKET_ANALYSIS || stage === StageType.USER_PERSONA || stage === StageType.SOLUTION_CONCEPT || stage === StageType.PRODUCT_SPEC || stage === StageType.EXECUTION_ROADMAP) {
            // Gemini Flash is preferred: free tier, supports tools, structured output, vision
            if (NeuralRouter.isAvailable(MODEL_SPECS.GEMINI_FLASH)) {
                return MODEL_SPECS.GEMINI_FLASH;
            }
            if (NeuralRouter.isAvailable(MODEL_SPECS.GEMINI_PRO)) {
                return MODEL_SPECS.GEMINI_PRO;
            }
            // DeepSeek R1 is last resort for these stages — no tool/structured output support
            if (NeuralRouter.isAvailable(MODEL_SPECS.DEEPSEEK_R1)) {
                return MODEL_SPECS.DEEPSEEK_R1;
            }
            return MODEL_SPECS.GEMINI_FLASH;
        }

        // Ultimate fallback (all known stages handled above)
        return MODEL_SPECS.GEMINI_FLASH;
    },

    /**
     * Check if a model is available (API key present & within rate limit)
     */
    isAvailable: (spec: ModelSpec, config?: { apiKey?: string; provider?: string }): boolean => {
        // 1. Check Rate Limit
        if (!RateLimitManager.canUse(spec)) {
            console.warn(`[NeuralRouter] Skipping ${spec.id} (Rate Limited)`);
            return false;
        }

        // 2. Check API Key presence using Registry
        return ModelRegistry.hasKey(spec, config);
    }
};
