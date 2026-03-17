import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { ModelSpec, AIProvider } from './neural-engine';
import { LanguageModel } from 'ai';

// Helper to retrieve keys safely
export const getProviderKey = (provider: AIProvider, config?: { apiKey?: string; provider?: AIProvider }): string => {
    // If config has a specific apiKey, USE IT if the provider matches OR if it's a generic "one key fits all" scenario (legacy).
    // In V2, we assume config.apiKey corresponds to the config.provider. 
    // If we request 'google' but config.provider is 'openai', we should prob ignore config.apiKey?
    // For now, let's trust the caller or check.
    if (config?.apiKey && (!config.provider || config.provider === provider)) {
        return config.apiKey;
    }

    // Fallback to env vars...
    const getEnv = (key: string) => {
        if (typeof import.meta !== 'undefined' && import.meta.env) {
            return import.meta.env[key];
        }
        if (typeof process !== 'undefined' && process.env) {
            return process.env[key];
        }
        return undefined;
    };

    switch (provider) {
        case 'openai': return getEnv('VITE_OPENAI_API_KEY') || '';
        case 'google': return getEnv('VITE_GOOGLE_API_KEY') || getEnv('VITE_GEMINI_API_KEY') || '';
        case 'deepseek': return getEnv('VITE_DEEPSEEK_API_KEY') || '';
        case 'cerebras': return getEnv('VITE_CEREBRAS_API_KEY') || '';
        case 'groq': return getEnv('VITE_GROQ_API_KEY') || '';
        case 'ollama': return 'ollama';
        default: return '';
    }
};

const getBaseURL = (provider: AIProvider): string | undefined => {
    switch (provider) {
        case 'ollama': return 'http://localhost:11434/v1';
        case 'deepseek': return 'https://api.deepseek.com';
        case 'cerebras': return 'https://api.cerebras.ai/v1';
        case 'groq': return 'https://api.groq.com/openai/v1';
        default: return undefined;
    }
};

export const ModelRegistry = {
    /**
     * Check if a model key is available.
     */
    hasKey: (spec: ModelSpec, config?: { apiKey?: string; provider?: string }): boolean => {
        const key = getProviderKey(spec.provider, config as any);
        return !!key || spec.provider === 'ollama';
    },

    /**
     * Instantiate an AI SDK LanguageModel for the given spec.
     */
    create: (spec: ModelSpec, config?: { apiKey?: string; provider?: string }): LanguageModel => {
        const apiKey = getProviderKey(spec.provider, config as any);
        const baseURL = getBaseURL(spec.provider);

        if (!apiKey && spec.provider !== 'ollama') {
            throw new Error(`Missing API Key for provider: ${spec.provider}`);
        }

        switch (spec.provider) {
            case 'google': {
                const google = createGoogleGenerativeAI({ apiKey });
                return google(spec.id);
            }
            case 'openai': {
                const openai = createOpenAI({ apiKey });
                return openai(spec.id);
            }
            case 'deepseek':
            case 'cerebras':
            case 'groq':
            case 'ollama': {
                // All these are OpenAI-compatible
                const openai = createOpenAI({
                    apiKey,
                    baseURL,
                    // name: spec.provider // Identify the provider internally - removed per previous instruction attempt or just keep it clean
                });
                return openai.chat(spec.id);
            }
            default:
                throw new Error(`Unsupported provider in Registry: ${spec.provider}`);
        }
    }
};
