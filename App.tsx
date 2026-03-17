import React, { useState, useRef, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { CanvasHeader } from './components/CanvasHeader';
import { StageCard } from './components/StageCard';
import { EditModal } from './components/EditModal';
import { InterviewModal } from './components/InterviewModal';
import { AuditModal } from './components/AuditModal';
import { AgentExportModal } from './components/AgentExportModal';
import { ConfirmModal } from './components/ConfirmModal';
import { AudioPlayer } from './components/AudioPlayer';
import { Dashboard } from './components/Dashboard';
import { DeepResearchCanvas } from './components/DeepResearchCanvas';
import { ToastContainer, ToastMessage, ToastType } from './components/Toast';
import { GlobalSettingsPanel } from './components/GlobalSettingsPanel';
import { DriftAlertCard } from './components/DriftAlertCard';
import { RoastGateScreen } from './components/RoastGateScreen';
import { StrategyReviewScreen } from './components/StrategyReviewScreen';
import { PrdApprovalScreen } from './components/PrdApprovalScreen';
import { verifyAlignment } from './services/verificationService';
import { roastStrategy, StrategyRoastResult } from './services/ai/agents/roastService';
import { summarizeStrategy, evolveStrategy, assembleStrategyPackage } from './services/ai/strategyService';
import { generatePrd } from './services/ai/agents/productAgent';
import { ActionableRoastItem, PrdSchema, StrategyPackage } from './types/beads';
import { DriftReport } from './types/supervisor';
import { SyncStatus } from './components/SyncStatusBadge';
import { AIInsights } from './components/AIInsights';
import { ProjectState, Artifact, StageType, ArtifactStatus, STAGE_CONFIG, GenerationStep, ChatMessage, ResearchLog, ResearchPillar, Source } from './types';
import {
    generateStageDraftStream,
    regenerateDownstream,
    refineStageDraft,
    generatePersonaImage,
    auditStageDraft,
    generateAgentPrompt,
    refineSpecificSection,
    generateStrategyPodcast,
    consultStrategy,
    chatWithPersona,
    generateDeepResearchPlan,
    executeDeepResearchStream
} from './services/ai/aiService';
import { AIConfig } from './services/ai/types';
import { ArtifactValidator } from './services/ai/artifactValidator';
import { GitHubConnection, loadConnection, handleOAuthCallback, getGitHubOAuthUrl } from './services/githubService';
import { AuthModal } from './components/AuthModal';
import { signInWithGoogle, signInWithGitHub, signInWithEmail, signOut, getSession, onAuthStateChange, isSupabaseConfigured } from './services/authService';
import { User, Session } from '@supabase/supabase-js';
import { useCredits } from './services/creditService';
import { initStorage, listProjects, saveProject, deleteProject } from './services/storageService';
import { syncBeadsToRepo } from './services/beadsService';

// Helper defined outside component


import { useProjectManager } from './hooks/useProjectManager';

// ... imports

export default function App() {
    // --- HOOK: Project Management ---
    const {
        projects,
        activeProject,
        isLoadingProject, // New loading state
        selectProject,    // Replaces setActiveProjectId
        clearActiveProject,
        createProject,
        deleteProject,
        renameProject,
        updateProject,
        updateProjectArtifact,
        updateProjectField,
        projectsRef,
        activeProjectRef
    } = useProjectManager();

    // State: AI Configuration
    const [aiConfig, setAiConfig] = useState<AIConfig>(() => {
        try {
            const saved = localStorage.getItem('bushido_ai_config');
            // Default to Gemini (existing behavior)
            return saved ? JSON.parse(saved) : {
                provider: 'google',
                modelName: 'gemini-2.0-flash',
                apiKey: '' // Expect env var or user input
            };
        } catch (e) {
            return { provider: 'google', modelName: 'gemini-2.0-flash' };
        }
    });

    // State: Canvas & AI Interaction
    const [activeStage, setActiveStage] = useState<StageType>(() => {
        const saved = sessionStorage.getItem('bushido_active_stage');
        return (saved as StageType) || StageType.DEEP_RESEARCH;
    });
    const [loadingSteps, setLoadingSteps] = useState<GenerationStep[]>([]);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [editingArtifact, setEditingArtifact] = useState<Artifact | null>(null);
    const [isInterviewOpen, setIsInterviewOpen] = useState(false);

    // State: Deep Research (Zero-to-One Flow)
    // const [isResearching, setIsResearching] = useState(false); // Removed: Deep Research is now a proper stage
    const [researchLogs, setResearchLogs] = useState<ResearchLog[]>([]);
    const [researchPlan, setResearchPlan] = useState<string[]>([]);
    const [researchPillars, setResearchPillars] = useState<ResearchPillar[]>([]);
    const [researchContent, setResearchContent] = useState("");
    const [researchSources, setResearchSources] = useState<Source[]>([]);
    const [isResearchPlanning, setIsResearchPlanning] = useState(false); // New state
    const [pipelineError, setPipelineError] = useState<string | null>(null);

    // Refs for research state (needed to avoid stale closures in async handlers)
    const researchLogsRef = useRef(researchLogs);
    researchLogsRef.current = researchLogs;
    const researchPlanRef = useRef(researchPlan);
    researchPlanRef.current = researchPlan;
    const researchPillarsRef = useRef(researchPillars);
    researchPillarsRef.current = researchPillars;

    // State: Modals & Overlays
    const [auditContent, setAuditContent] = useState<string | null>(null);
    const [isAuditOpen, setIsAuditOpen] = useState(false);
    const [agentPrompt, setAgentPrompt] = useState<string>('');
    const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
    const [isGeneratingAgent, setIsGeneratingAgent] = useState(false);

    // Verification State
    const [driftReport, setDriftReport] = useState<DriftReport | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);

    const handleVerifyAlignment = async () => {
        if (!activeProject) return;
        setIsVerifying(true);
        try {
            const report = await verifyAlignment(activeProject);
            setDriftReport(report);
            if (report.score < 100) {
                addToast('warning', `Drift Detected: ${report.score}% Alignment`);
            } else {
                addToast('success', 'Project Aligned with Spec');
            }
        } catch (e) {
            console.error(e);
            addToast('error', 'Verification Failed');
        } finally {
            setIsVerifying(false);
        }
    };

    const [podcastAudio, setPodcastAudio] = useState<string | null>(null);
    const [isPodcastOpen, setIsPodcastOpen] = useState(false);

    // Strategy Pipeline State Machine
    const [pipelinePhase, setPipelinePhase] = useState<'canvas' | 'roast' | 'review' | 'prd'>('canvas');
    const [isRoastRunning, setIsRoastRunning] = useState(false);
    const [isEvolving, setIsEvolving] = useState(false);
    const [roastResult, setRoastResult] = useState<StrategyRoastResult | null>(null);
    const [strategySummaries, setStrategySummaries] = useState<Record<string, string> | null>(null);
    const [evolvedPillars, setEvolvedPillars] = useState<StageType[]>([]);
    const [generatedPrd, setGeneratedPrd] = useState<PrdSchema | null>(null);
    const [isGeneratingPrd, setIsGeneratingPrd] = useState(false);
    const [strategyPackage, setStrategyPackage] = useState<StrategyPackage | null>(null);

    // State: Regeneration Logic
    const [pendingRegeneration, setPendingRegeneration] = useState<{
        upstreamType: StageType;
        affectedTypes: StageType[];
        newContent: string;
    } | null>(null);

    // UI State
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false); // Toggle for AI Chat Sidebar/Overlay

    // GitHub Sync State
    const [githubConnection, setGithubConnection] = useState<GitHubConnection>(() => loadConnection());
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('disconnected');
    const SettingsOpen = useState(false); // Fixed variable name case if any
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Confirmation Modal State
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        confirmLabel: string;
        variant: 'danger' | 'warning';
        onConfirm: () => void;
    }>({ isOpen: false, title: '', message: '', confirmLabel: '', variant: 'danger', onConfirm: () => { } });

    const showConfirm = (opts: { title: string; message: string; confirmLabel: string; variant?: 'danger' | 'warning'; onConfirm: () => void }) => {
        setConfirmModal({ isOpen: true, variant: 'danger', ...opts });
    };
    const closeConfirm = () => setConfirmModal(prev => ({ ...prev, isOpen: false }));

    // Auth State
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authUser, setAuthUser] = useState<User | null>(null);
    const [authSession, setAuthSession] = useState<Session | null>(null);

    // Credits
    const { deduct } = useCredits();

    // Refs
    const abortControllerRef = useRef<AbortController | null>(null);
    const lastWelcomedUser = useRef<string | null>(null);

    // Removed local projectsRef and useEffect load logic as hook handles it

    useEffect(() => {
        localStorage.setItem('bushido_ai_config', JSON.stringify(aiConfig));
    }, [aiConfig]);

    // Restore research data when active project loads
    useEffect(() => {
        if (activeProject) {
            if (activeProject.researchLogs?.length) setResearchLogs(activeProject.researchLogs);
            if (activeProject.researchPlan?.length) setResearchPlan(activeProject.researchPlan);
            if (activeProject.researchPillars?.length) {
                setResearchPillars(activeProject.researchPillars);
            }
            // Restore planning mode if plan or pillars exist and no brief has been generated yet
            const hasPlanData = (activeProject.researchPillars?.length ?? 0) > 0 || (activeProject.researchPlan?.length ?? 0) > 0;
            const hasBrief = !!activeProject.artifacts?.[StageType.DEEP_RESEARCH]?.content;
            if (hasPlanData && !hasBrief) {
                setIsResearchPlanning(true);
                setActiveStage(StageType.DEEP_RESEARCH);
            }
        } else {
            setResearchLogs([]);
            setResearchPlan([]);
            setResearchPillars([]);
            setIsResearchPlanning(false);
        }
    }, [activeProject?.id]);

    // Persist activeStage to sessionStorage
    useEffect(() => {
        sessionStorage.setItem('bushido_active_stage', activeStage);
    }, [activeStage]);

    // GitHub OAuth callback handler
    useEffect(() => {
        const connectionFromCallback = handleOAuthCallback();
        if (connectionFromCallback) {
            setGithubConnection(connectionFromCallback);
            addToast('success', `Connected to GitHub as @${connectionFromCallback.user?.login}`);
        }
    }, []);

    // Supabase Auth and Toast logic (kept same)
    useEffect(() => {
        getSession().then(session => {
            setAuthSession(session);
            setAuthUser(session?.user ?? null);
            if (session?.user?.id) {
                lastWelcomedUser.current = session.user.id;
            }
        });

        const unsubscribe = onAuthStateChange((event, session) => {
            setAuthSession(session);
            setAuthUser(session?.user ?? null);
            if (event === 'SIGNED_IN') {
                setIsAuthModalOpen(false);
                const userId = session?.user?.id;
                if (userId && lastWelcomedUser.current !== userId) {
                    addToast('success', `Welcome, ${session?.user?.email || 'user'}!`);
                    lastWelcomedUser.current = userId;
                }
            } else if (event === 'SIGNED_OUT') {
                addToast('info', 'Signed out successfully');
                lastWelcomedUser.current = null;
            }
        });

        return () => unsubscribe();
    }, []);

    // Update sync status based on connection state
    useEffect(() => {
        if (!githubConnection.isConnected) {
            setSyncStatus('disconnected');
        } else if (githubConnection.selectedRepo) {
            setSyncStatus(driftReport && driftReport.score < 100 ? 'drift' : 'synced');
        } else {
            setSyncStatus('disconnected');
        }
    }, [githubConnection, driftReport]);

    // Toast Helper
    const addToast = (type: ToastType, message: string) => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts(prev => [...prev, { id, type, message }]);
    };

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    const addLoadingStep = (message: string) => {
        setLoadingSteps(prev => [...prev, { message, isActive: true, isComplete: false }]);
    };

    const completeLastStep = () => {
        setLoadingSteps(prev => {
            if (prev.length === 0) return prev;
            const newSteps = [...prev];
            newSteps[newSteps.length - 1] = { ...newSteps[newSteps.length - 1], isActive: false, isComplete: true };
            return newSteps;
        });
    };

    const addChatMessage = (role: 'user' | 'assistant', text: string) => {
        setChatHistory(prev => [...prev, {
            id: Math.random().toString(36).substr(2, 9),
            role,
            text,
            timestamp: Date.now()
        }]);
    };

    // --- PROJECT MANAGEMENT HANDLERS (Delegated to Hook) ---

    const handleSelectProject = (id: string) => {
        selectProject(id);
        // Reset view state
        setActiveStage(StageType.DEEP_RESEARCH);
        setLoadingSteps([]);
        setChatHistory([]);
        setIsMobileMenuOpen(false);
    };

    const handleBackToDashboard = () => {
        clearActiveProject();
    };

    const handleRenameProject = async (id: string, newName: string) => {
        await renameProject(id, newName);
        addToast('success', 'Project renamed.');
    };

    const handleDeleteProject = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        showConfirm({
            title: 'Delete Strategy',
            message: 'Are you sure you want to delete this strategy? All research, artifacts, and progress will be permanently lost.',
            confirmLabel: 'Delete',
            variant: 'danger',
            onConfirm: async () => {
                await deleteProject(id);
                if (activeProject?.id === id) {
                    handleBackToDashboard();
                }
                addToast('info', 'Project deleted.');
            }
        });
    };


    // --- GENERATION LOGIC ---

    const handleAbort = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            setIsLoading(false);
            // Don't clear isResearchPlanning — preserve plan data if it exists
            setLoadingSteps(prev => [...prev, { message: "Process stopped.", isActive: false, isComplete: true }]);
            addToast('info', 'Generation stopped.');
        }
    };

    const handleKickstart = async (idea: string) => {
        if (abortControllerRef.current) abortControllerRef.current.abort();
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        // CREDIT CHECK: PLANNING (Small cost or free? Let's treat it as part of Deep Research entry)
        // Cost: 2 Research Tokens for Planning
        if (!deduct({ researchTokens: 2 })) {
            addToast('error', 'Insufficient Research Tokens for planning.');
            return;
        }

        // 1. Create the new project via HOOK
        const newProject = await createProject(idea);

        setLoadingSteps([]);
        setChatHistory([]);
        setIsLoading(true);
        setActiveStage(StageType.DEEP_RESEARCH);
        setIsSidebarOpen(true);
        setIsResearchPlanning(true); // Enter Planning Mode

        try {
            // --- PLAN PHASE ---
            setResearchLogs([]);
            setResearchPlan([]);
            setResearchPillars([]);
            setResearchContent("");
            setResearchSources([]);

            // Generate Plan
            const planStream = generateDeepResearchPlan(idea, aiConfig);

            for await (const update of planStream) {
                if (signal.aborted) throw new Error("Aborted");

                // Display thinking process
                if (update.thought) {
                    setResearchLogs(prev => [...prev, {
                        id: Math.random().toString(),
                        type: 'thought',
                        message: update.thought!,
                        timestamp: Date.now()
                    }]);
                }

                // Check for pillar-structured plan from AI
                if (update.pillars && update.pillars.length > 0) {
                    const mapped: ResearchPillar[] = update.pillars.map(p => ({
                        stage: p.stage as StageType,
                        label: p.label,
                        goals: p.goals
                    }));
                    setResearchPillars(mapped);
                    // Also populate flat plan for backward compat
                    const flatItems = mapped.flatMap(p => p.goals.map(g => `[${p.label}] ${g}`));
                    setResearchPlan(flatItems);
                }

                // Fallback: parse flat plan from thought text
                if (!update.pillars && update.thought) {
                    try {
                        const thought = update.thought;
                        let items: string[] = [];

                        if (thought.includes('<plan>')) {
                            const content = thought.split('<plan>')[1].split('</plan>')[0];
                            items = content.split('\n')
                                .map(l => l.trim())
                                .filter(l => l.length > 0 && (l.match(/^\d+\./) || l.startsWith('-')));
                        } else if (thought.trim().startsWith('PLAN:')) {
                            items = thought.replace('PLAN:', '').split('\n')
                                .map(l => l.trim())
                                .filter(l => l.length > 0);
                        } else if (thought.match(/^\d+\./m)) {
                            items = thought.split('\n')
                                .map(l => l.trim())
                                .filter(l => l.match(/^\d+\./));
                        }

                        if (items.length > 0) {
                            setResearchPlan(items);
                        }
                    } catch (e) {
                        console.warn("Error parsing plan:", e);
                    }
                }
            }

            // Plan is ready. Waiting for user approval.
            setIsLoading(false); // Stop loading indicator, let user interact

            // Persist research data to project
            // Use a small delay to ensure React has flushed state updates to refs
            await new Promise(r => setTimeout(r, 100));
            const currentProject = activeProjectRef.current || newProject;
            if (currentProject) {
                const updated = {
                    ...currentProject,
                    researchLogs: researchLogsRef.current,
                    researchPlan: researchPlanRef.current,
                    researchPillars: researchPillarsRef.current,
                    lastUpdated: Date.now()
                };
                updateProject(updated);
            }

        } catch (e: any) {
            if (e.message !== "Aborted") {
                console.error("Planning failed", e);
                addToast('error', 'Failed to generate plan.');
                setIsResearchPlanning(false);
            }
        } finally {
            if (!signal.aborted) {
                // Keep abort controller? No, we might need a new one for execution.
                // Actually, if we stop loading, we resets abort controller?
                // Let's reset it.
                abortControllerRef.current = null;
            }
        }
    };

    const handleCancelResearch = () => {
        handleAbort();
        // Only exit planning mode if we have no plan data to show
        const hasPlanData = researchPillarsRef.current.length > 0 || researchPlanRef.current.length > 0;
        if (!hasPlanData) {
            setIsResearchPlanning(false);
        }
    };

    const handleRegeneratePlan = () => {
        if (!activeProject) return;
        // Clear old data and re-trigger plan generation
        setResearchLogs([]);
        setResearchPlan([]);
        setResearchPillars([]);
        setResearchContent("");
        setResearchSources([]);
        setPipelineError(null);
        setIsResearchPlanning(true);
        // Re-trigger planning by calling the kickstart flow for the existing idea
        handleKickstart(activeProject.idea);
    };

    const handleRevisePlan = async (instruction: string) => {
        if (!activeProject) return;

        // Abort existing plan stream if any
        if (abortControllerRef.current) abortControllerRef.current.abort();
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        // Clear old plan, keep logs visible during re-think
        setResearchPlan([]);
        setResearchPillars([]);
        setIsResearchPlanning(true);

        try {
            const revisedIdea = `${activeProject.idea}\n\nUser revision: ${instruction}`;
            const planStream = generateDeepResearchPlan(revisedIdea, aiConfig);

            for await (const update of planStream) {
                if (signal.aborted) throw new Error("Aborted");

                if (update.thought) {
                    setResearchLogs(prev => [...prev, {
                        id: Math.random().toString(),
                        type: 'thought',
                        message: update.thought!,
                        timestamp: Date.now()
                    }]);
                }

                if (update.pillars && update.pillars.length > 0) {
                    const mapped: ResearchPillar[] = update.pillars.map(p => ({
                        stage: p.stage as StageType,
                        label: p.label,
                        goals: p.goals
                    }));
                    setResearchPillars(mapped);
                    const flatItems = mapped.flatMap(p => p.goals.map(g => `[${p.label}] ${g}`));
                    setResearchPlan(flatItems);
                }

                if (!update.pillars && update.thought) {
                    try {
                        const thought = update.thought;
                        let items: string[] = [];
                        if (thought.includes('<plan>')) {
                            const content = thought.split('<plan>')[1].split('</plan>')[0];
                            items = content.split('\n').map(l => l.trim()).filter(l => l.length > 0 && (l.match(/^\d+\./) || l.startsWith('-')));
                        } else if (thought.trim().startsWith('PLAN:')) {
                            items = thought.replace('PLAN:', '').split('\n').map(l => l.trim()).filter(l => l.length > 0);
                        } else if (thought.match(/^\d+\./m)) {
                            items = thought.split('\n').map(l => l.trim()).filter(l => l.match(/^\d+\./));
                        }
                        if (items.length > 0) setResearchPlan(items);
                    } catch (e) { console.warn("Error parsing plan:", e); }
                }
            }
        } catch (e: any) {
            if (e.message !== "Aborted") {
                console.error("Revision failed", e);
                addToast('error', 'Failed to revise plan.');
            }
        } finally {
            if (!signal.aborted) {
                abortControllerRef.current = null;

                // Persist updated research data after revision
                // Small delay to ensure React has flushed state updates to refs
                await new Promise(r => setTimeout(r, 100));
                const currentProject = activeProjectRef.current;
                if (currentProject) {
                    const updated = {
                        ...currentProject,
                        researchLogs: researchLogsRef.current,
                        researchPlan: researchPlanRef.current,
                        researchPillars: researchPillarsRef.current,
                        lastUpdated: Date.now()
                    };
                    updateProject(updated);
                }
            }
        }
    };

    const handleApproveResearch = async () => {
        if (!activeProject) return;

        if (abortControllerRef.current) abortControllerRef.current.abort();
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        // Keep isResearchPlanning TRUE during execution so the plan stays visible.
        // Only set to false after stages successfully start generating.
        setIsLoading(true);
        setIsChatOpen(true);
        setPipelineError(null); // Clear any previous error

        // Cost: Remaining 8 Tokens for Execution
        if (!deduct({ researchTokens: 8 })) {
            addToast('error', 'Insufficient Research Tokens for execution.');
            setIsLoading(false);
            return;
        }

        try {
            // --- EXECUTE PHASE ---
            let finalResearchBrief = "";
            const executionStream = executeDeepResearchStream(activeProject.idea, researchPlanRef.current, aiConfig);

            for await (const update of executionStream) {
                if (signal.aborted) throw new Error("Aborted");

                if (update.thought) {
                    setResearchLogs(prev => [...prev, {
                        id: Math.random().toString(),
                        type: 'thought',
                        message: update.thought!,
                        timestamp: Date.now()
                    }]);
                }

                if (update.content) {
                    finalResearchBrief = update.content;
                    setResearchContent(finalResearchBrief);
                }

                if (update.sources) {
                    setResearchSources(prev => [...prev, ...update.sources!]);
                }

                if (update.progress) {
                    addLoadingStep(`Researching ${update.progress.current}/${update.progress.total}: ${update.progress.label}`);
                }
            }

            // --- GUARD: Check if research actually produced content ---
            if (!finalResearchBrief || finalResearchBrief.trim().length < 100) {
                console.error('[Pipeline] Research brief is empty or too short, not proceeding to stages.');
                setPipelineError('The research didn\'t produce enough content to build your strategy. This usually happens when the AI service is temporarily unavailable.');
                setIsResearchPlanning(true);
                setIsLoading(false);
                return;
            }

            // Research succeeded! Save brief to project
            await updateProjectField(activeProject.id, 'researchBrief', finalResearchBrief);

            // Save to DEEP_RESEARCH artifact
            updateProjectArtifact(activeProject.id, StageType.DEEP_RESEARCH, {
                title: "Deep Research Brief",
                content: finalResearchBrief,
                status: ArtifactStatus.DRAFT,
                sources: researchSources
            });

            // NOW it's safe to exit planning mode — research actually succeeded
            setIsResearchPlanning(false);

            // "Tuck away" the research canvas after a brief pause
            await new Promise(resolve => setTimeout(resolve, 2000));

            // CREDIT CHECK: STRATEGY GENERATION
            if (!deduct({ strategyCredits: 5 })) {
                addToast('error', 'Insufficient Strategy Credits for full generation. Pausing.');
                setIsLoading(false);
                return;
            }

            // --- ARTIFACT GENERATION PHASE ---
            addLoadingStep("Synthesizing Strategy Artifacts...");

            const stages = [
                StageType.MARKET_ANALYSIS,
                StageType.USER_PERSONA,
                StageType.SOLUTION_CONCEPT,
                StageType.PRODUCT_SPEC,
                StageType.EXECUTION_ROADMAP
            ];

            const STAGE_TIMEOUT_MS = 90_000; // 90 seconds per stage
            let completedStages = 0;

            for (const stage of stages) {
                if (signal.aborted) throw new Error("Aborted");

                setActiveStage(stage);
                updateProjectArtifact(activeProject.id, stage, { status: ArtifactStatus.GENERATING });
                addLoadingStep(`Drafting ${STAGE_CONFIG[stage].label}...`);

                try {
                    // Get latest artifacts for context from ref
                    const currentActive = activeProjectRef.current;
                    const contextArtifacts = (currentActive && currentActive.id === activeProject.id)
                        ? currentActive.artifacts
                        : activeProject.artifacts;

                    // Timeout wrapper — race between generation and a 90s deadline
                    const generateWithTimeout = async () => {
                        const stream = generateStageDraftStream(stage, activeProject.idea, contextArtifacts, aiConfig, finalResearchBrief);
                        let finalContent = "";

                        for await (const chunk of stream) {
                            if (signal.aborted) throw new Error("Aborted");

                            if (chunk.thought) {
                                completeLastStep();
                                addLoadingStep(chunk.thought);
                            }

                            finalContent = chunk.content;
                            updateProjectArtifact(activeProject.id, stage, {
                                title: chunk.title,
                                content: chunk.content,
                                status: ArtifactStatus.GENERATING
                            });

                            if (chunk.isComplete && chunk.sources) {
                                updateProjectArtifact(activeProject.id, stage, { sources: chunk.sources });
                            }
                        }

                        return finalContent;
                    };

                    const timeoutPromise = new Promise<never>((_, reject) =>
                        setTimeout(() => reject(new Error(`${STAGE_CONFIG[stage].label} timed out after ${STAGE_TIMEOUT_MS / 1000}s`)), STAGE_TIMEOUT_MS)
                    );

                    const finalContent = await Promise.race([generateWithTimeout(), timeoutPromise]);

                    // Mark as Draft upon successful completion
                    updateProjectArtifact(activeProject.id, stage, {
                        status: ArtifactStatus.DRAFT,
                        lastUpdated: Date.now()
                    });

                    completedStages++;
                    completeLastStep();

                    // Special handling for Persona Image
                    if (stage === StageType.USER_PERSONA) {
                        if (signal.aborted) throw new Error("Aborted");
                        addLoadingStep("Dreaming up persona avatar...");
                        try {
                            const imageUrl = await generatePersonaImage(finalContent, aiConfig);
                            if (imageUrl) {
                                updateProjectArtifact(activeProject.id, stage, { imageUrl });
                            }
                        } catch (e) { console.warn("Image gen failed", e); }
                        completeLastStep();
                    }
                } catch (stageErr: any) {
                    if (stageErr.message === "Aborted") throw stageErr;

                    // Partial pipeline recovery: save completed stages, mark failed + downstream as stale
                    console.error(`[Pipeline] Stage ${stage} failed (${completedStages}/${stages.length} completed):`, stageErr);
                    updateProjectArtifact(activeProject.id, stage, {
                        status: ArtifactStatus.DRAFT,
                        content: `⚠️ Generation failed: ${stageErr.message || 'Unknown error'}. Use the regenerate button to retry this stage.`,
                        title: STAGE_CONFIG[stage].label,
                        lastUpdated: Date.now()
                    });
                    completeLastStep();

                    // Mark remaining downstream stages as stale (not error — they just weren't attempted)
                    const failedIdx = stages.indexOf(stage);
                    for (let i = failedIdx + 1; i < stages.length; i++) {
                        updateProjectArtifact(activeProject.id, stages[i], {
                            status: ArtifactStatus.DRAFT,
                            content: `⏸️ Skipped — upstream stage "${STAGE_CONFIG[stage].label}" failed. Regenerate that stage first, then regenerate this one.`,
                            title: STAGE_CONFIG[stages[i]].label,
                            lastUpdated: Date.now()
                        });
                    }

                    // If we completed at least some stages, continue to strategy pipeline with partial data
                    if (completedStages >= 3) {
                        addToast('error', `${STAGE_CONFIG[stage].label} failed, but ${completedStages} stages succeeded. Strategy review running with partial data.`);
                        // Don't throw — let the strategy pipeline try with what we have
                        break;
                    }

                    // Too few stages for a meaningful strategy review
                    throw new Error(`${STAGE_CONFIG[stage].label} failed. Only ${completedStages}/${stages.length} stages completed — not enough for strategy review.`);
                }

                await new Promise(resolve => setTimeout(resolve, 500));
            }
            addLoadingStep("Strategy Chain Complete. Distilling pillars...");
            setTimeout(completeLastStep, 500);

            // --- STRATEGY PIPELINE: Summarize → Roast → Gate 1 ---
            setPipelinePhase('roast');
            setIsRoastRunning(true);
            setRoastResult(null);
            setEvolvedPillars([]);
            addChatMessage('assistant', '🔥 Strategy V1 drafted. Distilling summaries and summoning the Roast Swarm...');

            try {
                const latestProject = activeProjectRef.current || activeProject;

                // Step 1: Summarize all 5 pillars
                const summaries = await summarizeStrategy(latestProject.artifacts, aiConfig);
                setStrategySummaries(summaries);

                // Step 2: Run the roast on dense summaries
                const roast = await roastStrategy(summaries, latestProject.idea, aiConfig);
                setRoastResult(roast);
                addChatMessage('assistant', `Roast complete: ${roast.overallScore}/100. Review the feedback and choose which items to action.`);
            } catch (roastErr) {
                console.error('Roast gate failed', roastErr);
                addToast('warning', 'Roast Swarm failed. You can still review your strategy.');
                setPipelinePhase('review');
            } finally {
                setIsRoastRunning(false);
            }

        } catch (e: any) {
            if (e.message === "Aborted") {
                // Handled — but preserve plan visibility
                const hasPlanData = researchPillarsRef.current.length > 0 || researchPlanRef.current.length > 0;
                if (hasPlanData) {
                    setIsResearchPlanning(true); // Restore plan view
                }
            } else {
                console.error("Generation failed", e);
                setPipelineError(e.message || 'Something went wrong during execution. Please try again.');
                // Restore planning mode so user can see the plan and retry
                setIsResearchPlanning(true);
            }
        } finally {
            if (!signal.aborted) {
                setIsLoading(false);
                abortControllerRef.current = null;
            }
        }
    };

    const handleValidate = (type: StageType) => {
        if (!activeProject) return;
        const artifact = activeProject.artifacts[type];
        if (!artifact?.content) {
            addToast('error', 'No content to validate.');
            return;
        }

        // Run actual validation rules before marking as validated
        const validation = ArtifactValidator.validate(type, artifact.content);

        if (!validation.isValid) {
            const errorList = validation.errors.join('\n• ');
            addToast('error', `Validation failed:\n• ${errorList}`);
            return;
        }

        updateProjectArtifact(activeProject.id, type, { status: ArtifactStatus.VALIDATED });
        addToast('success', `${STAGE_CONFIG[type].label} validated successfully.`);
        const nextStage = STAGE_CONFIG[type].nextStage;
        if (nextStage) setActiveStage(nextStage);
    };

    const handleEditSave = (id: string, newTitle: string, newContent: string, typeOverride?: StageType) => {
        if (!activeProject) return;
        const type = typeOverride || editingArtifact?.type;
        if (!type) return;

        const stagesOrder = [
            StageType.MARKET_ANALYSIS,
            StageType.USER_PERSONA,
            StageType.SOLUTION_CONCEPT,
            StageType.PRODUCT_SPEC,
            StageType.EXECUTION_ROADMAP
        ];
        const currentIndex = stagesOrder.indexOf(type);
        const downstreamStages = stagesOrder.slice(currentIndex + 1);

        if (downstreamStages.length > 0) {
            setPendingRegeneration({
                upstreamType: type,
                affectedTypes: downstreamStages,
                newContent
            });
            updateProjectArtifact(activeProject.id, type, { title: newTitle, content: newContent });
            addToast('info', 'Changes saved. Downstream artifacts marked for review.');
        } else {
            updateProjectArtifact(activeProject.id, type, { title: newTitle, content: newContent });
            addToast('success', 'Changes saved successfully.');
        }
        setEditingArtifact(null);
    };

    // --- GEMINI HELPERS WRAPPERS (Refining, Consulting, etc) ---

    // handleRefine, handleConsult, handleRefineSection, etc. all use updateProjectArtifact which is now DB-aware.

    // ... rest of AI handlers ...
    const handleRefine = async (instruction: string) => {
        if (isLoading || !activeProject) return;
        const currentArtifact = activeProject.artifacts[activeStage];
        if (!currentArtifact || !currentArtifact.content) return;

        setIsLoading(true);
        setLoadingSteps([]);
        addChatMessage('user', `Update ${STAGE_CONFIG[activeStage].label}: ${instruction}`);
        addLoadingStep(`Refining ${STAGE_CONFIG[activeStage].label}...`);

        try {
            const newContent = await refineStageDraft(activeStage, currentArtifact.content, instruction, aiConfig);
            completeLastStep();
            handleEditSave(currentArtifact.id, currentArtifact.title, newContent, activeStage);
            addChatMessage('assistant', `I've updated the ${STAGE_CONFIG[activeStage].label} based on your instructions.`);
        } catch (e) {
            console.error(e);
            addToast('error', 'Refinement failed.');
            addChatMessage('assistant', 'Sorry, I encountered an error.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleConsult = async (question: string) => {
        if (isLoading || !activeProject) return;
        const currentArtifact = activeProject.artifacts[activeStage];
        if (!currentArtifact || !currentArtifact.content) return;

        setIsLoading(true);
        setLoadingSteps([]);
        addChatMessage('user', question);
        addLoadingStep(`Analyzing ${STAGE_CONFIG[activeStage].label}...`);

        try {
            const answer = await consultStrategy(activeStage, currentArtifact.content, question, activeProject.idea, aiConfig);
            completeLastStep();
            addChatMessage('assistant', answer);
        } catch (e) {
            console.error(e);
            addToast('error', 'Consultation failed.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRefineSection = async (sectionTitle: string, sectionContent: string) => {
        if (!activeProject) return;
        const instruction = prompt(`Refine section: "${sectionTitle}"\nWhat changes would you like to make?`);
        if (!instruction) return;

        setIsLoading(true);
        setLoadingSteps([]);
        addChatMessage('user', `Refine section "${sectionTitle}": ${instruction}`);
        addLoadingStep(`Refining section: ${sectionTitle}...`);

        try {
            const currentArtifact = activeProject.artifacts[activeStage];
            const fullContent = currentArtifact.content;

            const newSectionContent = await refineSpecificSection(sectionTitle, sectionContent, instruction, fullContent, aiConfig);
            let newFullContent = fullContent.replace(sectionContent.trim(), newSectionContent.trim());

            if (newFullContent === fullContent) {
                // Fallback if replace failed
                newFullContent = await refineStageDraft(activeStage, fullContent, `Update the section "${sectionTitle}" to: ${instruction}`, aiConfig);
            }

            completeLastStep();
            handleEditSave(currentArtifact.id, currentArtifact.title, newFullContent, activeStage);
            addChatMessage('assistant', `Section "${sectionTitle}" updated.`);
        } catch (e) {
            console.error(e);
            addToast('error', 'Section update failed.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAudit = async () => {
        if (isLoading || !activeProject) return;
        const currentArtifact = activeProject.artifacts[activeStage];
        if (!currentArtifact || !currentArtifact.content) return;

        setIsLoading(true);
        addLoadingStep(`Running VC Audit on ${STAGE_CONFIG[activeStage].label}...`);

        try {
            const audit = await auditStageDraft(activeStage, currentArtifact.content, activeProject.idea, aiConfig);
            setAuditContent(audit);
            setIsAuditOpen(true);
            completeLastStep();
            addChatMessage('assistant', `I've generated a VC Audit for the ${STAGE_CONFIG[activeStage].label}. Check the popup for details.`);
        } catch (e) {
            console.error(e);
            addToast('error', 'Audit failed.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateAgentPrompt = async (agent: 'replit' | 'cursor' | 'bolt' = 'replit') => {
        if (!activeProject) return;
        setIsAgentModalOpen(true);
        setIsGeneratingAgent(true);
        try {
            const prompt = await generateAgentPrompt(activeProject.artifacts, activeProject.idea, agent, aiConfig);
            setAgentPrompt(prompt);
        } catch (e) {
            addToast('error', 'Failed to generate agent prompt');
        } finally {
            setIsGeneratingAgent(false);
        }
    }

    const handleGeneratePodcast = async () => {
        if (podcastAudio) {
            setIsPodcastOpen(true);
            return;
        }
        if (!activeProject) return;

        setIsLoading(true);
        addLoadingStep("Recording strategy podcast...");

        try {
            const audio = await generateStrategyPodcast(activeProject.idea, activeProject.artifacts, aiConfig);
            if (audio) {
                setPodcastAudio(audio);
                setIsPodcastOpen(true);
                completeLastStep();
                addToast('success', 'Podcast generated successfully!');
            } else {
                throw new Error("No audio returned");
            }
        } catch (e) {
            addToast('error', 'Failed to generate podcast.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegenerateStage = async () => {
        if (isLoading || !activeProject) return;
        const stage = activeStage;

        showConfirm({
            title: `Regenerate ${STAGE_CONFIG[stage].label}`,
            message: `This will discard the current ${STAGE_CONFIG[stage].label} content and generate a new draft from scratch.`,
            confirmLabel: 'Regenerate',
            variant: 'warning',
            onConfirm: async () => {
                setIsLoading(true);
                setLoadingSteps([]);
                setChatHistory(prev => [...prev, { id: Date.now().toString(), role: 'user', text: `Regenerate ${STAGE_CONFIG[stage].label}`, timestamp: Date.now() }]);
                addLoadingStep(`Regenerating ${STAGE_CONFIG[stage].label}...`);
                updateProjectArtifact(activeProject.id, stage, { status: ArtifactStatus.GENERATING, content: '' });

                try {
                    const stream = generateStageDraftStream(stage, activeProject.idea, activeProject.artifacts, aiConfig, activeProject.researchBrief);
                    for await (const chunk of stream) {
                        if (chunk.thought) {
                            completeLastStep();
                            addLoadingStep(chunk.thought);
                        }
                        updateProjectArtifact(activeProject.id, stage, {
                            title: chunk.title,
                            content: chunk.content,
                            status: ArtifactStatus.GENERATING
                        });
                        if (chunk.isComplete && chunk.sources) {
                            updateProjectArtifact(activeProject.id, stage, { sources: chunk.sources });
                        }
                    }
                    updateProjectArtifact(activeProject.id, stage, { status: ArtifactStatus.DRAFT, lastUpdated: Date.now() });
                    completeLastStep();
                    addToast('success', 'Stage regenerated successfully.');
                } catch (e) {
                    updateProjectArtifact(activeProject.id, stage, { status: ArtifactStatus.DRAFT });
                    addToast('error', 'Regeneration failed.');
                } finally {
                    setIsLoading(false);
                }
            }
        });
    };

    const confirmRegeneration = async () => {
        if (!pendingRegeneration || !activeProject) return;

        setIsLoading(true);
        setLoadingSteps([{ message: "Processing changes...", isActive: true, isComplete: false }]);

        try {
            // Optimistic update of statuses
            pendingRegeneration.affectedTypes.forEach(t => updateProjectArtifact(activeProject.id, t, { status: ArtifactStatus.GENERATING }));
            if (pendingRegeneration.affectedTypes.length > 0) setActiveStage(pendingRegeneration.affectedTypes[0]);

            const updates = await regenerateDownstream(
                pendingRegeneration.upstreamType,
                pendingRegeneration.newContent,
                pendingRegeneration.affectedTypes,
                activeProject.idea,
                aiConfig
            );


            // Update multiple artifacts using hook (we can do this individually or create a bulk update in hook if needed)
            // For now, doing sequential updates is fine as they batch in React 18 usually
            if (updates.userPersona) updateProjectArtifact(activeProject.id, StageType.USER_PERSONA, { ...updates.userPersona, status: ArtifactStatus.DRAFT });
            if (updates.solutionConcept) updateProjectArtifact(activeProject.id, StageType.SOLUTION_CONCEPT, { ...updates.solutionConcept, status: ArtifactStatus.DRAFT });
            if (updates.productSpec) updateProjectArtifact(activeProject.id, StageType.PRODUCT_SPEC, { ...updates.productSpec, status: ArtifactStatus.DRAFT });
            if (updates.executionRoadmap) updateProjectArtifact(activeProject.id, StageType.EXECUTION_ROADMAP, { ...updates.executionRoadmap, status: ArtifactStatus.DRAFT });

            setPendingRegeneration(null);
            completeLastStep();
            addToast('success', 'Downstream artifacts regenerated.');

        } catch (e) {
            console.error(e);
            addToast('error', 'Regeneration failed.');
        } finally {
            setIsLoading(false);
        }
    };


    const handleExport = () => {
        if (!activeProject) return;
        try {
            const stages = Object.values(StageType);
            let documentContent = `# BushidoOS Product Strategy: ${activeProject.idea}\n`;
            documentContent += `Generated: ${new Date().toLocaleString()}\n\n`;

            stages.forEach(stage => {
                const artifact = activeProject.artifacts[stage];
                const config = STAGE_CONFIG[stage];
                documentContent += `\n---\n\n# ${config.label}\n`;
                if (artifact.content) documentContent += `${artifact.content}\n`;
            });

            const blob = new Blob([documentContent], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `bushido-${activeProject.idea.substring(0, 20).replace(/\s/g, '_')}.md`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            addToast('success', 'Strategy downloaded successfully.');
        } catch (e) {
            addToast('error', 'Failed to export document.');
        }
    };

    // --- RENDER ---

    // 1. Dashboard View (Project List & Creation)
    // 1. Dashboard View (Project List & Creation)
    if (!activeProject) {
        if (isLoadingProject) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-[#0d0d12] text-[#E63946]">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-[#E63946] border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-sm uppercase tracking-widest animate-pulse">Entering the Forge...</p>
                    </div>
                </div>
            );
        }
        return (

            <>
                <Dashboard
                    projects={projects}
                    onKickstart={handleKickstart}
                    onSelectProject={handleSelectProject}
                    onDeleteProject={handleDeleteProject}
                    onRenameProject={handleRenameProject}
                    onOpenSettings={() => setIsSettingsOpen(true)}
                    onOpenAuth={() => setIsAuthModalOpen(true)}
                    onSignOut={async () => {
                        await signOut();
                        setAuthUser(null);
                        setAuthSession(null);
                    }}
                    aiConfig={aiConfig}
                    user={authUser ? {
                        email: authUser.email,
                        name: authUser.user_metadata?.full_name || authUser.email,
                        avatar: authUser.user_metadata?.avatar_url
                    } : null}
                    githubConnected={githubConnection.isConnected}
                    onConnectGithub={() => window.location.href = getGitHubOAuthUrl('')}
                />
                <GlobalSettingsPanel
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                    projectId={''}
                    syncStatus={syncStatus}
                    onConnectionChange={(conn) => {
                        setGithubConnection(conn);
                        if (!conn.isConnected) {
                            setSyncStatus('disconnected');
                        }
                    }}
                    currentConfig={aiConfig}
                    onConfigChange={setAiConfig}
                />
                <AuthModal
                    isOpen={isAuthModalOpen}
                    onClose={() => setIsAuthModalOpen(false)}
                    onGoogleSignIn={signInWithGoogle}
                    onGitHubSignIn={signInWithGitHub}
                    onEmailSignIn={signInWithEmail}
                />
                <ToastContainer toasts={toasts} onDismiss={removeToast} />
                <ConfirmModal
                    isOpen={confirmModal.isOpen}
                    onClose={closeConfirm}
                    onConfirm={confirmModal.onConfirm}
                    title={confirmModal.title}
                    message={confirmModal.message}
                    confirmLabel={confirmModal.confirmLabel}
                    variant={confirmModal.variant}
                />
            </>
        )
    }

    if (activeStage === StageType.DEEP_RESEARCH) {
        const deepResearchArtifact = activeProject.artifacts[StageType.DEEP_RESEARCH];
        return (
            <div className="flex h-screen w-full bg-slate-950">
                {/* Sidebar is always visible now but maybe we want to hide it during initial flow? 
                     User said "access after moving into main 5 stages", so they want sidebar nav.
                     We will render Sidebar + DeepResearchCanvas. 
                  */}
                {/* Mobile Backdrop */}
                {isMobileMenuOpen && (
                    <div
                        className="fixed inset-0 bg-black/60 z-40 md:hidden"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                )}

                <div className={`fixed inset-y-0 left-0 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition duration-300 ease-in-out z-50 md:z-0 flex h-full`}>
                    {isSidebarOpen && (
                        <Sidebar
                            activeStage={activeStage}
                            onSelectStage={(stage) => {
                                setActiveStage(stage);
                                setIsMobileMenuOpen(false);
                            }}
                            stages={Object.values(StageType)}
                            onBack={handleBackToDashboard}
                            projectTitle={activeProject.idea}
                            isCollapsed={isSidebarCollapsed}
                            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                            isChatOpen={isChatOpen}
                            onToggleChat={() => setIsChatOpen(!isChatOpen)}
                            onConnectGithub={() => window.location.href = getGitHubOAuthUrl('')}
                            artifacts={activeProject.artifacts} // Pass artifacts for status tracking
                            onOpenSettings={() => setIsSettingsOpen(true)}
                            user={authUser ? {
                                email: authUser.email,
                                name: authUser.user_metadata?.full_name || authUser.email,
                                avatar: authUser.user_metadata?.avatar_url
                            } : null}
                        />
                    )}
                </div>

                <div className="flex-1 relative w-full overflow-hidden">
                    {/* Toggle button if needed, but Sidebar has close. */}
                    <DeepResearchCanvas
                        idea={activeProject.idea}
                        logs={researchLogs}
                        plan={researchPlan}
                        pillars={researchPillars}
                        content={deepResearchArtifact?.content || researchContent}
                        sources={deepResearchArtifact?.sources || researchSources}
                        isPlanning={isResearchPlanning}
                        isGenerating={isLoading}
                        pipelineError={pipelineError}
                        onApprovePlan={handleApproveResearch}
                        onCancelPlan={handleCancelResearch}
                        onRevise={handleRevisePlan}
                        onRegenerate={handleRegeneratePlan}
                        onToggleSidebar={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    />
                </div>
            </div>
        );
    }

    // 3. Main Stage Canvas View (Standard)
    // Removed isResearching check
    if (!activeProject) return null;

    return (
        <div className="flex h-screen w-full bg-slate-950 transition-colors duration-300">

            {/* Mobile Backdrop */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* LEFT PANEL */}
            <div className={`fixed inset-y-0 left-0 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition duration-300 ease-in-out z-50 md:z-0 flex h-full`}>
                {isSidebarOpen && (
                    <Sidebar
                        projectTitle={activeProject.idea}
                        activeStage={activeStage}
                        onSelectStage={(stage) => {
                            setActiveStage(stage);
                            setIsMobileMenuOpen(false);
                        }}
                        stages={Object.values(StageType)}
                        onBack={handleBackToDashboard}

                        user={authUser ? {
                            email: authUser.email,
                            name: authUser.user_metadata?.full_name || authUser.email,
                            avatar: authUser.user_metadata?.avatar_url
                        } : null}

                        // Features
                        isCollapsed={isSidebarCollapsed}
                        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        isChatOpen={isChatOpen}
                        onToggleChat={() => setIsChatOpen(!isChatOpen)}
                        githubConnected={githubConnection.isConnected}
                        onConnectGithub={() => window.location.href = getGitHubOAuthUrl('')}
                        artifacts={activeProject.artifacts}
                        onOpenSettings={() => setIsSettingsOpen(true)}
                    />
                )}
            </div>

            {/* CENTER CANVAS */}
            <main className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--bushido-ink)] relative transition-all duration-300 ease-in-out">
                <CanvasHeader
                    artifacts={activeProject.artifacts}
                    onExport={handleExport}
                    onPlayPodcast={handleGeneratePodcast}
                    onToggleSidebar={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                />

                {/* STRATEGY PIPELINE GATES */}
                {pipelinePhase === 'roast' ? (
                    <RoastGateScreen
                        result={roastResult}
                        isRunning={isRoastRunning}
                        isEvolving={isEvolving}
                        onProceed={async (actionItems: ActionableRoastItem[]) => {
                            if (actionItems.length > 0) {
                                // Evolve affected pillars
                                setIsEvolving(true);
                                try {
                                    const latestProject = activeProjectRef.current || activeProject;
                                    const updatedArtifacts = await evolveStrategy(
                                        latestProject.artifacts, actionItems, latestProject.idea, aiConfig
                                    );
                                    // Update the affected artifacts in state
                                    const affected: StageType[] = [];
                                    for (const [stage, artifact] of Object.entries(updatedArtifacts)) {
                                        const stageType = stage as StageType;
                                        if (artifact.lastUpdated !== latestProject.artifacts[stageType]?.lastUpdated) {
                                            updateProjectArtifact(activeProject.id, stageType, {
                                                content: artifact.content,
                                                lastUpdated: artifact.lastUpdated,
                                            });
                                            affected.push(stageType);
                                        }
                                    }
                                    setEvolvedPillars(affected);
                                    addChatMessage('assistant', `Strategy evolved: ${affected.length} pillar(s) updated based on roast feedback.`);
                                } catch (err) {
                                    console.error('Strategy evolution failed', err);
                                    addToast('warning', 'Evolution failed. Proceeding with original strategy.');
                                } finally {
                                    setIsEvolving(false);
                                }
                            }
                            setPipelinePhase('review');
                        }}
                    />
                ) : pipelinePhase === 'review' ? (
                    <StrategyReviewScreen
                        artifacts={activeProject.artifacts}
                        evolvedPillars={evolvedPillars}
                        onApprove={async () => {
                            setPipelinePhase('prd');
                            setIsGeneratingPrd(true);
                            try {
                                const latestProject = activeProjectRef.current || activeProject;
                                const summaries = strategySummaries || await summarizeStrategy(latestProject.artifacts, aiConfig);
                                const pkg = assembleStrategyPackage(
                                    latestProject.artifacts, summaries, roastResult!, evolvedPillars.length > 0
                                    ? roastResult!.feedbacks.flatMap(f => [
                                        ...f.criticalFlaws.map(fl => ({ persona: f.persona, flaw: fl.text, suggestion: '', targetPillar: fl.targetPillar, actioned: true })),
                                        ...f.suggestions.map(s => ({ persona: f.persona, flaw: '', suggestion: s.text, targetPillar: s.targetPillar, actioned: true }))
                                    ]) : [],
                                    latestProject.idea
                                );
                                setStrategyPackage(pkg);
                                const prd = await generatePrd(pkg);
                                setGeneratedPrd(prd);
                                addChatMessage('assistant', `PRD generated with ${prd.stories.length} user stories. Review and approve each story.`);
                            } catch (err) {
                                console.error('PRD generation failed', err);
                                addToast('error', 'PRD generation failed.');
                                setPipelinePhase('review');
                            } finally {
                                setIsGeneratingPrd(false);
                            }
                        }}
                        onEditPillar={(stage) => {
                            setPipelinePhase('canvas');
                            setActiveStage(stage);
                            setEditingArtifact(activeProject.artifacts[stage]);
                        }}
                        onGoBack={() => setPipelinePhase('roast')}
                    />
                ) : pipelinePhase === 'prd' ? (
                    <PrdApprovalScreen
                        prd={generatedPrd}
                        isGenerating={isGeneratingPrd}
                        onLockAndHandshake={(approvedPrd) => {
                            setGeneratedPrd(approvedPrd);
                            setPipelinePhase('canvas');
                            addToast('success', '🤝 PRD locked! Ready for IDE handshake.');
                            addChatMessage('assistant', 'PRD approved and locked. Ready for IDE handshake.');
                        }}
                        onRequestChanges={async (feedback) => {
                            setIsGeneratingPrd(true);
                            try {
                                const input = strategyPackage || generatedPrd!.rawSpec;
                                const revisedPrd = await generatePrd(input, feedback);
                                setGeneratedPrd(revisedPrd);
                                addChatMessage('assistant', 'PRD revised based on your feedback.');
                            } catch (err) {
                                console.error('PRD revision failed', err);
                                addToast('error', 'PRD revision failed.');
                            } finally {
                                setIsGeneratingPrd(false);
                            }
                        }}
                        onGoBack={() => setPipelinePhase('review')}
                    />
                ) : (
                    <div className="flex-1 overflow-y-auto scrollbar-default">
                        <div className="w-full min-h-full p-8 md:p-12">
                            {/* Phase 3: Verification Alert */}
                            {activeStage === StageType.PRODUCT_SPEC && (
                                <div className="animate-fade-in">
                                    <DriftAlertCard
                                        report={driftReport}
                                        onVerify={handleVerifyAlignment}
                                        isVerifying={isVerifying}
                                    />
                                </div>
                            )}

                            <div className="animate-fade-in">
                                <StageCard
                                    artifact={activeProject.artifacts[activeStage]}
                                    onEdit={() => setEditingArtifact(activeProject.artifacts[activeStage])}
                                    onValidate={() => handleValidate(activeStage)}
                                    onInterview={() => setIsInterviewOpen(true)}
                                    onRegenerate={handleRegenerateStage}
                                    onAudit={handleAudit}
                                    onBuild={() => handleGenerateAgentPrompt('replit')}
                                    onRefineSection={handleRefineSection}
                                    onToast={addToast}
                                    aiConfig={aiConfig}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* RIGHT PANEL — Persistent Chat */}
            <AIInsights
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
                messages={chatHistory}
                onSendMessage={(msg) => handleConsult(msg)}
                isLoading={isLoading}
            />

            <EditModal
                artifact={editingArtifact}
                isOpen={!!editingArtifact}
                onClose={() => setEditingArtifact(null)}
                onSave={(id, title, content) => handleEditSave(id, title, content)}
            />

            <InterviewModal
                isOpen={isInterviewOpen && activeStage === StageType.USER_PERSONA}
                onClose={() => setIsInterviewOpen(false)}
                personaContent={activeProject.artifacts[StageType.USER_PERSONA].content}
                personaImage={activeProject.artifacts[StageType.USER_PERSONA].imageUrl}
                personaName={activeProject.artifacts[StageType.USER_PERSONA].title?.replace("User Persona: ", "") || "Target User"}
                aiConfig={aiConfig}
            />

            <AuditModal
                isOpen={isAuditOpen}
                onClose={() => setIsAuditOpen(false)}
                auditContent={auditContent || "No audit content available."}
                stage={activeStage}
            />

            <AgentExportModal
                isOpen={isAgentModalOpen}
                onClose={() => setIsAgentModalOpen(false)}
                promptContent={agentPrompt}
                onGenerate={handleGenerateAgentPrompt}
                isGenerating={isGeneratingAgent}
                project={activeProject}
            />

            <AudioPlayer
                base64Audio={podcastAudio}
                isOpen={isPodcastOpen}
                onClose={() => setIsPodcastOpen(false)}
            />



            <GlobalSettingsPanel
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                projectId={activeProject?.id || ''}
                syncStatus={syncStatus}
                onConnectionChange={(conn) => {
                    setGithubConnection(conn);
                    if (!conn.isConnected) {
                        setSyncStatus('disconnected');
                    }
                }}
                currentConfig={aiConfig}
                onConfigChange={setAiConfig}
            />

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={closeConfirm}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmLabel={confirmModal.confirmLabel}
                variant={confirmModal.variant}
            />
        </div>
    );
}