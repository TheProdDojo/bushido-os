export type ModelProvider = 'google' | 'openai' | 'anthropic' | 'ollama' | 'openrouter';

export interface AIConfig {
    provider: ModelProvider;
    modelName: string;
    apiKey?: string;
    baseURL?: string; // For Local/OpenRouter
    tavilyApiKey?: string;
}

export type StreamUpdateType = 'text' | 'thinking' | 'sources' | 'done' | 'error';

export interface StreamUpdate {
    type: StreamUpdateType;
    content: string;
    title?: string;
    isComplete?: boolean;
    thought?: string;
    sources?: { title: string; uri: string }[];
    pillars?: { stage: string; label: string; goals: string[] }[];
    progress?: { current: number; total: number; label: string };
}
