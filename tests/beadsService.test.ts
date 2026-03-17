
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { syncBeadsToRepo, BEADS_DIR, SPEC_FILE, CONTEXT_FILE, RULES_FILE } from '../services/beadsService';
import { ProjectState, StageType, ArtifactStatus } from '../types';

// Mock fetch
const fetchMock = vi.fn();
global.fetch = fetchMock;

// Sample Project Data
const mockProject: ProjectState = {
    id: 'test-project-123',
    idea: 'Test Project',
    lastUpdated: 1234567890,
    isKickstarted: true,
    researchBrief: 'Research content',
    artifacts: {
        [StageType.DEEP_RESEARCH]: {
            id: '1', type: StageType.DEEP_RESEARCH, title: 'Research', content: 'Research stuff', status: ArtifactStatus.COMPLETED, lastUpdated: 0
        },
        [StageType.MARKET_ANALYSIS]: {
            id: '2', type: StageType.MARKET_ANALYSIS, title: 'Market', content: 'Market stuff', status: ArtifactStatus.COMPLETED, lastUpdated: 0
        },
        [StageType.USER_PERSONA]: {
            id: '3', type: StageType.USER_PERSONA, title: 'Persona', content: 'Persona stuff', status: ArtifactStatus.COMPLETED, lastUpdated: 0
        },
        [StageType.SOLUTION_CONCEPT]: {
            id: '4', type: StageType.SOLUTION_CONCEPT, title: 'Solution', content: 'Solution stuff', status: ArtifactStatus.COMPLETED, lastUpdated: 0
        },
        [StageType.PRODUCT_SPEC]: {
            id: '5', type: StageType.PRODUCT_SPEC, title: 'Spec', content: 'Spec stuff', status: ArtifactStatus.COMPLETED, lastUpdated: 0
        },
        [StageType.EXECUTION_ROADMAP]: {
            id: '6', type: StageType.EXECUTION_ROADMAP, title: 'Roadmap', content: 'Roadmap stuff', status: ArtifactStatus.COMPLETED, lastUpdated: 0
        }
    }
};

describe('beadsService', () => {
    beforeEach(() => {
        fetchMock.mockClear();
        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'warn').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should send correct data to local sync server', async () => {
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true })
        });

        await syncBeadsToRepo(mockProject);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith('http://localhost:3001/api/sync', expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }));

        const body = JSON.parse(fetchMock.mock.calls[0][1].body);
        expect(body.files).toHaveLength(3);

        const specFile = body.files.find((f: any) => f.path === `${BEADS_DIR}/${SPEC_FILE}`);
        const contextFile = body.files.find((f: any) => f.path === `${BEADS_DIR}/${CONTEXT_FILE}`);
        const rulesFile = body.files.find((f: any) => f.path === RULES_FILE);

        expect(specFile).toBeDefined();
        expect(JSON.parse(specFile.content).title).toBe('Test Project');

        expect(contextFile).toBeDefined();
        expect(contextFile.content).toContain('# Project Strategy: Test Project');

        expect(rulesFile).toBeDefined();
        expect(rulesFile.content).toContain('# BushidoOS Generated Rules for Cursor');
    });

    it('should handle server errors gracefully', async () => {
        fetchMock.mockResolvedValueOnce({
            ok: false,
            status: 500
        });

        await syncBeadsToRepo(mockProject);

        expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to sync to local disk'));
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[Mock Commit] Writing'));
    });

    it('should handle network errors gracefully', async () => {
        fetchMock.mockRejectedValueOnce(new Error('Network Error'));

        await syncBeadsToRepo(mockProject);

        expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('SyncServer connection failed'), expect.any(Error));
    });
});
