
import { z } from 'zod';

// --- Model Specifications ---

export type AIProvider = 'google' | 'openai' | 'deepseek' | 'cerebras' | 'groq' | 'ollama';

export interface ModelCost {
    input: number; // Cost per 1M tokens
    output: number; // Cost per 1M tokens
}

export interface RateLimitSpec {
    requests: number;
    window: 'minute' | 'hour' | 'day';
}

export interface ModelSpec {
    id: string; // The wire-format model ID (e.g., 'gemini-2.5-flash')
    provider: AIProvider;
    label: string; // Human readable name
    capabilities: ('search' | 'structured_output' | 'reasoning' | 'vision')[];
    contextWindow?: number;
    hasThinkingTokens?: boolean; // For DeepSeek R1 <think> tags
    isFreeTier?: boolean;
    costPer1M?: ModelCost;
    rateLimit?: RateLimitSpec;
}

export const MODEL_SPECS: Record<string, ModelSpec> = {
    // --- Google (AI Studio Free Tier) ---
    GEMINI_FLASH: {
        id: 'gemini-2.5-flash',
        provider: 'google',
        label: 'Gemini 2.5 Flash',
        capabilities: ['search', 'structured_output', 'vision'],
        costPer1M: { input: 0.10, output: 0.40 },
        isFreeTier: true,
        rateLimit: { requests: 15, window: 'minute' },
    },
    GEMINI_PRO: {
        id: 'gemini-2.5-pro',
        provider: 'google',
        label: 'Gemini 2.5 Pro',
        capabilities: ['search', 'structured_output', 'vision', 'reasoning'],
        costPer1M: { input: 1.25, output: 5.00 },
    },

    // --- Google Gemini 3 (Preview — available via Interactions API) ---
    GEMINI_3_FLASH: {
        id: 'gemini-3-flash-preview',
        provider: 'google',
        label: 'Gemini 3 Flash (Preview)',
        capabilities: ['search', 'structured_output', 'vision'],
        isFreeTier: true,
        rateLimit: { requests: 15, window: 'minute' },
    },
    GEMINI_3_PRO: {
        id: 'gemini-3-pro-preview',
        provider: 'google',
        label: 'Gemini 3 Pro (Preview)',
        capabilities: ['search', 'structured_output', 'vision', 'reasoning'],
        costPer1M: { input: 1.25, output: 5.00 },
    },

    // --- DeepSeek ($4.96 balance) ---
    DEEPSEEK_R1: {
        id: 'deepseek-reasoner',
        provider: 'deepseek',
        label: 'DeepSeek R1',
        capabilities: ['reasoning'],
        contextWindow: 128000,
        hasThinkingTokens: true,
        costPer1M: { input: 0.28, output: 0.42 },
    },

    // --- Cerebras (Free Tier — 14,400 req/day, 30 RPM) ---
    CEREBRAS_GPT: {
        id: 'gpt-oss-120b',
        provider: 'cerebras',
        label: 'GPT OSS 120B (Cerebras)',
        capabilities: ['structured_output', 'reasoning'],
        contextWindow: 65536,
        rateLimit: { requests: 30, window: 'minute' },
        isFreeTier: true,
    },
    CEREBRAS_LLAMA: {
        id: 'llama3.1-8b',
        provider: 'cerebras',
        label: 'Llama 3.1 8B (Cerebras)',
        capabilities: ['structured_output'],
        contextWindow: 8192,
        rateLimit: { requests: 30, window: 'minute' },
        isFreeTier: true,
    },

    // --- Groq (Low-cost, ultra-fast inference) ---
    GROQ_LLAMA_70B: {
        id: 'llama-3.3-70b-versatile',
        provider: 'groq',
        label: 'Llama 3.3 70B (Groq)',
        capabilities: ['structured_output', 'reasoning'],
        contextWindow: 131072,
        costPer1M: { input: 0.59, output: 0.79 },
    },
    GROQ_LLAMA: {
        id: 'llama-3.1-8b-instant',
        provider: 'groq',
        label: 'Llama 3.1 8B (Groq)',
        capabilities: ['structured_output'],
        contextWindow: 131072,
        costPer1M: { input: 0.05, output: 0.08 },
        isFreeTier: true,
    },

    // --- OpenAI (Paid fallback) ---
    GPT_4O: {
        id: 'gpt-4o',
        provider: 'openai',
        label: 'GPT-4o',
        capabilities: ['structured_output', 'vision', 'reasoning'],
        costPer1M: { input: 2.50, output: 10.00 },
    },
};

// --- Validation Schemas ---

export interface ValidationRule {
    type: 'regex' | 'json_schema' | 'min_length';
    pattern?: RegExp;
    schema?: z.ZodSchema;
    minLength?: number;
    error: string;
}

export const ARTIFACT_VALIDATORS: Record<string, ValidationRule[]> = {
    MARKET_ANALYSIS: [
        { type: 'regex', pattern: /##\s+🚨\s*Market Reality/i, error: 'Missing "Market Reality" section' },
        { type: 'regex', pattern: /##\s+⚔️\s*Competitors/i, error: 'Missing "Competitors" section' },
        { type: 'regex', pattern: /##\s+⚠️\s*Risks/i, error: 'Missing "Risks" section' },
        { type: 'regex', pattern: /##\s+💡\s*Opportunities/i, error: 'Missing "Opportunities" section' },
        { type: 'min_length', minLength: 800, error: 'Market Analysis content too short for actionable insights' },
    ],
    USER_PERSONA: [
        { type: 'regex', pattern: /#\s+Persona:/i, error: 'Missing Persona Title' },
        { type: 'min_length', minLength: 500, error: 'Content is too short for a robust persona' },
        { type: 'regex', pattern: /##\s+.*Pain Points/i, error: 'Missing Pain Points section' },
        { type: 'regex', pattern: /##\s+.*Journey/i, error: 'Missing User Journey section' },
        { type: 'regex', pattern: /##\s+.*Demographics/i, error: 'Missing Demographics section' },
    ],
    SOLUTION_CONCEPT: [
        { type: 'regex', pattern: /```mermaid\s*flowchart/i, error: 'Missing Flowchart diagram (Mermaid)' },
        { type: 'regex', pattern: /##\s+Core Value/i, error: 'Missing Core Value section' },
        { type: 'regex', pattern: /##\s+.*Business Model/i, error: 'Missing Business Model section' },
        { type: 'regex', pattern: /##\s+.*SWOT/i, error: 'Missing SWOT Analysis section' },
        { type: 'min_length', minLength: 1000, error: 'Solution Concept too short for a comprehensive strategy' },
    ],
    // PRODUCT_SPEC: Validated by SpecZodSchema via streamObject() — no regex rules needed.
    // The structured output path in aiService.ts uses Zod schema enforcement at generation time.
    EXECUTION_ROADMAP: [
        { type: 'regex', pattern: /```mermaid\s*gantt/i, error: 'Missing Gantt Chart (Mermaid)' },
        { type: 'regex', pattern: /##\s+.*Milestones/i, error: 'Missing Milestones section' },
        { type: 'regex', pattern: /##\s+.*OKR/i, error: 'Missing OKRs section' },
        { type: 'regex', pattern: /##\s+.*Now.*Next.*Later|Now\/Next\/Later/i, error: 'Missing Now/Next/Later prioritization framework' },
        { type: 'min_length', minLength: 800, error: 'Execution Roadmap too short for a comprehensive plan' },
    ]
};
