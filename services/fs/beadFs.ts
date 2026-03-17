/**
 * Filesystem BeadClient — Direct fs read/write to .bushido/
 * 
 * Replaces the HTTP-based BeadClient for terminal/CLI usage.
 * No sync server needed — reads and writes directly to disk.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve project root (two levels up from services/fs/)
const ROOT_DIR = path.resolve(__dirname, '../../');
const BEADS_DIR = path.join(ROOT_DIR, '.bushido');

/**
 * Ensure .bushido/ directory (and optional subdirectories) exist.
 */
function ensureDir(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

export const BeadFs = {
    /**
     * Get the project root directory.
     */
    getRootDir: (): string => ROOT_DIR,

    /**
     * Get the .bushido directory path.
     */
    getBeadsDir: (): string => BEADS_DIR,

    /**
     * Read a bead (JSON file) from .bushido/
     */
    read: <T>(beadName: string): T | null => {
        try {
            const filePath = path.join(BEADS_DIR, beadName);
            if (!fs.existsSync(filePath)) return null;
            const content = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(content) as T;
        } catch (e) {
            console.warn(`[BeadFs] Could not read ${beadName}`, e);
            return null;
        }
    },

    /**
     * Write a bead to .bushido/
     */
    write: (beadName: string, content: any): void => {
        ensureDir(BEADS_DIR);
        const filePath = path.join(BEADS_DIR, beadName);
        // Ensure subdirectories exist (e.g., "history/spec.v1.json")
        ensureDir(path.dirname(filePath));
        const serialized = typeof content === 'string' 
            ? content 
            : JSON.stringify(content, null, 2);
        fs.writeFileSync(filePath, serialized);
    },

    /**
     * Write a text file to .bushido/ (for markdown artifacts)
     */
    writeText: (beadName: string, content: string): void => {
        ensureDir(BEADS_DIR);
        const filePath = path.join(BEADS_DIR, beadName);
        ensureDir(path.dirname(filePath));
        fs.writeFileSync(filePath, content);
    },

    /**
     * Read a source file from the project (for Foreman Audit).
     */
    readFile: (filePath: string): string | null => {
        try {
            const safePath = path.resolve(ROOT_DIR, filePath);
            if (!safePath.startsWith(ROOT_DIR)) return null;
            if (!fs.existsSync(safePath)) return null;
            return fs.readFileSync(safePath, 'utf-8');
        } catch (e) {
            console.warn(`[BeadFs] Could not read source file ${filePath}`, e);
            return null;
        }
    },

    /**
     * List all beads in .bushido/
     */
    list: (): string[] => {
        if (!fs.existsSync(BEADS_DIR)) return [];
        return fs.readdirSync(BEADS_DIR).filter(f => !f.startsWith('.'));
    },

    /**
     * Check if a bead exists.
     */
    exists: (beadName: string): boolean => {
        return fs.existsSync(path.join(BEADS_DIR, beadName));
    },

    /**
     * Write the .cursorrules file to project root.
     */
    writeCursorRules: (content: string): void => {
        fs.writeFileSync(path.join(ROOT_DIR, '.cursorrules'), content);
    },

    /**
     * Recursively scan project files for Foreman auditing.
     * Returns file paths relative to project root.
     */
    scanCodebase: (extensions: string[] = ['.ts', '.tsx', '.js', '.jsx']): string[] => {
        const results: string[] = [];
        const ignoreDirs = new Set(['node_modules', '.git', '.bushido', 'dist', '.next', 'coverage']);

        function walk(dir: string) {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (ignoreDirs.has(entry.name)) continue;
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    walk(fullPath);
                } else if (extensions.some(ext => entry.name.endsWith(ext))) {
                    results.push(path.relative(ROOT_DIR, fullPath));
                }
            }
        }

        walk(ROOT_DIR);
        return results;
    }
};
