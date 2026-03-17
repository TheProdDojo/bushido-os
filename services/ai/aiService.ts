import { streamText, generateText, generateObject, streamObject } from 'ai';
import { AIConfig, StreamUpdate } from './types';
import { createTavilyTool } from './tools/tavily';
import { StageType, STAGE_CONFIG, Artifact, ChatMessage } from '../../types';
import { z } from 'zod';
import { canGenerate, incrementUsage, getRemainingGenerations, getDeviceId } from '../usageService';

// Neural Engine V2 Imports
import { NeuralRouter } from './neuralRouter';
import { ModelRegistry } from './modelRegistry';
import { RateLimitManager } from './rateLimitManager';
import { DeepSeekParser } from './deepSeekParser';
import { ArtifactValidator } from './artifactValidator';
import { CostTracker } from './costTracker';
import { MODEL_SPECS } from './neural-engine';
import { StreamParser } from './streamParser';
import { runDeepResearch } from './interactionsClient';

// Universal env helper — works in both Vite (browser) and Node.js (CLI)
const getEnv = (key: string): string | undefined => {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        return import.meta.env[key];
    }
    if (typeof process !== 'undefined' && process.env) {
        return process.env[key];
    }
    return undefined;
};

// Polyfill
type CoreMessage = { role: 'user' | 'assistant' | 'system'; content: string };

/**
 * Check if we should use the hosted proxy (free tier)
 */
const shouldUseHostedProxy = (config: AIConfig): boolean => {
    // If we have any of our own V2 keys configured, we don't need the proxy
    // unless we are specifically in a "Free Mode" that maps to proxy.
    // For now, if Neural Router returns a valid generic key (like OpenAI/DeepSeek), we use it.
    // This existing helper checked for specific config.apiKey.
    // In V2, we rely on enviroment variables mostly.

    // Legacy support: if config.apiKey is explicitly provided by user, use it.
    if (config.apiKey) return false;

    // If env vars are present, we don't need proxy.
    if (getEnv('VITE_GEMINI_API_KEY') || getEnv('VITE_OPENAI_API_KEY') || getEnv('VITE_DEEPSEEK_API_KEY')) {
        return false;
    }

    return config.provider !== 'ollama';
};

/**
 * Call the hosted proxy for free tier users
 */
async function* callHostedProxy(
    endpoint: string,
    body: Record<string, unknown>
): AsyncGenerator<StreamUpdate, void, unknown> {
    const deviceId = getDeviceId();

    if (!canGenerate()) {
        yield {
            type: 'error' as const,
            content: `Daily limit reached (${getRemainingGenerations()} remaining). Add API keys for unlimited access.`,
        };
        return;
    }

    try {
        const response = await fetch(`/api/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...body, deviceId }),
        });

        if (!response.ok) throw new Error(`Proxy error: ${response.status}`);

        incrementUsage();

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') continue;
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.text) yield { type: 'text' as const, content: parsed.text };
                    } catch {
                        yield { type: 'text' as const, content: data };
                    }
                }
            }
        }
        yield { type: 'done' as const, content: '' };
    } catch (error) {
        yield { type: 'error' as const, content: error instanceof Error ? error.message : 'Proxy request failed' };
    }
}

/**
 * Phase 1: Deep Research Planning
 * Generates a research plan organized by the 5 Bushido Pillars.
 */

// Helper: Parse <pillar> XML tags from AI response
function parsePillarsFromText(text: string): { stage: string; label: string; goals: string[] }[] {
    const pillarRegex = /<pillar\s+name="([^"]+)">([\s\S]*?)<\/pillar>/gi;
    const pillars: { stage: string; label: string; goals: string[] }[] = [];

    const LABEL_TO_STAGE: Record<string, string> = {
        'market analysis': 'MARKET_ANALYSIS',
        'user persona': 'USER_PERSONA',
        'user validation': 'USER_PERSONA',
        'solution concept': 'SOLUTION_CONCEPT',
        'solution architecture': 'SOLUTION_CONCEPT',
        'product spec': 'PRODUCT_SPEC',
        'product specification': 'PRODUCT_SPEC',
        'execution roadmap': 'EXECUTION_ROADMAP',
    };

    let match;
    while ((match = pillarRegex.exec(text)) !== null) {
        const label = match[1].trim();
        const body = match[2].trim();
        const goals = body.split('\n')
            .map(l => l.trim())
            .filter(l => l.length > 0 && (l.match(/^\d+\./) || l.startsWith('-')))
            .map(l => l.replace(/^\d+\.\s*/, '').replace(/^-\s*/, ''));

        const stageKey = LABEL_TO_STAGE[label.toLowerCase()] || 'MARKET_ANALYSIS';
        pillars.push({ stage: stageKey, label, goals });
    }
    return pillars;
}

export async function* generateDeepResearchPlan(
    idea: string,
    config: AIConfig
): AsyncGenerator<StreamUpdate, void, unknown> {

    const spec = NeuralRouter.selectModel(StageType.DEEP_RESEARCH);

    if (!NeuralRouter.isAvailable(spec, config)) {
        // Mock fallback with pillar structure
        yield { type: 'thinking', content: "", thought: "Initializing Bushido Neural Engine...", isComplete: false };
        await new Promise(r => setTimeout(r, 800));

        const mockPillars = [
            { stage: 'MARKET_ANALYSIS', label: 'Market Analysis', goals: [`Analyze market landscape and TAM/SAM/SOM for "${idea}"`, 'Identify top 5 competitors and their positioning'] },
            { stage: 'USER_PERSONA', label: 'User Persona', goals: ['Define primary target user demographics and pain points', 'Map user journey and key friction points'] },
            { stage: 'SOLUTION_CONCEPT', label: 'Solution Concept', goals: ['Draft value proposition canvas', 'Outline business model and revenue streams'] },
            { stage: 'PRODUCT_SPEC', label: 'Product Spec', goals: ['Define MVP feature set and acceptance criteria'] },
            { stage: 'EXECUTION_ROADMAP', label: 'Execution Roadmap', goals: ['Create Now/Next/Later prioritization framework'] },
        ];

        yield { type: 'thinking', content: "", thought: "Plan ready.", pillars: mockPillars, isComplete: true };
        return;
    }

    const model = ModelRegistry.create(spec, config);
    RateLimitManager.increment(spec);

    const prompt = `
    TOPIC: "${idea}"
    GOAL: Create a Deep Research Plan organized by the 5 Bushido Strategy Pillars.

    THE 5 PILLARS:
    1. Market Analysis - Problem validation, TAM/SAM/SOM, competitor landscape
    2. User Persona - Target user research, pain points, journey mapping
    3. Solution Concept - Value proposition, business model, strategy
    4. Product Spec - MVP features, technical feasibility, acceptance criteria
    5. Execution Roadmap - OKRs, prioritization, timeline planning

    PROTOCOL:
    1. First, REASON through the idea in <think>...</think> tags. Be self-reflective:
       - What makes this idea interesting or challenging?
       - What assumptions need to be validated?
       - Where are the biggest unknowns and risks?
       - What data would change your mind about viability?
       - What signals would indicate product-market fit?
    2. Then, for EACH pillar, generate 1-3 specific research goals.
    3. Output the plan using the XML format below.

    FORMAT (strict):
    <think>
    Your internal reasoning about the idea, its viability, key questions...
    </think>
    <pillar name="Market Analysis">
    1. First research goal for market analysis
    2. Second research goal
    </pillar>
    <pillar name="User Persona">
    1. First research goal for user persona
    </pillar>
    <pillar name="Solution Concept">
    1. First research goal
    </pillar>
    <pillar name="Product Spec">
    1. First research goal
    </pillar>
    <pillar name="Execution Roadmap">
    1. First research goal
    </pillar>
    `;

    try {
        const result = await streamText({
            model,
            system: "You are a Deep Research Planner for BushidoOS, a product strategy platform.",
            prompt,
        } as any);

        let accumulated = "";
        let insideThink = false;

        for await (const chunk of result.textStream) {
            accumulated += chunk;

            // Track <think> tags to only show reasoning thoughts
            if (accumulated.includes('<think>') && !accumulated.includes('</think>')) {
                insideThink = true;
            }
            if (accumulated.includes('</think>')) {
                insideThink = false;
            }

            // Only show clean reasoning text as thoughts, not raw XML
            if (insideThink) {
                // Strip the <think> tag and show clean reasoning
                const cleanChunk = chunk.replace(/<\/?think>/g, '').trim();
                if (cleanChunk) {
                    yield { type: 'thinking', content: "", thought: cleanChunk, isComplete: false };
                }
            }
        }

        // Parse pillars from accumulated response
        const pillars = parsePillarsFromText(accumulated);

        if (pillars.length > 0) {
            yield { type: 'thinking', content: "", thought: "Plan ready.", pillars, isComplete: true };
        } else {
            // Fallback: try to extract as flat list for backward compat
            yield { type: 'thinking', content: "", thought: accumulated, isComplete: true };
        }
    } catch (e) {
        console.error(e);
        yield { type: 'error', content: "", thought: "Error generating plan", isComplete: true };
    }
}

// Kept for compatibility but delegates to main function
export async function* generateDeepResearchPlanStream(
    idea: string,
    config: AIConfig
): AsyncGenerator<StreamUpdate, void, unknown> {
    yield* generateDeepResearchPlan(idea, config);
}


/**
 * Phase 2: Execute Deep Research (Hardened)
 * Executes the approved plan with robust extraction, source harvesting,
 * per-step progress, retry logic, and content validation.
 */

// Retry helper with exponential backoff
async function withRetry<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 2,
    baseDelayMs: number = 2000
): Promise<T> {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (e: any) {
            lastError = e;
            const isRetryable = e?.status === 429 || e?.code === 'ECONNRESET' ||
                e?.code === 'ETIMEDOUT' || e?.message?.includes('rate limit') ||
                e?.message?.includes('Too Many Requests');
            if (!isRetryable || attempt >= maxAttempts - 1) throw e;
            const delay = baseDelayMs * Math.pow(2, attempt);
            console.warn(`[Research] Retry ${attempt + 1}/${maxAttempts} after ${delay}ms:`, e.message);
            await new Promise(r => setTimeout(r, delay));
        }
    }
    throw lastError;
}

// Extract sources from Tavily tool call results in streamText steps
function harvestSources(steps: any[]): { title: string; uri: string }[] {
    const sources: { title: string; uri: string }[] = [];
    const seen = new Set<string>();

    for (const step of steps) {
        if (!step.toolResults) continue;
        for (const result of step.toolResults) {
            if (result.toolName !== 'webSearch' || !result.result) continue;
            const data = result.result;
            const results = data.results || data.organic || [];
            for (const r of results) {
                const uri = r.url || r.uri || r.link;
                const title = r.title || r.name || uri;
                if (uri && !seen.has(uri)) {
                    seen.add(uri);
                    sources.push({ title, uri });
                }
            }
        }
    }
    return sources;
}

export async function* executeDeepResearchStream(
    idea: string,
    plan: string[],
    config: AIConfig
): AsyncGenerator<StreamUpdate, void, unknown> {
    // --- Try Interactions API Deep Research first (Google only) ---
    const googleKey = getEnv('VITE_GOOGLE_API_KEY') || getEnv('VITE_GEMINI_API_KEY');
    if (googleKey) {
        try {
            console.log('[Research] Attempting Interactions API Deep Research...');
            yield* runDeepResearch(idea, googleKey);
            return; // Success — skip legacy flow
        } catch (e: any) {
            console.warn('[Research] Interactions API failed, falling back to legacy flow:', e.message || e);
            yield { type: 'thinking', content: '', thought: '⚠️ Deep Research agent unavailable, using legacy research...', isComplete: false };
        }
    }

    // --- Legacy Vercel AI SDK flow (fallback) ---
    const spec = NeuralRouter.selectModel(StageType.DEEP_RESEARCH);

    if (!NeuralRouter.isAvailable(spec, config)) {
        yield { type: 'error', content: "", thought: "Deep Research requires a valid API Key.", isComplete: true };
        return;
    }

    const tools: any = {};
    const tavilyKey = getEnv('VITE_TAVILY_API_KEY') || config.tavilyApiKey;
    if (tavilyKey) tools.webSearch = createTavilyTool(tavilyKey);

    // Yield per-step progress for plan visibility
    const totalSteps = plan.length;
    for (let i = 0; i < totalSteps; i++) {
        yield {
            type: 'thinking', content: "", isComplete: false,
            thought: `📋 Step ${i + 1}/${totalSteps}: ${plan[i]}`,
            progress: { current: i + 1, total: totalSteps, label: plan[i] }
        };
    }

    const prompt = `
    TOPIC: "${idea}"
    GOAL: Execute Deep Research based on the Approved Plan.
    
    APPROVED PLAN:
    ${plan.map((p, i) => `${i + 1}. ${p}`).join('\n')}
    
    PROTOCOL:
    1. EXECUTE: Use 'webSearch' to gather data for each plan step. Log current activity in thoughts.
    2. SYNTHESIZE: Write comprehensive report in <brief>...</brief>.
    
    Structure the Brief:
    - 🚨 Market Reality
    - ⚔️ Competitors
    - ⚠️ Risks
    - 💡 Opportunities
    
    IMPORTANT: Wrap your ENTIRE final report in <brief>...</brief> tags.
    `;

    try {
        const model = ModelRegistry.create(spec, config);
        RateLimitManager.increment(spec);

        const result = await streamText({
            model,
            system: "You are a Deep Research Agent. Execute the plan diligently. Always wrap your final report in <brief>...</brief> tags.",
            prompt,
            tools,
            maxSteps: 5,
        } as any);

        // State machine for <brief> extraction
        let fullOutput = "";
        let briefContent = "";
        let insideBrief = false;
        let briefComplete = false;

        for await (const chunk of result.textStream) {
            fullOutput += chunk;

            // State machine: track <brief> and </brief> tags
            if (!insideBrief) {
                const openIdx = fullOutput.indexOf('<brief>');
                if (openIdx !== -1) {
                    insideBrief = true;
                    // Extract content after <brief>
                    const afterOpen = fullOutput.slice(openIdx + 7);
                    const closeIdx = afterOpen.indexOf('</brief>');
                    if (closeIdx !== -1) {
                        // Complete brief found in one go
                        briefContent = afterOpen.slice(0, closeIdx);
                        briefComplete = true;
                    } else {
                        briefContent = afterOpen;
                    }
                }
            } else if (!briefComplete) {
                // We're inside <brief>, accumulate until </brief>
                const closeIdx = fullOutput.indexOf('</brief>');
                if (closeIdx !== -1) {
                    const openIdx = fullOutput.indexOf('<brief>');
                    briefContent = fullOutput.slice(openIdx + 7, closeIdx);
                    briefComplete = true;
                } else {
                    const openIdx = fullOutput.indexOf('<brief>');
                    briefContent = fullOutput.slice(openIdx + 7);
                }
            }

            // Yield thinking updates (show raw thoughts during execution)
            if (!insideBrief && chunk.trim()) {
                yield { type: 'thinking', content: "", thought: chunk.trim(), isComplete: false };
            }

            // Yield brief content as it grows
            if (insideBrief && briefContent) {
                yield { type: 'text', content: briefContent.trim(), isComplete: false };
            }

            if (briefComplete) break;
        }

        // KEY FIX: With multi-step tool use, textStream may be empty because
        // the model spent all steps making tool calls without producing text.
        // Strategy: try result.text → extract tool results → synthesis call.

        // Step 1: Try the aggregated text property
        if (fullOutput.trim().length === 0) {
            try {
                const aggregatedText = await result.text;
                if (aggregatedText && aggregatedText.trim().length > 0) {
                    console.log(`[Research] textStream was empty, but result.text has ${aggregatedText.trim().length} chars.`);
                    fullOutput = aggregatedText;
                }
            } catch (e) {
                console.warn('[Research] Could not read result.text:', e);
            }
        }

        // Extract <brief> if present in fullOutput
        if (fullOutput.trim().length > 0 && !briefContent) {
            const openIdx = fullOutput.indexOf('<brief>');
            if (openIdx !== -1) {
                const closeIdx = fullOutput.indexOf('</brief>');
                briefContent = closeIdx !== -1
                    ? fullOutput.slice(openIdx + 7, closeIdx)
                    : fullOutput.slice(openIdx + 7);
            } else {
                briefContent = fullOutput.trim();
            }
        }

        // Step 2: If still empty, extract search data from tool calls and run a synthesis call
        if (briefContent.trim().length < 100) {
            console.warn(`[Research] Brief too short (${briefContent.trim().length} chars). Attempting synthesis from tool results...`);

            try {
                // Try multiple ways to access step/tool data from the Vercel AI SDK
                let searchData = '';

                // Method A: Try result.response (available after stream completes)
                try {
                    const response = await result.response;
                    console.log('[Research] Response messages count:', response?.messages?.length || 0);

                    if (response?.messages) {
                        for (const msg of response.messages) {
                            // Extract text content from assistant messages
                            if (msg.role === 'assistant') {
                                if (typeof msg.content === 'string' && msg.content.trim()) {
                                    searchData += msg.content + '\n\n';
                                } else if (Array.isArray(msg.content)) {
                                    for (const part of msg.content) {
                                        if (part.type === 'text' && part.text?.trim()) {
                                            searchData += part.text + '\n\n';
                                        }
                                    }
                                }
                            }
                            // Extract tool results
                            if (msg.role === 'tool') {
                                if (Array.isArray(msg.content)) {
                                    for (const part of msg.content) {
                                        if (part.type === 'tool-result') {
                                            const data = (part as any).result || (part as any).content;
                                            if (!data) continue;
                                            if (typeof data === 'string') {
                                                searchData += data + '\n\n';
                                            } else if (typeof data === 'object') {
                                                if (data.answer) searchData += `Search Answer: ${data.answer}\n\n`;
                                                const results = data.results || data.organic || [];
                                                for (const r of results) {
                                                    const title = r.title || '';
                                                    const content = r.content || r.snippet || '';
                                                    const url = r.url || r.uri || '';
                                                    if (content) searchData += `[${title}](${url}): ${content}\n\n`;
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                } catch (respErr) {
                    console.warn('[Research] Could not access result.response:', respErr);
                }

                // Method B: Try result.steps (legacy fallback)
                if (searchData.trim().length < 50) {
                    try {
                        const steps = await (result as any).steps;
                        console.log('[Research] Steps available:', Array.isArray(steps) ? steps.length : typeof steps);

                        if (steps && Array.isArray(steps)) {
                            for (const step of steps) {
                                if (step.text && step.text.trim()) {
                                    searchData += step.text + '\n\n';
                                }
                                if (step.toolResults) {
                                    for (const tr of step.toolResults) {
                                        if (!tr.result) continue;
                                        const data = tr.result;
                                        if (data.answer) searchData += `Search Answer: ${data.answer}\n\n`;
                                        const results = data.results || data.organic || [];
                                        for (const r of results) {
                                            const title = r.title || '';
                                            const content = r.content || r.snippet || '';
                                            const url = r.url || r.uri || '';
                                            if (content) searchData += `[${title}](${url}): ${content}\n\n`;
                                        }
                                    }
                                }
                            }
                        }
                    } catch (stepsErr) {
                        console.warn('[Research] Could not access result.steps:', stepsErr);
                    }
                }

                // If we harvested search data, make a synthesis call
                if (searchData.trim().length > 50) {
                    console.log(`[Research] Harvested ${searchData.trim().length} chars of search data. Running synthesis call...`);
                    yield { type: 'thinking', content: "", thought: "Synthesizing research findings...", isComplete: false };

                    const synthesisResult = await generateText({
                        model,
                        system: "You are a research synthesis agent. Compile the provided search results into a structured research brief.",
                        prompt: `
TOPIC: "${idea}"

SEARCH RESULTS:
${searchData.substring(0, 30000)}

TASK: Write a comprehensive research brief structured as:
## 🚨 Market Reality
## ⚔️ Competitors
## ⚠️ Risks
## 💡 Opportunities

Use concrete data, numbers, and findings from the search results. Be thorough.`,
                    });

                    if (synthesisResult.text && synthesisResult.text.trim().length > 100) {
                        briefContent = synthesisResult.text.trim();
                        console.log(`[Research] Synthesis produced ${briefContent.length} chars.`);
                    }
                } else {
                    console.warn(`[Research] No search data to synthesize (${searchData.trim().length} chars). Trying direct generation...`);
                }
            } catch (e) {
                console.error('[Research] Synthesis fallback failed:', e);
            }
        }

        // Step 3: Ultimate fallback — generate a research brief directly (no tools)
        if (briefContent.trim().length < 100) {
            console.log('[Research] All tool-based approaches failed. Running direct generation...');
            yield { type: 'thinking', content: "", thought: "Generating research brief directly...", isComplete: false };

            try {
                const directResult = await generateText({
                    model,
                    system: "You are a market research analyst. Generate detailed, data-informed research based on your training knowledge.",
                    prompt: `
TOPIC: "${idea}"

RESEARCH PLAN:
${plan.map((p, i) => `${i + 1}. ${p}`).join('\n')}

TASK: Write a comprehensive research brief covering this topic. Structure it as:

## 🚨 Market Reality
Analyze the market size, trends, growth projections, and key data points.

## ⚔️ Competitors
Identify key players, their strengths, weaknesses, and positioning.

## ⚠️ Risks
Describe major threats, regulatory concerns, and market barriers.

## 💡 Opportunities
Highlight gaps in the market, emerging trends, and untapped segments.

Be specific with data points, percentages, and concrete findings. Write at least 1000 words.`,
                });

                if (directResult.text && directResult.text.trim().length > 100) {
                    briefContent = directResult.text.trim();
                    console.log(`[Research] Direct generation produced ${briefContent.length} chars.`);
                }
            } catch (directErr) {
                console.error('[Research] Direct generation also failed:', directErr);
            }
        }

        if (briefContent.trim().length < 100) {
            console.warn('[Research] Brief too short after all fallbacks. UI will show execution failure.');
        }

        // Harvest sources from Tavily tool call results
        const harvestedSources: { title: string; uri: string }[] = [];
        try {
            const steps = await (result as any).steps;
            if (steps && Array.isArray(steps)) {
                harvestedSources.push(...harvestSources(steps));
            }
        } catch (e) {
            console.warn('[Research] Could not harvest sources from tool calls:', e);
        }

        // Yield final result with sources
        yield {
            type: 'done',
            content: briefContent.trim(),
            isComplete: true,
            sources: harvestedSources.length > 0 ? harvestedSources : undefined
        };

        // Cost tracking
        try {
            const usage = await result.usage;
            CostTracker.track('PROJECT', 'DEEP_RESEARCH', spec, usage.inputTokens || 0, usage.outputTokens || 0);
        } catch (e) {
            console.warn('[Research] Cost tracking failed:', e);
        }

    } catch (e: any) {
        console.error('[Research] Execution failed:', e);
        const message = e?.status === 429
            ? "Rate limited. Please wait a moment and try again."
            : e?.message || "Error in research stream";
        yield { type: 'error', content: "", thought: message, isComplete: true };
    }
}

async function* mockDeepResearchStream(idea: string): AsyncGenerator<StreamUpdate, void, unknown> {
    yield { type: 'thinking', content: "", thought: "Initializing Bushido Neural Engine...", isComplete: false };
    await new Promise(r => setTimeout(r, 800));
    yield { type: 'thinking', content: "", thought: `PLAN: 1. Analyze market landscape for "${idea}"`, isComplete: false };
    await new Promise(r => setTimeout(r, 1000));
    yield { type: 'done', content: `# Mock Analysis for ${idea}\n(Add API keys to enable real research)`, isComplete: true };
}

import { createArtifactTool } from './tools/artifactTool';

/**
 * Universal Artifact Generator with Relay Routing
 */
export async function* generateStageDraftStream(
    stage: StageType,
    idea: string,
    contextArtifacts: Record<StageType, Artifact>,
    config: AIConfig,
    researchBrief?: string
): AsyncGenerator<StreamUpdate, void, unknown> {

    // 1. Select Model via Router
    let spec = NeuralRouter.selectModel(stage);

    if (!NeuralRouter.isAvailable(spec)) {
        // Fallback to Mock
        yield { type: 'error', content: "No available AI models. Please check your settings/keys.", isComplete: true };
        return;
    }

    yield { type: 'thinking', content: "", thought: `Routing to ${spec.label}...`, isComplete: false };

    let model = ModelRegistry.create(spec);
    RateLimitManager.increment(spec);

    // 2. Build Context (Table of Contents Approach)
    let contextSummary = `Idea: ${idea}\n\nAVAILABLE CONTEXT (Use 'readArtifact' tool to see full content):\n`;

    // Add Research Brief as a special artifact if present
    if (researchBrief) {
        contextSummary += `- RESEARCH BRIEF (Provided in prompt below)\n`;
    }

    Object.values(contextArtifacts).forEach(a => {
        const label = STAGE_CONFIG[a.type].label;
        const preview = a.content ? a.content.substring(0, 200).replace(/\n/g, ' ') + "..." : "(Empty)";
        contextSummary += `- ${a.type} (${label}): ${preview}\n`;
    });

    const specificReqs = STAGE_CONFIG[stage].description;

    // Market Analysis-specific prompt addendum
    const marketAnalysisInstructions = stage === StageType.MARKET_ANALYSIS ? `
      MANDATORY SECTION STRUCTURE:
      Your output MUST include ALL of the following sections with these exact headings:
      ## 🚨 Market Reality
      - Problem validation, market size (TAM/SAM/SOM with numbers), growth trends
      ## ⚔️ Competitors
      - Top 5+ competitors, positioning matrix, strengths/weaknesses
      ## ⚠️ Risks
      - Regulatory, market, technical, and adoption risks
      ## 💡 Opportunities
      - Market gaps, emerging trends, untapped segments, timing advantages

      DATA REQUIREMENTS:
      - Include specific numbers, percentages, and dollar figures wherever possible
      - Reference the Research Brief data rather than inventing statistics
      - TAM/SAM/SOM must be explicitly quantified
    ` : '';

    // User Persona-specific prompt addendum
    const userPersonaInstructions = stage === StageType.USER_PERSONA ? `
      MANDATORY SECTION STRUCTURE:
      Your output MUST include ALL of the following sections with these exact headings:

      # Persona: [Name]
      - Give the persona a realistic name, age, and occupation

      ## Demographics
      - Age, location, income, education, family status
      - Technology comfort level and preferred devices

      ## Pain Points
      - 3-5 specific frustrations with the current solutions
      - Quantify impact where possible (time wasted, money lost)

      ## User Journey
      - Day-in-the-life scenario showing when/how they encounter the problem
      - Current workarounds and their limitations
      - Emotional state at each stage (frustrated, confused, resigned)

      ## Goals & Motivations
      - What success looks like for this persona
      - Willingness to pay and budget sensitivity

      ## Empathy Map
      - What they Think, Feel, Say, and Do related to this problem space

      REQUIREMENTS:
      - Reference the Market Analysis findings via the readArtifact tool
      - Be specific — avoid generic personas. Use realistic details.
      - Pain points should map directly to opportunities found in Market Analysis
    ` : '';

    // Solution Concept-specific prompt addendum
    const solutionConceptInstructions = stage === StageType.SOLUTION_CONCEPT ? `
      MANDATORY SECTION STRUCTURE:
      Your output MUST include ALL of the following sections with these exact headings:

      ## Core Value Proposition
      - What unique value does this product provide? What is the value proposition canvas?
      - Vision statement and strategic positioning

      ## Business Model
      - Revenue streams, pricing strategy, cost structure
      - Customer segments, channels, key partnerships

      ## SWOT Analysis
      - Strengths, Weaknesses, Opportunities, Threats in a structured format

      ## System Architecture
      - High-level technical architecture and component diagram
      - Include a Mermaid flowchart diagram showing key system components:
        \`\`\`mermaid
        flowchart TD
          A[Component] --> B[Component]
        \`\`\`

      REQUIREMENTS:
      - The Mermaid flowchart is MANDATORY — the artifact will fail validation without it
      - Reference upstream Market Analysis and User Persona data via the readArtifact tool
      - Be specific about revenue model and pricing — no vague "freemium" without details
    ` : '';

    const stageInstructions = marketAnalysisInstructions || userPersonaInstructions || solutionConceptInstructions;

    // Execution Roadmap-specific prompt addendum
    const executionRoadmapInstructions = stage === StageType.EXECUTION_ROADMAP ? `
      MANDATORY SECTION STRUCTURE:
      Your output MUST include ALL of the following sections with these exact headings:

      ## OKRs (Objectives & Key Results)
      - Define 2-3 clear Objectives with 3-4 measurable Key Results each
      - Key Results must be specific and quantifiable (e.g., "Achieve 1000 DAU by Month 3")

      ## Now/Next/Later Prioritization
      - **Now (0-4 weeks):** MVP features and critical path items
      - **Next (1-3 months):** Growth features and infrastructure improvements
      - **Later (3-6 months):** Scale features and market expansion

      ## Milestones
      - Define 4-6 concrete milestones with target dates and deliverables
      - Each milestone should have clear success criteria

      ## Gantt Chart
      - Include a Mermaid Gantt chart showing the timeline:
        \`\`\`mermaid
        gantt
          title Project Timeline
          dateFormat YYYY-MM-DD
          section Phase 1
          Task Name :a1, 2024-01-01, 30d
        \`\`\`

      REQUIREMENTS:
      - The Mermaid Gantt chart is MANDATORY — the artifact will fail validation without it
      - Reference the Product Spec features when defining milestones
      - Use realistic timeframes based on the team size and complexity
      - Read upstream artifacts via the readArtifact tool for context
    ` : '';

    const allStageInstructions = stageInstructions || executionRoadmapInstructions;

    // Product Spec-specific prompt addendum (for structured output guidance)
    const productSpecInstructions = stage === StageType.PRODUCT_SPEC ? `
      STRUCTURED OUTPUT GUIDANCE:
      You are generating a strict JSON spec. Pay extra attention to:

      FEATURES:
      - Generate at least 5 features with clear user stories
      - Each feature MUST have 3+ specific, testable acceptance criteria
      - Assign realistic priorities: only 1-2 should be 'critical', rest 'high'/'medium'/'low'
      - Feature IDs should be descriptive (e.g., 'auth-login', 'dashboard-metrics')

      DATA MODEL (definitions.entities):
      - Define all core entities with their fields and types
      - Include relationships between entities in field descriptions

      API ENDPOINTS (apiEndpoints):
      - Define at least the core CRUD endpoints
      - Specify auth requirements for each endpoint

      NON-FUNCTIONAL REQUIREMENTS:
      - Include specific, measurable targets (not vague goals)
      - Cover performance, security, and scalability

      CONSTRAINTS:
      - techStack: list specific technologies, frameworks, and versions
      - codingStandards: list linting rules, naming conventions, testing requirements
      - excludedPatterns: list anti-patterns and forbidden approaches
    ` : '';

    // 3. Construct Prompt with Tool Instructions
    let prompt = `
      CONTEXT SUMMARY:
      ${contextSummary}

      ${researchBrief ? `RESEARCH BRIEF:\n${researchBrief}\n` : ''}

      TASK:
      Generate the **${STAGE_CONFIG[stage].label}**.
      
      CRITICAL INSTRUCTION:
      You have access to the project's context via the 'readArtifact' tool.
      Do NOT hallucinate details. If you need to know the Target Audience, read the 'userPersona' artifact.
      If you need the Feature List, read the 'productSpec'.
      
      REQUIREMENTS:
      ${specificReqs}
      ${allStageInstructions}
      ${productSpecInstructions}
      
      FORMAT:
      Markdown. Start with # Title.
      ${spec.hasThinkingTokens ? 'Start reasoning immediately.' : 'Use <thought> tags for reasoning.'}
    `;

    // 4. Generate Stream with Tools (with retry + escalation)
    const MAX_ATTEMPTS = 2;
    const ESCALATION_CHAIN = [
        MODEL_SPECS.GEMINI_FLASH,
        MODEL_SPECS.GEMINI_PRO,
        MODEL_SPECS.DEEPSEEK_R1,
    ];

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        try {
            // On retry, escalate to next available model
            if (attempt > 0) {
                const currentIdx = ESCALATION_CHAIN.findIndex(m => m.id === spec.id);
                const nextModels = ESCALATION_CHAIN.slice(currentIdx + 1);
                const escalatedSpec = nextModels.find(m => NeuralRouter.isAvailable(m));
                if (escalatedSpec) {
                    spec = escalatedSpec;
                    model = ModelRegistry.create(spec, config);
                    RateLimitManager.increment(spec);
                    yield { type: 'thinking', content: '', thought: `🔄 Retrying with ${spec.label} (attempt ${attempt + 1})...`, isComplete: false };
                } else {
                    yield { type: 'thinking', content: '', thought: `⚠️ No stronger model available for retry. Proceeding with current output.`, isComplete: false };
                    break; // Can't escalate further, exit retry loop
                }
            }

            // [New] Structured Output Path (with fallback for models that don't support response_format)
            if (STAGE_CONFIG[stage].isStructured) {
                try {
                    const { SpecZodSchema } = await import('../../types/beads');

                    yield { type: 'thinking', content: '', thought: 'Generating Structured JSON Spec...', isComplete: false };

                    const result = await streamObject({
                        model,
                        schema: SpecZodSchema,
                        prompt,
                    });

                    for await (const partialObject of result.partialObjectStream) {
                        const jsonString = JSON.stringify(partialObject, null, 2);
                        const content = `\`\`\`json\n${jsonString}\n\`\`\``;
                        yield { type: 'text', content, title: STAGE_CONFIG[stage].label, isComplete: false };
                    }

                    const finalObject = await result.object;
                    const finalContent = `\`\`\`json\n${JSON.stringify(finalObject, null, 2)}\n\`\`\``;

                    yield { type: 'done', content: finalContent, title: STAGE_CONFIG[stage].label, isComplete: true };

                    const usage = await result.usage;
                    CostTracker.track('PROJECT', stage, spec, usage?.inputTokens || 0, usage?.outputTokens || 0);
                    return;
                } catch (structuredErr: any) {
                    console.warn(`[NeuralEngine] Structured output not supported by ${spec.label}, falling back to text generation:`, structuredErr.message);
                    yield { type: 'thinking', content: '', thought: `Structured output unavailable, generating as markdown...`, isComplete: false };
                    // Fall through to text generation path below
                }
            }

            // [Existing] Text/Markdown Path
            const tools: any = {
                readArtifact: createArtifactTool(contextArtifacts)
            };

            // Add Tavily if needed
            const tavilyKey = getEnv('VITE_TAVILY_API_KEY') || config.tavilyApiKey;
            if (stage === StageType.MARKET_ANALYSIS && tavilyKey) {
                tools.webSearch = createTavilyTool(tavilyKey);
            }

            const result = await streamText({
                model,
                prompt,
                tools,
                maxSteps: 5, // Allow drill-down round trips
                onStepFinish: (step) => {
                    // Optional: Log tool calls or intermediate thoughts
                    if (step.toolCalls.length > 0) {
                        console.log(`[NeuralEngine] Tool used: ${step.toolCalls[0].toolName}`);
                    }
                }
            } as any);

            let aggregated = "";
            let title = "";
            const parser = new StreamParser();

            for await (const chunk of result.textStream) {
                const events = parser.parse(chunk);
                for (const event of events) {
                    if (event.type === 'thinking') {
                        yield { type: 'thinking', content: event.content || "", isComplete: false, thought: event.thought };
                    } else if (event.type === 'text') {
                        if (event.content) aggregated = event.content;
                        if (event.title) title = event.title;
                        yield { type: 'text', content: event.content || "", title: event.title || STAGE_CONFIG[stage].label, isComplete: false };
                    }
                }
            }

            // Fallback: If textStream was empty (model used all steps on tool calls),
            // try result.text which aggregates text across all steps
            if (aggregated.trim().length === 0) {
                try {
                    const aggregatedText = await result.text;
                    if (aggregatedText && aggregatedText.trim().length > 0) {
                        console.log(`[NeuralEngine] textStream was empty, result.text has ${aggregatedText.trim().length} chars.`);
                        aggregated = aggregatedText.trim();
                        // Try to extract title from the first heading
                        const titleMatch = aggregated.match(/^#\s+(.+)$/m);
                        if (titleMatch) title = titleMatch[1];
                    }
                } catch (e) {
                    console.warn('[NeuralEngine] Could not read result.text:', e);
                }
            }

            // 5. Validation & Escalation
            console.log('=== GENERATION DEBUG ===');
            console.log('Stage:', stage);
            console.log('Content length:', aggregated.length);
            console.log('Attempt:', attempt + 1);

            const validation = ArtifactValidator.validate(stage, aggregated);

            // Content length gate: if output is too short, retry with escalation
            if (aggregated.trim().length < 200 && attempt < MAX_ATTEMPTS - 1) {
                console.warn(`[NeuralEngine] Output too short (${aggregated.trim().length} chars) for ${stage}. Retrying...`);
                yield { type: 'thinking', content: '', thought: `⚠️ Output too short (${aggregated.trim().length} chars). Escalating to stronger model...`, isComplete: false };
                continue; // Retry with next model
            }

            // Validation gate: if critical sections missing, retry with escalation
            if (!validation.isValid && attempt < MAX_ATTEMPTS - 1) {
                const criticalErrors = validation.errors.filter(e =>
                    !e.toLowerCase().includes('too short') // min_length is separate
                );
                if (criticalErrors.length > 0) {
                    console.warn(`[NeuralEngine] Validation failed for ${stage} (attempt ${attempt + 1}):`, criticalErrors);
                    yield { type: 'thinking', content: '', thought: `⚠️ Missing sections: ${criticalErrors.join(', ')}. Escalating...`, isComplete: false };
                    continue; // Retry with next model
                }
            }

            // If still invalid after retries, surface warnings but proceed
            if (!validation.isValid) {
                console.warn(`[NeuralEngine] Validation Failed for ${stage}:`, validation.errors);
                const warningList = validation.errors.join(', ');
                yield { type: 'thinking', content: '', thought: `⚠️ Validation: ${warningList}`, isComplete: false };
            }

            yield { type: 'done', content: aggregated, title, isComplete: true };

            // Cost Tracking
            const textUsage = await result.usage;
            CostTracker.track('PROJECT', stage, spec, textUsage?.inputTokens || 0, textUsage?.outputTokens || 0);
            return; // Success — exit retry loop

        } catch (e: any) {
            console.error(`[NeuralEngine] Attempt ${attempt + 1} failed for ${stage}:`, e);
            if (attempt < MAX_ATTEMPTS - 1) {
                yield { type: 'thinking', content: '', thought: `⚠️ Generation failed: ${e.message || 'Unknown'}. Escalating to stronger model...`, isComplete: false };
                continue; // Retry with next model
            }
            // Final attempt failed — yield error
            yield { type: 'error', content: "", thought: `Generation failed after ${MAX_ATTEMPTS} attempts: ${e.message || 'Unknown error'}`, isComplete: true };
        }
    }
}

/**
 * Single-turn text generation (Consult, Refine, Audit)
 */
export const consultStrategy = async (
    stage: StageType,
    currentContent: string,
    userMessage: string,
    idea: string,
    config: AIConfig
): Promise<string> => {
    // Consult can use Chat/Reasoning model
    const spec = NeuralRouter.selectModel(stage);
    const model = ModelRegistry.create(spec);

    // ... prompt construction ...
    const prompt = `
    CONTEXT: "${idea}" - ${STAGE_CONFIG[stage].label}
    CONTENT: "${currentContent.substring(0, 10000)}..."
    QUESTION: "${userMessage}"
    `;

    const { text, usage } = await generateText({ model, prompt });
    CostTracker.track('PROJECT', 'CONSULT', spec, usage.inputTokens || 0, usage.outputTokens || 0);
    return text;
}

export const refineStageDraft = async (
    stage: StageType,
    currentContent: string,
    userInstruction: string,
    config: AIConfig
): Promise<string> => {
    // Refine uses Drafting/Refinement model (Cerebras/Groq)
    // We can ask Router, or force checks
    const spec = NeuralRouter.selectModel(stage);
    const model = ModelRegistry.create(spec);

    const prompt = `
    Refine ${STAGE_CONFIG[stage].label}.
    CONTENT: "${currentContent}"
    INSTRUCTION: "${userInstruction}"
    Return ONLY new markdown.
    `;

    const { text, usage } = await generateText({ model, prompt });
    CostTracker.track('PROJECT', 'REFINE', spec, usage.inputTokens || 0, usage.outputTokens || 0);
    return text;
};

// ... keep other helpers (audit, chatWithPersona, regenerate, etc) adapted similarly ...
export const auditStageDraft = async (
    stage: StageType,
    content: string,
    idea: string,
    config: AIConfig
): Promise<string> => {
    const spec = NeuralRouter.selectModel(stage);
    const model = ModelRegistry.create(spec);
    const prompt = `Audit ${STAGE_CONFIG[stage].label} for "${idea}". Content: ${content}. Provide Score(0-10), Strengths, Gaps.`;
    const { text, usage } = await generateText({ model, prompt });
    CostTracker.track('PROJECT', 'AUDIT', spec, usage.inputTokens || 0, usage.outputTokens || 0);
    return text;
}

export const chatWithPersona = async (
    personaContent: string,
    chatHistory: ChatMessage[],
    userMessage: string,
    config: AIConfig
): Promise<string> => {
    const spec = NeuralRouter.selectModel(StageType.USER_PERSONA);
    const model = ModelRegistry.create(spec, config);

    const messages: CoreMessage[] = chatHistory.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.text
    }));
    messages.push({ role: 'user', content: userMessage });

    // Extract persona name for more natural conversation
    const nameMatch = personaContent.match(/# Persona:\s*(.+)/i) || personaContent.match(/^#\s+(.+)/m);
    const personaName = nameMatch ? nameMatch[1].trim() : 'the target user';

    const { text, usage } = await generateText({
        model,
        messages: messages as any,
        system: `You are roleplaying as ${personaName}, a target user persona for product validation.

PERSONA PROFILE:
${personaContent.substring(0, 3000)}

RULES:
- Stay fully in character at all times. Speak in first person as this persona.
- Reference specific pain points, frustrations, habits, and goals from the profile above.
- Be honest about what you would and wouldn't pay for, what excites or bores you.
- Give realistic answers — don't be overly enthusiastic or agreeable.
- If asked about something outside the persona's knowledge or experience, say "I'm not sure about that" rather than making things up.
- Keep responses conversational and concise (2-4 sentences unless asked for detail).
- Never break character or acknowledge you are an AI.`
    });
    CostTracker.track('PROJECT', 'PERSONA_CHAT', spec, usage.inputTokens || 0, usage.outputTokens || 0);
    return text;
}

export const generateAgentPrompt = async (
    artifacts: Record<StageType, Artifact>,
    idea: string,
    targetAgent: string,
    config: AIConfig
): Promise<string> => {
    const spec = MODEL_SPECS.GEMINI_PRO; // Uses Gemini 2.5 Pro for master prompt
    const model = ModelRegistry.create(spec);
    const context = Object.values(artifacts).map(a => a.content).join('\n\n');
    const prompt = `Create ${targetAgent} prompt for "${idea}". Content: ${context}`;
    const { text, usage } = await generateText({ model, prompt });
    CostTracker.track('PROJECT', 'EXPORT_PROMPT', spec, usage.inputTokens || 0, usage.outputTokens || 0);
    return text;
}

export const regenerateDownstream = async (
    currentStage: StageType,
    currentContent: string,
    downstreamStages: StageType[],
    idea: string,
    config: AIConfig
): Promise<Record<string, { title: string; content: string }>> => {
    const spec = NeuralRouter.selectModel(currentStage);
    const model = ModelRegistry.create(spec);

    const prompt = `Regenerate downstream for "${idea}". Updated: ${currentContent}. Targets: ${downstreamStages.join(',')}`;
    const schema = z.object({
        userPersona: z.object({ title: z.string(), content: z.string() }).optional(),
        solutionConcept: z.object({ title: z.string(), content: z.string() }).optional(),
        productSpec: z.object({ title: z.string(), content: z.string() }).optional(),
        executionRoadmap: z.object({ title: z.string(), content: z.string() }).optional(),
    });

    const { object, usage } = await generateObject({ model, prompt, schema });
    CostTracker.track('PROJECT', 'REGENERATE', spec, usage.inputTokens || 0, usage.outputTokens || 0);
    return object;
}

export const refineSpecificSection = async (
    sectionTitle: string,
    sectionContent: string,
    instruction: string,
    fullContext: string,
    config: AIConfig
): Promise<string> => {
    // Refinement uses the drafting model (Cerebras/Groq)
    // We treat this similar to a generic draft refinement
    const spec = NeuralRouter.selectModel(StageType.PRODUCT_SPEC); // Heuristic
    const model = ModelRegistry.create(spec);

    const prompt = `
    TASK: Refine a specific section of a document.
    
    SECTION TITLE: "${sectionTitle}"
    CURRENT CONTENT: "${sectionContent}"
    
    INSTRUCTION: "${instruction}"
    
    RETURN ONLY the new content for this section. Do not include markdown fences around the block if possible, just the content.
    `;

    const { text, usage } = await generateText({ model, prompt });
    CostTracker.track('PROJECT', 'REFINE_SECTION', spec, usage.inputTokens || 0, usage.outputTokens || 0);
    return text;
};

export const runSupervisorCheck = async (
    specContent: string,
    codebase: any // Typed as CodebaseSummary in service but any here to avoid circ dep if needed
): Promise<any> => { // Returns DriftReport
    const spec = NeuralRouter.selectModel(StageType.PRODUCT_SPEC); // Use smart model for verification
    const model = ModelRegistry.create(spec);

    const prompt = `
    ROLE: You are the TAME Supervisor Agent (The Watchdog).
    TASK: Verify if the current codebase matches the Product Spec.
    
    PRODUCT SPECIFICATION:
    ${specContent.substring(0, 15000)}
    
    CURRENT CODEBASE STRUCTURE:
    ${codebase.structure}
    
    KEY FILE SAMPLES:
    ${JSON.stringify(codebase.keyFiles, null, 2)}
    
    INSTRUCTIONS:
    1. Compare the features in the Spec vs the Files existing.
    2. Check for "Drift": Are we missing core files? Are dependencies correct?
    3. Generate a Drift Report.
    `;

    // Dynamic import for Zod schema if I were to create one for DriftReport.
    // For now using inline Zod for speed in this tool call.
    const { z } = await import('zod');

    const schema = z.object({
        id: z.string(),
        timestamp: z.number(),
        projectId: z.string().optional(),
        score: z.number().min(0).max(100),
        status: z.enum(['aligned', 'drift_detected', 'critical_failure']),
        summary: z.string(),
        issues: z.array(z.object({
            id: z.string(),
            severity: z.enum(['critical', 'high', 'medium', 'low']),
            type: z.enum(['missing_file', 'signature_mismatch', 'logic_drift', 'extra_code']),
            message: z.string(),
            file: z.string().optional()
        })),
        recommendations: z.array(z.object({
            id: z.string(),
            issueIds: z.array(z.string()),
            action: z.enum(['create_file', 'update_file', 'delete_file', 'refactor']),
            description: z.string()
        }))
    });

    const { object, usage } = await generateObject({ model, prompt, schema });
    CostTracker.track('PROJECT', 'SUPERVISOR', spec, usage.inputTokens || 0, usage.outputTokens || 0);

    return {
        ...object,
        timestamp: Date.now() // Ensure fresh timestamp
    };
};

export const generatePersonaImage = async (content: string, config: AIConfig): Promise<string | null> => {
    // Extract key traits for image prompt
    const nameMatch = content.match(/# Persona:\s*(.+)/i) || content.match(/^#\s+(.+)/m);
    const ageMatch = content.match(/(?:age|aged?)\s*:?\s*(\d{1,2})/i);
    const genderMatch = content.match(/(?:gender|sex)\s*:?\s*(\w+)/i);

    const name = nameMatch ? nameMatch[1].trim() : 'a professional';
    const age = ageMatch ? ageMatch[1] : '30';
    const gender = genderMatch ? genderMatch[1].toLowerCase() : 'person';

    const imagePrompt = `Professional headshot portrait photo of ${name}, a ${age}-year-old ${gender}. Clean studio lighting, neutral background, friendly confident expression, business casual attire. Photorealistic, high quality.`;

    try {
        const googleKey = getEnv('VITE_GOOGLE_API_KEY') || getEnv('VITE_GEMINI_API_KEY');
        if (!googleKey) return null;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${googleKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    instances: [{ prompt: imagePrompt }],
                    parameters: { sampleCount: 1, aspectRatio: '1:1' },
                }),
            }
        );

        if (!response.ok) {
            console.warn('[PersonaImage] API error:', response.status);
            return null;
        }

        const data = await response.json();
        const base64 = data.predictions?.[0]?.bytesBase64Encoded;
        if (!base64) return null;

        return `data:image/png;base64,${base64}`;
    } catch (e) {
        console.warn('[PersonaImage] Generation failed:', e);
        return null;
    }
};
export const generateStrategyPodcast = async (idea: string, artifacts: any, config: AIConfig) => null;

