/**
 * interactionsClient.ts — Gemini Interactions API wrapper for Deep Research
 *
 * Uses raw fetch through the Vite proxy (/gemini-api/) to avoid CORS.
 * The proxy forwards to generativelanguage.googleapis.com.
 * Yields StreamUpdate events compatible with the existing App.tsx consumer.
 */

import type { StreamUpdate } from './types';

const POLL_INTERVAL_MS = 10_000; // 10 seconds between status checks
const MAX_POLL_DURATION_MS = 10 * 60_000; // 10 minute timeout

// Use Vite proxy in dev, direct URL in production (Vercel Edge Function would handle CORS)
const BASE_URL = '/gemini-api/v1beta';

interface InteractionResponse {
    id: string;
    status: 'in_progress' | 'requires_action' | 'completed' | 'failed' | 'cancelled' | 'incomplete';
    outputs?: Array<{ type?: string; text?: string;[key: string]: any }>;
    usage?: { total_tokens?: number };
}

/**
 * Run Deep Research via the Gemini Interactions API.
 *
 * @param topic - The research topic / business idea
 * @param apiKey - Google AI API key (VITE_GOOGLE_API_KEY or VITE_GEMINI_API_KEY)
 * @yields StreamUpdate events: thinking (polling), done (final report), error
 */
export async function* runDeepResearch(
    topic: string,
    apiKey: string
): AsyncGenerator<StreamUpdate, void, unknown> {
    // 1. Start the Deep Research Agent (background mode)
    yield {
        type: 'thinking',
        content: '',
        thought: '🔬 Starting Gemini Deep Research Agent...',
        isComplete: false,
    };

    let interaction: InteractionResponse;
    try {
        const response = await fetch(`${BASE_URL}/interactions?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                agent: 'deep-research-pro-preview-12-2025',
                background: true,
                input: `Research the following topic thoroughly. Provide a comprehensive analysis covering:
- 🚨 Market Reality: Market size, trends, growth, key data points
- ⚔️ Competitors: Key players, their strengths, weaknesses, positioning
- ⚠️ Risks: Major threats, regulatory concerns, market barriers
- 💡 Opportunities: Gaps in the market, emerging trends, untapped segments

Topic: "${topic}"

Write a thorough, data-rich report with specific numbers, sources, and actionable insights.`,
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('[DeepResearch] Create failed:', response.status, errorBody);
            throw new Error(`API error ${response.status}: ${errorBody.slice(0, 200)}`);
        }

        interaction = await response.json();
    } catch (e: any) {
        console.error('[DeepResearch] Failed to start interaction:', e);
        throw new Error(`Failed to start Deep Research: ${e.message || 'Unknown error'}`);
    }

    const interactionId = interaction.id;
    console.log(`[DeepResearch] Started interaction: ${interactionId}`);

    yield {
        type: 'thinking',
        content: '',
        thought: `🔬 Deep Research running (ID: ${interactionId?.slice(0, 12)}...)`,
        isComplete: false,
    };

    // 2. Poll for results
    const startTime = Date.now();
    let pollCount = 0;

    while (true) {
        // Timeout guard
        if (Date.now() - startTime > MAX_POLL_DURATION_MS) {
            yield {
                type: 'error',
                content: '',
                thought: 'Deep Research timed out after 10 minutes.',
                isComplete: true,
            };
            return;
        }

        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        pollCount++;

        let status: InteractionResponse;
        try {
            const response = await fetch(`${BASE_URL}/interactions/${interactionId}?key=${apiKey}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) {
                console.warn(`[DeepResearch] Poll ${pollCount} failed: HTTP ${response.status}`);
                if (pollCount < 3) continue;
                throw new Error(`Polling failed: HTTP ${response.status}`);
            }

            status = await response.json();
        } catch (e: any) {
            console.warn(`[DeepResearch] Poll ${pollCount} failed:`, e.message);
            if (pollCount < 3) continue;
            throw new Error(`Deep Research polling failed: ${e.message}`);
        }

        const currentStatus = status.status || 'unknown';
        console.log(`[DeepResearch] Poll ${pollCount}: status=${currentStatus}`);

        yield {
            type: 'thinking',
            content: '',
            thought: `🔬 Deep Research: ${currentStatus} (poll ${pollCount})...`,
            isComplete: false,
            progress: {
                current: Math.min(pollCount, 10),
                total: 10,
                label: `Researching... (${currentStatus})`,
            },
        };

        if (currentStatus === 'completed') {
            // Extract the final report
            const outputs = status.outputs || [];
            const textOutput = outputs.find((o) => o.type === 'text' || o.text);
            const finalReport = textOutput?.text || '';

            if (!finalReport || finalReport.trim().length < 100) {
                console.warn(`[DeepResearch] Report too short (${finalReport?.length || 0} chars)`);
                throw new Error('Deep Research returned an unusually short report');
            }

            console.log(`[DeepResearch] Completed. Report: ${finalReport.length} chars`);

            yield {
                type: 'done',
                content: finalReport.trim(),
                isComplete: true,
            };
            return;
        }

        if (currentStatus === 'failed' || currentStatus === 'cancelled') {
            console.error(`[DeepResearch] Ended with status: ${currentStatus}`);
            throw new Error(`Deep Research ${currentStatus}`);
        }

        // Otherwise (in_progress, requires_action, etc.) — keep polling
    }
}

