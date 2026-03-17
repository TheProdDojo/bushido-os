import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['scripts/cli.ts'],
    outDir: 'dist',
    format: ['esm'],
    target: 'node18',
    platform: 'node',
    splitting: false,
    clean: true,
    dts: false,
    sourcemap: false,
    minify: false,
    // Keep these as external — they're too large to bundle
    // and users install them as dependencies
    external: [
        // AI SDKs
        '@ai-sdk/google',
        '@ai-sdk/openai',
        '@google/genai',
        '@tavily/core',
        'ai',
        // Supabase
        '@supabase/supabase-js',
        // MCP
        '@modelcontextprotocol/sdk',
        // Schema validation
        'zod',
        // These have native bindings or are Node built-ins
        'readline',
        'fs',
        'path',
        'url',
        'child_process',
        'crypto',
    ],
    // Banner to add shebang for direct execution
    banner: {
        js: '#!/usr/bin/env node',
    },
});
