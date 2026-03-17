/**
 * Storage Service for BushidoOS
 * IndexedDB-based persistence with Lazy Loading Architecture (v2)
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { ProjectState, ProjectMetadata, ProjectArtifacts, StageType } from '../types';

// Database schema definition
interface BushidoDBSchema extends DBSchema {
    projects: {
        key: string;
        value: ProjectMetadata; // Light metadata only
        indexes: { 'by-date': number };
    };
    project_artifacts: {
        key: string;
        value: { id: string; artifacts: ProjectArtifacts }; // Heavy content
    };
    syncHistory: {
        key: string;
        value: SyncEvent;
        indexes: { 'by-project': string; 'by-date': number };
    };
    builderScore: {
        key: string;
        value: BuilderScore;
    };
}

export interface SyncEvent {
    id: string;
    projectId: string;
    commitSha: string;
    driftDetected: boolean;
    reasoning: string;
    affectedArtifacts: StageType[];
    suggestedUpdates: Record<string, string>;
    status: 'pending' | 'applied' | 'dismissed';
    timestamp: number;
}

export interface BuilderScore {
    projectId: string;
    totalPoints: number;
    currentStreak: number;
    longestStreak: number;
    lastActivityDate: string;
    achievements: string[];
}

const DB_NAME = 'bushidoos-db';
const DB_VERSION = 2; // Bump version for migration
const LEGACY_KEY = 'bushidoProjects';

let dbInstance: IDBPDatabase<BushidoDBSchema> | null = null;

/**
 * Initialize and get database instance
 */
async function getDB(): Promise<IDBPDatabase<BushidoDBSchema>> {
    if (dbInstance) return dbInstance;

    dbInstance = await openDB<BushidoDBSchema>(DB_NAME, DB_VERSION, {
        async upgrade(db, oldVersion, newVersion, transaction) {
            // Version 1: Initial Schema
            if (oldVersion < 1) {
                // Projects store
                const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
                projectStore.createIndex('by-date', 'lastUpdated');

                // Sync history store
                const syncStore = db.createObjectStore('syncHistory', { keyPath: 'id' });
                syncStore.createIndex('by-project', 'projectId');
                syncStore.createIndex('by-date', 'timestamp');

                // Builder score store
                db.createObjectStore('builderScore', { keyPath: 'projectId' });
            }

            // Version 2: Split Metadata and Artifacts (Lazy Loading)
            if (oldVersion < 2) {
                const artifactsStore = db.createObjectStore('project_artifacts', { keyPath: 'id' });
                const projectStore = transaction.objectStore('projects');

                // Migrate existing data if coming from v1
                if (oldVersion === 1) {
                    console.log('[Storage] Migrating to v2 (Lazy Loading)...');
                    let cursor = await projectStore.openCursor();

                    while (cursor) {
                        const fullProject = cursor.value as any; // Cast to any to handle v1 structure
                        const { artifacts, ...metadata } = fullProject;

                        // 1. Update project store to only have metadata
                        await cursor.update(metadata);

                        // 2. Move artifacts to new store
                        await artifactsStore.put({ id: metadata.id, artifacts });

                        cursor = await cursor.continue();
                    }
                    console.log('[Storage] Migration complete.');
                }
            }
        }
    });

    return dbInstance;
}

/**
 * Migrate existing localStorage data to IndexedDB
 */
export async function migrateFromLocalStorage(): Promise<boolean> {
    const legacyData = localStorage.getItem(LEGACY_KEY);
    if (!legacyData) return false;

    try {
        const projects: ProjectState[] = JSON.parse(legacyData);
        // We use saveProject here which handles the split automatically now
        for (const p of projects) {
            await saveProject(p);
        }

        // Clear legacy storage after successful migration
        localStorage.removeItem(LEGACY_KEY);
        console.log(`Migrated ${projects.length} projects from localStorage to IndexedDB (v2)`);
        return true;
    } catch (e) {
        console.error('Migration failed:', e);
        return false;
    }
}

// ============================================
// Project Operations
// ============================================

/**
 * Save a project (Splits into Metadata and Artifacts)
 */
export async function saveProject(project: ProjectState): Promise<void> {
    const db = await getDB();
    const { artifacts, ...metadata } = project;

    const tx = db.transaction(['projects', 'project_artifacts'], 'readwrite');

    // Save Metadata (Light)
    await tx.objectStore('projects').put(metadata);

    // Save Artifacts (Heavy)
    await tx.objectStore('project_artifacts').put({
        id: project.id,
        artifacts
    });

    await tx.done;
}

/**
 * Load a project by ID (Joins Metadata and Artifacts)
 */
export async function loadProject(id: string): Promise<ProjectState | undefined> {
    const db = await getDB();
    const metadata = await db.get('projects', id);
    const artifactsWrapper = await db.get('project_artifacts', id);

    if (!metadata || !artifactsWrapper) return undefined;

    return {
        ...metadata,
        artifacts: artifactsWrapper.artifacts
    };
}

/**
 * List all projects (Metadata Only - Fast!)
 */
export async function listProjects(): Promise<ProjectMetadata[]> {
    const db = await getDB();
    const projects = await db.getAllFromIndex('projects', 'by-date');
    return projects.reverse(); // Most recent first
}

/**
 * Delete a project
 */
export async function deleteProject(id: string): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(['projects', 'project_artifacts'], 'readwrite');
    await tx.objectStore('projects').delete(id);
    await tx.objectStore('project_artifacts').delete(id);
    await tx.done;
}

// ============================================
// Sync History Operations
// ============================================
// (Unchanged from original code)

/**
 * Save a sync event
 */
export async function saveSyncEvent(event: SyncEvent): Promise<void> {
    const db = await getDB();
    await db.put('syncHistory', event);
}

/**
 * Get sync history for a project
 */
export async function getSyncHistory(projectId: string): Promise<SyncEvent[]> {
    const db = await getDB();
    return await db.getAllFromIndex('syncHistory', 'by-project', projectId);
}

/**
 * Update sync event status
 */
export async function updateSyncEventStatus(
    eventId: string,
    status: 'applied' | 'dismissed'
): Promise<void> {
    const db = await getDB();
    const event = await db.get('syncHistory', eventId);
    if (event) {
        event.status = status;
        await db.put('syncHistory', event);
    }
}

// ============================================
// Builder Score Operations
// ============================================
// (Unchanged from original code - logic remains identical as types didn't affect this)
// ... Keep logic same but re-implement function declarations ...

/**
 * Get or create builder score for a project
 */
export async function getBuilderScore(projectId: string): Promise<BuilderScore> {
    const db = await getDB();
    const existing = await db.get('builderScore', projectId);

    if (existing) return existing;

    // Create default score
    const defaultScore: BuilderScore = {
        projectId,
        totalPoints: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: '',
        achievements: []
    };

    await db.put('builderScore', defaultScore);
    return defaultScore;
}

/**
 * Add points and update streak
 */
export async function addPoints(
    projectId: string,
    points: number,
    achievement?: string
): Promise<BuilderScore> {
    const db = await getDB();
    const score = await getBuilderScore(projectId);

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Update streak
    if (score.lastActivityDate === yesterday) {
        score.currentStreak += 1;
    } else if (score.lastActivityDate !== today) {
        score.currentStreak = 1; // Reset streak if not consecutive
    }

    score.longestStreak = Math.max(score.longestStreak, score.currentStreak);
    score.totalPoints += points;
    score.lastActivityDate = today;

    if (achievement && !score.achievements.includes(achievement)) {
        score.achievements.push(achievement);
    }

    await db.put('builderScore', score);
    return score;
}

/**
 * Check if streak is broken (called on app load)
 */
export async function checkStreakStatus(projectId: string): Promise<{
    isBroken: boolean;
    daysInactive: number;
}> {
    const score = await getBuilderScore(projectId);

    if (!score.lastActivityDate) {
        return { isBroken: false, daysInactive: 0 };
    }

    const lastActive = new Date(score.lastActivityDate).getTime();
    const now = Date.now();
    const daysDiff = Math.floor((now - lastActive) / 86400000);

    return {
        isBroken: daysDiff > 1 && score.currentStreak > 0,
        daysInactive: daysDiff
    };
}

// ============================================
// Initialization
// ============================================

/**
 * Initialize storage service (call on app start)
 */
export async function initStorage(): Promise<void> {
    await getDB();
    // V1 Migration (LocalStorage -> IndexedDB) logic is handled by migrateFromLocalStorage
    // V2 Migration (Split Store) is handled by getDB().upgrade()
    await migrateFromLocalStorage();
}

