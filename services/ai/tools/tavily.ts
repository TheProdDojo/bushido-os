import { tool } from 'ai';
import { z } from 'zod';

/**
 * Browser-compatible Tavily Search Tool
 * Uses fetch API instead of Node.js SDK
 */
export const createTavilyTool = (apiKey: string) => {
    const parameters = z.object({
        query: z.string().describe('The search query efficiently focused on the topic'),
        max_results: z.number().optional().default(5),
        include_answer: z.boolean().optional().default(true),
    }).passthrough();

    return tool({
        description: 'Search the web for real-time information and sources.',
        inputSchema: parameters,
        execute: async (args: any) => {
            console.log("Tavily Tool Execute Args:", JSON.stringify(args, null, 2));

            // Robustly extract query from potential nested structures or misformatted args
            let query = args.query;
            let max_results = args.max_results || 5;
            let include_answer = args.include_answer ?? true;

            // Handle case where args might be wrapped in 'raw_input' or 'input' (seen in some model behaviors)
            if (!query && args.raw_input && typeof args.raw_input === 'object') {
                query = args.raw_input.query || args.raw_input.input;
                if (args.raw_input.max_results) max_results = args.raw_input.max_results;
                if (args.raw_input.include_answer !== undefined) include_answer = args.raw_input.include_answer;
            }
            if (!query && args.input && typeof args.input === 'object') {
                query = args.input.query;
            }
            // Handle case where generic 'input' field is used as the query string
            if (!query && typeof args.input === 'string') {
                query = args.input;
            }

            if (!query) {
                console.error("Tavily Error: Query parameter missing", args);
                return { results: [], answer: "Error: No search query provided." };
            }

            try {
                // Ensure parameters are valid
                const body = {
                    api_key: apiKey,
                    query: query,
                    include_answer: include_answer,
                    max_results: max_results,
                    // 'search_depth' sometimes causes issues if not 'basic' or 'advanced', defaulting to advanced implies cost.
                    // Removing implicit 'search_depth' unless needed, or making it flexible.
                    // Some docs say search_depth is optional.
                };

                const response = await fetch('https://api.tavily.com/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Tavily API error: ${response.status} - ${errorText}`);
                }

                const data = await response.json();
                return data;
            } catch (error) {
                console.error('Tavily Search Error:', error);
                // Return a graceful fallback instead of crashing the tool execution
                return {
                    results: [],
                    answer: "Search unavailable at the moment."
                };
            }
        },
    });
};
