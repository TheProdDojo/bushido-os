/**
 * Supabase Sync Service — Push and Pull .bushido/ artifacts to/from the cloud.
 * 
 * Uses Supabase Storage (bucket: "bushido-projects") to store project bundles.
 * Each project is identified by a slug derived from the spec title or project directory name.
 * 
 * Storage layout:
 *   bushido-projects/{project-slug}/spec.json
 *   bushido-projects/{project-slug}/strategy.md
 *   bushido-projects/{project-slug}/roast.json
 *   bushido-projects/{project-slug}/...
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const BUCKET_NAME = 'bushido-projects';

/**
 * Test connectivity to the Supabase project
 */
export async function testConnectivity(): Promise<{ ok: boolean; message: string }> {
    const url = process.env.VITE_SUPABASE_URL || '';
    const key = process.env.VITE_SUPABASE_ANON_KEY || '';

    if (!url || !key) {
        return { ok: false, message: 'Supabase not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local' };
    }

    const supabase = createClient(url, key);

    try {
        // Try a lightweight REST call (listing buckets is cheap)
        const { error } = await supabase.storage.listBuckets();
        if (error) {
            if (error.message.includes('fetch failed')) {
                return {
                    ok: false,
                    message: `Supabase project appears to be paused. Go to https://supabase.com/dashboard and restore the project "${url.split('//')[1]?.split('.')[0]}". Free-tier projects pause after inactivity.`
                };
            }
            return { ok: false, message: `Supabase error: ${error.message}` };
        }
        return { ok: true, message: 'Connected' };
    } catch (err: any) {
        if (err.message?.includes('fetch failed') || err.cause?.code === 'ENOTFOUND') {
            return {
                ok: false,
                message: `Cannot reach Supabase. The project may be paused — visit https://supabase.com/dashboard to restore it.`
            };
        }
        return { ok: false, message: `Connection error: ${err.message}` };
    }
}

export interface SyncResult {
    success: boolean;
    filesUploaded?: number;
    filesDownloaded?: number;
    conflicts?: string[];
    error?: string;
}

export interface SyncManifest {
    projectSlug: string;
    lastSync: string;
    files: { name: string; hash: string; size: number; modified: string }[];
}

/**
 * Create a Supabase client for CLI usage (using process.env)
 */
function createSupabaseClient(): SupabaseClient | null {
    const url = process.env.VITE_SUPABASE_URL || '';
    const key = process.env.VITE_SUPABASE_ANON_KEY || '';

    if (!url || !key) {
        return null;
    }

    return createClient(url, key);
}

/**
 * Generate a project slug from the spec title or directory name
 */
function getProjectSlug(bushidoDir: string): string {
    try {
        const specPath = path.join(bushidoDir, 'spec.json');
        if (fs.existsSync(specPath)) {
            const spec = JSON.parse(fs.readFileSync(specPath, 'utf-8'));
            if (spec.title) {
                return spec.title
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-|-$/g, '')
                    .substring(0, 50);
            }
        }
    } catch { /* fall through */ }

    // Fallback: use parent directory name
    return path.basename(path.dirname(bushidoDir)).toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

/**
 * Simple hash for conflict detection (content length + first 100 chars)
 */
function quickHash(content: string): string {
    let hash = 0;
    const str = `${content.length}:${content.substring(0, 200)}`;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return hash.toString(36);
}

/**
 * List all files in .bushido/ (non-recursive, excludes .local-storage.json)
 */
function listBeadFiles(bushidoDir: string): string[] {
    if (!fs.existsSync(bushidoDir)) return [];

    const IGNORE = new Set(['.local-storage.json', '.DS_Store']);
    const files: string[] = [];

    function walk(dir: string, prefix: string = '') {
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (IGNORE.has(entry.name)) continue;
                const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
                if (entry.isDirectory()) {
                    walk(path.join(dir, entry.name), relPath);
                } else {
                    files.push(relPath);
                }
            }
        } catch { /* skip */ }
    }

    walk(bushidoDir);
    return files;
}

/**
 * Ensure the storage bucket exists
 */
async function ensureBucket(supabase: SupabaseClient): Promise<boolean> {
    const { data: buckets } = await supabase.storage.listBuckets();
    if (buckets?.some(b => b.name === BUCKET_NAME)) return true;

    const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: false,
        fileSizeLimit: 10 * 1024 * 1024, // 10MB per file
    });

    if (error) {
        // Bucket might already exist (race condition) or we don't have permission to create
        console.warn(`[Sync] Could not create bucket: ${error.message}`);
        return false;
    }

    return true;
}

/**
 * PUSH: Upload local .bushido/ to Supabase Storage
 */
export async function pushToCloud(bushidoDir: string): Promise<SyncResult> {
    const supabase = createSupabaseClient();
    if (!supabase) {
        return { success: false, error: 'Supabase not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local' };
    }

    const slug = getProjectSlug(bushidoDir);
    const files = listBeadFiles(bushidoDir);

    if (files.length === 0) {
        return { success: false, error: 'No files found in .bushido/' };
    }

    await ensureBucket(supabase);

    let uploaded = 0;
    const errors: string[] = [];

    for (const file of files) {
        const filePath = path.join(bushidoDir, file);
        const storagePath = `${slug}/${file}`;

        try {
            const content = fs.readFileSync(filePath);
            const contentType = file.endsWith('.json') ? 'application/json' : 'text/plain';

            const { error } = await supabase.storage
                .from(BUCKET_NAME)
                .upload(storagePath, content, {
                    contentType,
                    upsert: true
                });

            if (error) {
                errors.push(`${file}: ${error.message}`);
            } else {
                uploaded++;
            }
        } catch (err: any) {
            errors.push(`${file}: ${err.message}`);
        }
    }

    // Save sync manifest locally
    const manifest: SyncManifest = {
        projectSlug: slug,
        lastSync: new Date().toISOString(),
        files: files.map(f => {
            const stat = fs.statSync(path.join(bushidoDir, f));
            const content = fs.readFileSync(path.join(bushidoDir, f), 'utf-8');
            return {
                name: f,
                hash: quickHash(content),
                size: stat.size,
                modified: stat.mtime.toISOString()
            };
        })
    };
    fs.writeFileSync(path.join(bushidoDir, '.sync-manifest.json'), JSON.stringify(manifest, null, 2));

    return {
        success: errors.length === 0,
        filesUploaded: uploaded,
        error: errors.length > 0 ? errors.join('; ') : undefined
    };
}

/**
 * PULL: Download .bushido/ from Supabase Storage
 */
export async function pullFromCloud(bushidoDir: string, projectSlug?: string): Promise<SyncResult> {
    const supabase = createSupabaseClient();
    if (!supabase) {
        return { success: false, error: 'Supabase not configured.' };
    }

    const slug = projectSlug || getProjectSlug(bushidoDir);

    // Recursively collect all files from the project folder
    async function listAllFiles(prefix: string): Promise<{ name: string; storagePath: string }[]> {
        const { data, error } = await supabase!.storage
            .from(BUCKET_NAME)
            .list(prefix, { limit: 200 });

        if (error || !data) return [];

        const results: { name: string; storagePath: string }[] = [];
        for (const entry of data) {
            if (entry.name === '.emptyFolderPlaceholder') continue;

            const fullPath = `${prefix}/${entry.name}`;
            // Supabase directories have id = null
            if (entry.id === null) {
                // It's a folder — recurse
                const nested = await listAllFiles(fullPath);
                results.push(...nested);
            } else {
                // It's a file — compute the relative name (strip the slug prefix)
                const relativeName = fullPath.replace(`${slug}/`, '');
                results.push({ name: relativeName, storagePath: fullPath });
            }
        }
        return results;
    }

    const allFiles = await listAllFiles(slug);

    if (allFiles.length === 0) {
        return { success: false, error: `No files found for project "${slug}" in cloud.` };
    }

    // Load local manifest for conflict detection
    let localManifest: SyncManifest | null = null;
    const manifestPath = path.join(bushidoDir, '.sync-manifest.json');
    try {
        if (fs.existsSync(manifestPath)) {
            localManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        }
    } catch { /* no manifest */ }

    if (!fs.existsSync(bushidoDir)) {
        fs.mkdirSync(bushidoDir, { recursive: true });
    }

    let downloaded = 0;
    const conflicts: string[] = [];
    const errors: string[] = [];

    for (const file of allFiles) {
        const localPath = path.join(bushidoDir, file.name);

        try {
            // Check for conflicts (local file modified since last sync)
            if (fs.existsSync(localPath) && localManifest) {
                const localContent = fs.readFileSync(localPath, 'utf-8');
                const localHash = quickHash(localContent);
                const manifestEntry = localManifest.files.find(f => f.name === file.name);

                if (manifestEntry && manifestEntry.hash !== localHash) {
                    // Local file was modified since last push — conflict
                    conflicts.push(file.name);
                    // Save local version as .local backup
                    fs.writeFileSync(`${localPath}.local`, localContent);
                }
            }

            // Download from cloud
            const { data, error } = await supabase.storage
                .from(BUCKET_NAME)
                .download(file.storagePath);

            if (error) {
                errors.push(`${file.name}: ${error.message}`);
                continue;
            }

            if (data) {
                const content = await data.text();
                // Ensure directory exists for nested files
                const dir = path.dirname(localPath);
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                fs.writeFileSync(localPath, content);
                downloaded++;
            }
        } catch (err: any) {
            errors.push(`${file.name}: ${err.message}`);
        }
    }

    // Update manifest after pull
    const pulledFiles = listBeadFiles(bushidoDir);
    const newManifest: SyncManifest = {
        projectSlug: slug,
        lastSync: new Date().toISOString(),
        files: pulledFiles.map(f => {
            try {
                const content = fs.readFileSync(path.join(bushidoDir, f), 'utf-8');
                const stat = fs.statSync(path.join(bushidoDir, f));
                return {
                    name: f,
                    hash: quickHash(content),
                    size: stat.size,
                    modified: stat.mtime.toISOString()
                };
            } catch {
                return { name: f, hash: '', size: 0, modified: '' };
            }
        })
    };
    fs.writeFileSync(manifestPath, JSON.stringify(newManifest, null, 2));

    return {
        success: errors.length === 0,
        filesDownloaded: downloaded,
        conflicts: conflicts.length > 0 ? conflicts : undefined,
        error: errors.length > 0 ? errors.join('; ') : undefined
    };
}

/**
 * Get the project slug for display purposes
 */
export function getSlug(bushidoDir: string): string {
    return getProjectSlug(bushidoDir);
}
