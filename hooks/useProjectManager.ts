import { useState, useEffect, useRef, useCallback } from 'react';
import { ProjectState, ProjectMetadata, Artifact, StageType, ArtifactStatus } from '../types';
import { initStorage, listProjects, saveProject, deleteProject as dbDeleteProject, loadProject as dbLoadProject } from '../services/storageService';
import { syncBeadsToRepo } from '../services/beadsService';

const ACTIVE_PROJECT_KEY = 'bushido_active_project';

// Helper to create empty artifact
function createEmptyArtifact(type: StageType): Artifact {
    return {
        id: Math.random().toString(36).substr(2, 9),
        type,
        title: '',
        content: '',
        status: ArtifactStatus.PENDING,
        lastUpdated: Date.now()
    };
}

// Helper to create new project state
function createNewProjectState(idea: string): ProjectState {
    return {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        lastUpdated: Date.now(),
        isKickstarted: true,
        idea,
        researchBrief: '',
        artifacts: {
            [StageType.DEEP_RESEARCH]: createEmptyArtifact(StageType.DEEP_RESEARCH),
            [StageType.MARKET_ANALYSIS]: createEmptyArtifact(StageType.MARKET_ANALYSIS),
            [StageType.USER_PERSONA]: createEmptyArtifact(StageType.USER_PERSONA),
            [StageType.SOLUTION_CONCEPT]: createEmptyArtifact(StageType.SOLUTION_CONCEPT),
            [StageType.PRODUCT_SPEC]: createEmptyArtifact(StageType.PRODUCT_SPEC),
            [StageType.EXECUTION_ROADMAP]: createEmptyArtifact(StageType.EXECUTION_ROADMAP),
        }
    };
}

export const useProjectManager = () => {
    // Projects List is now just Metadata (Lightweight)
    const [projects, setProjects] = useState<ProjectMetadata[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Active Project is the Full State (Heavy)
    const [activeProject, setActiveProject] = useState<ProjectState | null>(null);
    const [isLoadingProject, setIsLoadingProject] = useState(false);

    // Ref for async access to metadata list
    const projectsRef = useRef(projects);
    projectsRef.current = projects;

    // Ref for active project (heavy)
    const activeProjectRef = useRef(activeProject);
    activeProjectRef.current = activeProject;

    // Load project metadata list on mount, then restore active project
    useEffect(() => {
        const load = async () => {
            await initStorage();
            const list = await listProjects();
            setProjects(list);
            setIsLoaded(true);

            // Restore active project from sessionStorage
            const savedId = sessionStorage.getItem(ACTIVE_PROJECT_KEY);
            if (savedId && list.some(p => p.id === savedId)) {
                setIsLoadingProject(true);
                try {
                    const fullProject = await dbLoadProject(savedId);
                    if (fullProject) {
                        setActiveProject(fullProject);
                    }
                } catch (e) {
                    console.error('Failed to restore active project', e);
                    sessionStorage.removeItem(ACTIVE_PROJECT_KEY);
                } finally {
                    setIsLoadingProject(false);
                }
            }
        };
        load();
    }, []);

    // CRUD Operations

    const createProject = useCallback(async (idea: string) => {
        const newProject = createNewProjectState(idea);

        // Optimistic UI update (add metadata to list)
        const { artifacts, ...metadata } = newProject;
        setProjects(prev => [metadata, ...prev]);

        // Set as active immediately (we have full state)
        setActiveProject(newProject);
        sessionStorage.setItem(ACTIVE_PROJECT_KEY, newProject.id);

        await saveProject(newProject);
        return newProject;
    }, []);

    const deleteProject = useCallback(async (id: string) => {
        setProjects(prev => prev.filter(p => p.id !== id));
        if (activeProject?.id === id) {
            setActiveProject(null);
            sessionStorage.removeItem(ACTIVE_PROJECT_KEY);
        }
        await dbDeleteProject(id);
    }, [activeProject]);

    const renameProject = useCallback(async (id: string, newName: string) => {
        setProjects(prev => prev.map(p => {
            if (p.id === id) {
                return { ...p, idea: newName, lastUpdated: Date.now() };
            }
            return p;
        }));

        // If it's the active project, update it fully
        if (activeProject?.id === id) {
            const updated = { ...activeProject, idea: newName, lastUpdated: Date.now() };
            setActiveProject(updated);
            await saveProject(updated);
        } else {
            // Otherwise we need to load it to save it properly? 
            // Or we need a patch capability in DB.
            // For now, let's load-save-unload or just assume we only rename active usually.
            // But from dashboard we can rename inactive.
            // Let's load the full project to save it safely to maintain consistency.
            const full = await import('../services/storageService').then(m => m.loadProject(id));
            if (full) {
                const updated = { ...full, idea: newName, lastUpdated: Date.now() };
                await saveProject(updated);
            }
        }
    }, [activeProject]);

    // Async Select Project (Lazy Load)
    const selectProject = useCallback(async (id: string) => {
        if (activeProject?.id === id) return; // Already active

        setIsLoadingProject(true);
        try {
            const fullProject = await dbLoadProject(id);
            if (fullProject) {
                setActiveProject(fullProject);
                sessionStorage.setItem(ACTIVE_PROJECT_KEY, id);
            } else {
                console.error(`Project ${id} not found in DB`);
            }
        } catch (e) {
            console.error("Failed to load project", e);
        } finally {
            setIsLoadingProject(false);
        }
    }, [activeProject]);

    // Update Full Project (Active Only)
    const updateProject = useCallback(async (project: ProjectState) => {
        // Update Active State
        setActiveProject(project);

        // Update Metadata List (Last Updated time might change)
        const { artifacts, ...metadata } = project;
        setProjects(prev => prev.map(p => (p.id === project.id ? metadata : p)));

        await saveProject(project);
    }, []);

    const clearActiveProject = useCallback(() => {
        setActiveProject(null);
        sessionStorage.removeItem(ACTIVE_PROJECT_KEY);
    }, []);

    // Helper for granular artifact updates
    const updateProjectArtifact = useCallback((projectId: string, type: StageType, updates: Partial<Artifact>) => {
        // We only support updating the ACTIVE project for now to keep things simple
        setActiveProject(prev => {
            if (!prev || prev.id !== projectId) return prev; // Should not happen if UI is correct

            const updatedProject = {
                ...prev,
                lastUpdated: Date.now(),
                artifacts: {
                    ...prev.artifacts,
                    [type]: { ...prev.artifacts[type], ...updates }
                }
            };

            // Async save to DB (don't await to block UI)
            saveProject(updatedProject).then(() => syncBeadsToRepo(updatedProject)).catch(console.error);

            // Also update metadata list for lastUpdated
            const { artifacts, ...metadata } = updatedProject;
            setProjects(list => list.map(p => p.id === projectId ? metadata : p));

            return updatedProject;
        });
    }, []);

    const updateProjectField = useCallback(async (projectId: string, field: keyof ProjectState, value: any) => {
        // Update active project if it matches
        if (activeProject?.id === projectId) {
            const updated = { ...activeProject, [field]: value, lastUpdated: Date.now() };
            await updateProject(updated);
        } else {
            // Updating inactive project field (uncommon but possible)
            const full = await import('../services/storageService').then(m => m.loadProject(projectId));
            if (full) {
                const updated = { ...full, [field]: value, lastUpdated: Date.now() };
                await saveProject(updated);

                // Update metadata list
                const { artifacts, ...metadata } = updated;
                setProjects(prev => prev.map(p => p.id === projectId ? metadata : p));
            }
        }
    }, [activeProject, updateProject]);

    return {
        projects, // Metadata only
        isLoaded,
        activeProject, // Full state
        isLoadingProject, // New loading state for lazy load
        createProject,
        deleteProject,
        renameProject,
        selectProject, // Replaces setActiveProjectId
        clearActiveProject,
        updateProject,
        updateProjectArtifact,
        updateProjectField,
        projectsRef,
        activeProjectRef
    };
};
