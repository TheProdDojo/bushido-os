import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';

export const config = {
    runtime: 'edge',
};

// Free tier limits
const FREE_TIER_DAILY_LIMIT = 5;

// In-memory usage tracking (resets on cold start, but Vercel KV can be added later)
const usageMap = new Map<string, { count: number; date: string }>();

const getTodayDate = () => new Date().toISOString().split('T')[0];

const getUsage = (deviceId: string): number => {
    const today = getTodayDate();
    const usage = usageMap.get(deviceId);

    if (!usage || usage.date !== today) {
        usageMap.set(deviceId, { count: 0, date: today });
        return 0;
    }

    return usage.count;
};

const incrementUsage = (deviceId: string): void => {
    const today = getTodayDate();
    const current = getUsage(deviceId);
    usageMap.set(deviceId, { count: current + 1, date: today });
};

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const body = await req.json();
        const { deviceId, prompt, stage, mode } = body;

        if (!deviceId || !prompt) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Check rate limit
        const currentUsage = getUsage(deviceId);
        if (currentUsage >= FREE_TIER_DAILY_LIMIT) {
            return new Response(
                JSON.stringify({
                    error: 'limit_reached',
                    message: 'Daily free tier limit reached. Add your own API key for unlimited generations.',
                    usage: {
                        used: currentUsage,
                        limit: FREE_TIER_DAILY_LIMIT,
                        resetsAt: 'midnight',
                    },
                }),
                { status: 429, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Get hosted API key from environment
        const hostedApiKey = process.env.HOSTED_GEMINI_API_KEY || process.env.HOSTED_OPENROUTER_API_KEY;

        if (!hostedApiKey) {
            return new Response(
                JSON.stringify({ error: 'Hosted AI not configured' }),
                { status: 503, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Determine which provider to use
        const useOpenRouter = !!process.env.HOSTED_OPENROUTER_API_KEY;

        let model;
        if (useOpenRouter) {
            const openai = createOpenAI({
                apiKey: process.env.HOSTED_OPENROUTER_API_KEY!,
                baseURL: 'https://openrouter.ai/api/v1',
            });
            // Use DeepSeek R1 or Llama for cost efficiency
            model = openai(process.env.HOSTED_MODEL_NAME || 'deepseek/deepseek-r1');
        } else {
            const google = createGoogleGenerativeAI({
                apiKey: process.env.HOSTED_GEMINI_API_KEY!,
            });
            model = google(process.env.HOSTED_MODEL_NAME || 'gemini-2.0-flash');
        }

        // For free tier, only allow Market Analysis (Stage 1)
        const isFreeTierStage = stage === 'MARKET_ANALYSIS' || mode === 'teaser';

        if (!isFreeTierStage) {
            return new Response(
                JSON.stringify({
                    error: 'stage_locked',
                    message: 'This stage requires your own API key. The free tier only includes Market Analysis.',
                    allowedStages: ['MARKET_ANALYSIS'],
                }),
                { status: 403, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Increment usage BEFORE generation (optimistic)
        incrementUsage(deviceId);

        // Stream the response
        const result = await streamText({
            model,
            system: `You are a strategic product advisor helping founders validate their startup ideas. 
Provide actionable, data-driven insights. Be direct and honest about market realities.
Format your response in clear sections with headers.`,
            prompt,
        });

        // Return streaming response
        return result.toTextStreamResponse();

    } catch (error) {
        console.error('Hosted AI Error:', error);
        return new Response(
            JSON.stringify({
                error: 'generation_failed',
                message: error instanceof Error ? error.message : 'Unknown error'
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
