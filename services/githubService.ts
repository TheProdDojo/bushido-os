/**
 * GitHub Connection Service
 * Manages GitHub App connection state and API interactions
 */

import { SyncEvent, saveSyncEvent } from './storageService';
import { StageType } from '../types';

// Types
export interface GitHubConnection {
    isConnected: boolean;
    user?: {
        login: string;
        id: number;
        avatar_url: string;
    };
    installations: GitHubInstallation[];
    connectedAt?: string;
    selectedRepo?: {
        owner: string;
        name: string;
        fullName: string;
    };
}

export interface GitHubInstallation {
    id: number;
    account: {
        login: string;
        id: number;
        type: string;
    };
    repository_selection: 'all' | 'selected';
}

export interface DriftAlert {
    id: string;
    projectId: string;
    repoFullName: string;
    commitSha: string;
    severity: 'minor' | 'major' | 'critical';
    affectedArtifacts: StageType[];
    reasoning: string;
    suggestedUpdates: SuggestedUpdate[];
    status: 'pending' | 'applied' | 'dismissed';
    createdAt: number;
}

export interface SuggestedUpdate {
    artifact: StageType;
    section: string;
    currentContent: string;
    suggestedContent: string;
    rationale: string;
}

const STORAGE_KEY = 'bushido_github_connection';

/**
 * Get the GitHub OAuth URL for initiating connection
 */
export function getGitHubOAuthUrl(projectId: string): string {
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
    const redirectUri = `${window.location.origin}/api/auth/github-callback`;

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: 'repo read:user',
        state: projectId, // Pass project ID to link connection
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

/**
 * Get the GitHub App installation URL
 */
export function getGitHubAppInstallUrl(): string {
    const appSlug = import.meta.env.VITE_GITHUB_APP_SLUG || 'bushidoos';
    return `https://github.com/apps/${appSlug}/installations/new`;
}

/**
 * Save GitHub connection to storage
 */
export function saveConnection(connection: GitHubConnection): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(connection));
}

/**
 * Load GitHub connection from storage
 */
export function loadConnection(): GitHubConnection {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error('Failed to load GitHub connection:', e);
    }

    return { isConnected: false, installations: [] };
}

/**
 * Clear GitHub connection
 */
export function clearConnection(): void {
    localStorage.removeItem(STORAGE_KEY);
}

/**
 * Handle OAuth callback data from URL
 */
export function handleOAuthCallback(): GitHubConnection | null {
    const params = new URLSearchParams(window.location.search);

    if (params.get('github_connected') === 'true') {
        const encodedData = params.get('connection_data');
        if (encodedData) {
            try {
                const data = JSON.parse(atob(encodedData));
                const connection: GitHubConnection = {
                    isConnected: true,
                    user: data.user,
                    installations: data.installations,
                    connectedAt: data.connectedAt,
                };
                saveConnection(connection);

                // Clean URL
                window.history.replaceState({}, '', window.location.pathname);

                return connection;
            } catch (e) {
                console.error('Failed to parse connection data:', e);
            }
        }
    }

    return null;
}

/**
 * Select a repository for syncing
 */
export function selectRepository(owner: string, name: string): void {
    const connection = loadConnection();
    connection.selectedRepo = {
        owner,
        name,
        fullName: `${owner}/${name}`,
    };
    saveConnection(connection);
}

/**
 * Map backend artifact names to StageType
 */
function mapArtifactToStageType(artifact: string): StageType | null {
    const mapping: Record<string, StageType> = {
        'spec.md': StageType.PRODUCT_SPEC,
        'architecture.md': StageType.SOLUTION_CONCEPT,
        'roadmap.md': StageType.EXECUTION_ROADMAP,
        'personas/primary_user.md': StageType.USER_PERSONA,
        'market': StageType.MARKET_ANALYSIS,
    };

    for (const [key, value] of Object.entries(mapping)) {
        if (artifact.toLowerCase().includes(key.toLowerCase())) {
            return value;
        }
    }

    return null;
}

/**
 * Process a drift alert from webhook response
 */
export async function processDriftAlert(
    projectId: string,
    analysisResult: any
): Promise<DriftAlert | null> {
    if (!analysisResult.analysis?.driftDetected) {
        return null;
    }

    const { analysis, metadata } = analysisResult;

    // Convert to SyncEvent for storage
    const syncEvent: SyncEvent = {
        id: crypto.randomUUID(),
        projectId,
        commitSha: metadata.commitSha,
        driftDetected: true,
        reasoning: analysis.reasoning,
        affectedArtifacts: analysis.affectedArtifacts
            .map(mapArtifactToStageType)
            .filter((s): s is StageType => s !== null),
        suggestedUpdates: analysis.suggestedUpdates.reduce((acc: Record<string, string>, update: any) => {
            const stageType = mapArtifactToStageType(update.artifact);
            if (stageType) {
                acc[stageType] = update.suggestedContent;
            }
            return acc;
        }, {}),
        status: 'pending',
        timestamp: Date.now(),
    };

    await saveSyncEvent(syncEvent);

    return {
        id: syncEvent.id,
        projectId,
        repoFullName: metadata.repoFullName,
        commitSha: metadata.commitSha,
        severity: analysis.severity,
        affectedArtifacts: syncEvent.affectedArtifacts,
        reasoning: analysis.reasoning,
        suggestedUpdates: analysis.suggestedUpdates.map((u: any) => ({
            artifact: mapArtifactToStageType(u.artifact),
            section: u.section,
            currentContent: u.currentContent,
            suggestedContent: u.suggestedContent,
            rationale: u.rationale,
        })).filter((u: any) => u.artifact !== null),
        status: 'pending',
        createdAt: Date.now(),
    };
}
