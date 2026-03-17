#!/usr/bin/env node

/**
 * BushidoOS CLI — Entry point for `npx bushido-os`
 * 
 * This file is the bin entry point. It:
 * 1. Loads .env.local from the user's current working directory
 * 2. Runs the CLI
 */

import { config as dotenvConfig } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env.local from the user's project directory (not the package dir)
const userDir = process.cwd();
dotenvConfig({ path: path.join(userDir, '.env.local') });
dotenvConfig({ path: path.join(userDir, '.env') });

// Run the CLI — try the bundled version first, fall back to tsx
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
    await import('../dist/cli.js');
} catch {
    // Fallback: run via tsx (development mode)
    const { execSync } = await import('child_process');
    const args = process.argv.slice(2).join(' ');
    execSync(`npx tsx ${path.join(__dirname, '../scripts/cli.ts')} ${args}`, {
        stdio: 'inherit',
        cwd: userDir,
        env: process.env
    });
}
