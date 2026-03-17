/**
 * Verification Service (The Watchdog)
 * Responsible for comparing "Business State" (Spec) vs "Actual State" (Code).
 * 
 * V2: Real filesystem scanning replaces the mock implementation.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SpecSchema } from '../types/beads';
import { CodebaseSummary, DriftReport } from '../types/supervisor';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../');

const IGNORE_DIRS = new Set([
    'node_modules', '.git', '.bushido', 'dist', '.next', 'coverage',
    '.vercel', '.turbo', '.cache', 'build'
]);

const SOURCE_EXTENSIONS = new Set([
    '.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.html', '.md'
]);

/**
 * Recursively scan the project directory and return a real CodebaseSummary.
 */
export async function scanCodebase(projectRoot?: string): Promise<CodebaseSummary> {
    const root = projectRoot || ROOT_DIR;
    const allFiles: string[] = [];

    function walk(dir: string) {
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (IGNORE_DIRS.has(entry.name)) continue;
                if (entry.name.startsWith('.') && entry.name !== '.cursorrules') continue;

                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    walk(fullPath);
                } else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
                    allFiles.push(path.relative(root, fullPath));
                }
            }
        } catch { /* permission errors, etc. */ }
    }

    walk(root);

    // Build directory tree
    const structure = allFiles
        .sort()
        .map(f => `  ${f}`)
        .join('\n');

    // Read key files (package.json, main entry points, config files)
    const KEY_FILES = [
        'package.json',
        'tsconfig.json',
        'vite.config.ts',
        '.cursorrules',
    ];

    // Also grab the first few component/service files for context
    const componentFiles = allFiles
        .filter(f => f.includes('components/') || f.includes('services/') || f.includes('types/'))
        .slice(0, 10);

    const filesToRead = [...KEY_FILES, ...componentFiles];
    const keyFiles: Record<string, string> = {};

    for (const file of filesToRead) {
        const fullPath = path.join(root, file);
        try {
            if (fs.existsSync(fullPath)) {
                const content = fs.readFileSync(fullPath, 'utf-8');
                // Truncate large files to prevent token overflow
                keyFiles[file] = content.length > 5000
                    ? content.substring(0, 5000) + '\n... (truncated)'
                    : content;
            }
        } catch { /* skip unreadable files */ }
    }

    return {
        structure: `Project Root: ${root}\nTotal Files: ${allFiles.length}\n\n${structure}`,
        keyFiles
    };
}

/**
 * Scan and return just the file list (for Foreman audit file selection)
 */
export function scanSourceFiles(
    projectRoot?: string,
    extensions: string[] = ['.ts', '.tsx', '.js', '.jsx']
): string[] {
    const root = projectRoot || ROOT_DIR;
    const results: string[] = [];

    function walk(dir: string) {
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (IGNORE_DIRS.has(entry.name)) continue;
                if (entry.name.startsWith('.') && entry.name !== '.cursorrules') continue;

                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    walk(fullPath);
                } else if (extensions.some(ext => entry.name.endsWith(ext))) {
                    results.push(path.relative(root, fullPath));
                }
            }
        } catch { /* skip */ }
    }

    walk(root);
    return results;
}

/**
 * Read a source file with safety limits
 */
export function readSourceFile(filePath: string, projectRoot?: string): string | null {
    const root = projectRoot || ROOT_DIR;
    try {
        const safePath = path.resolve(root, filePath);
        if (!safePath.startsWith(root)) return null;
        if (!fs.existsSync(safePath)) return null;

        const content = fs.readFileSync(safePath, 'utf-8');
        // Truncate very large files
        if (content.length > 10000) {
            return content.substring(0, 10000) + '\n... (truncated at 10,000 chars)';
        }
        return content;
    } catch {
        return null;
    }
}
