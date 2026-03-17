import { SpecSchema, PrdSchema, AlignmentReport } from '../../types/beads';

const SYNC_SERVER_URL = 'http://localhost:3001/api';

/**
 * Client for the Bushido "Beads" Persistence Layer
 * connects to local scripts/sync-server.js
 */
export const BeadClient = {
    /**
     * Read a bead (JSON file) from .bushido/
     */
    async read<T>(beadName: string): Promise<T | null> {
        try {
            const res = await fetch(`${SYNC_SERVER_URL}/bead?name=${beadName}`);
            if (!res.ok) {
                if (res.status === 404) return null;
                throw new Error(`Failed to read bead: ${res.statusText}`);
            }
            const data = await res.json();
            return JSON.parse(data.content);
        } catch (e) {
            console.warn(`[BeadClient] Could not read ${beadName}`, e);
            return null;
        }
    },

    /**
     * Write a bead to .bushido/
     */
    async write(beadName: string, content: any): Promise<void> {
        try {
            const body = {
                files: [{
                    path: `.bushido/${beadName}`,
                    content: JSON.stringify(content, null, 2)
                }]
            };

            const res = await fetch(`${SYNC_SERVER_URL}/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!res.ok) throw new Error(`Sync failed: ${res.statusText}`);
        } catch (e) {
            console.error(`[BeadClient] Failed to write ${beadName}`, e);
            throw e;
        }
    },

    /**
     * Read a source file from the project (for Foreman Audit)
     */
    async readFile(filePath: string): Promise<string | null> {
        try {
            const res = await fetch(`${SYNC_SERVER_URL}/read-file?path=${encodeURIComponent(filePath)}`);
            if (!res.ok) return null;
            const data = await res.json();
            return data.content;
        } catch (e) {
            console.warn(`[BeadClient] Could not read source file ${filePath}`, e);
            return null;
        }
    }
};
