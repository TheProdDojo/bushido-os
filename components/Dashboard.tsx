
import React from 'react';
import { ProjectState, ProjectMetadata, ArtifactStatus, STAGE_CONFIG, Artifact } from '../types';
import { KickstartInput } from './KickstartInput';
import { ZenRail } from './ZenRail';
import { StrategyStack } from './StrategyStack';
import { Settings, Zap, Gift, LogOut, User, Flame, Lock, ArrowRight, Archive } from 'lucide-react';
import { AIConfig } from '../services/ai/types';
import { getUsageSummary } from '../services/usageService';
import { ArchiveCard } from './ArchiveCard';
import { SettingsPage } from './SettingsPage';
import { RoastModal } from './RoastModal';
import { roastIdea, RoastResult } from '../services/ai/agents/roastService';

interface DashboardProps {
    projects: ProjectMetadata[];
    onSelectProject: (id: string) => void;
    onDeleteProject: (e: React.MouseEvent, id: string) => void;
    onRenameProject: (id: string, newName: string) => void;
    onKickstart: (idea: string) => void;
    onOpenSettings: () => void;
    onOpenAuth?: () => void;
    onSignOut?: () => void;
    aiConfig: AIConfig;
    user?: { email?: string; name?: string; avatar?: string } | null;
    githubConnected?: boolean;
    onConnectGithub?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
    projects,
    onSelectProject,
    onDeleteProject,
    onRenameProject,
    onKickstart,
    onOpenSettings,
    onOpenAuth,
    onSignOut,
    aiConfig,
    user,
    githubConnected,
    onConnectGithub
}) => {
    const [activeTab, setActiveTab] = React.useState<'home' | 'archives' | 'settings'>('home');
    const isLoggedIn = !!user;

    // Roast State
    const [isRoastOpen, setIsRoastOpen] = React.useState(false);
    const [isRoasting, setIsRoasting] = React.useState(false);
    const [roastResult, setRoastResult] = React.useState<RoastResult | null>(null);

    const handleRoast = async (idea: string) => {
        setIsRoastOpen(true);
        setIsRoasting(true);
        try {
            const result = await roastIdea(idea, aiConfig);
            setRoastResult(result);
        } catch (e) {
            console.error("Roast failed", e);
            // Fallback mock for demo if API key missing (or error toast)
        } finally {
            setIsRoasting(false);
        }
    };

    const sortedProjects = [...projects].sort((a, b) => b.lastUpdated - a.lastUpdated);

    // ===== NOT LOGGED IN VIEW - ZEN FORGE STYLE =====
    if (!isLoggedIn) {
        return (
            <div className="min-h-screen flex bg-[#0d0d12] overflow-hidden relative selection:bg-[#E63946] selection:text-[#f5f0e6]">
                {/* Background Texture Overlay */}
                <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-0" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}></div>

                {/* Main Stage - Centered */}
                <main className="flex-1 relative z-10 flex flex-col items-center justify-center h-screen w-full">

                    {/* Brand Header */}
                    <div className="absolute top-10 left-1/2 -translate-x-1/2 text-center group cursor-default">
                        <div className="mb-4 w-12 h-12 bg-gradient-to-br from-[#E63946] to-[#B71C1C] rounded-xl flex items-center justify-center shadow-lg mx-auto">
                            <span className="text-xl text-[#f5f0e6] font-bold">武</span>
                        </div>
                        <h1 className="text-2xl font-bold text-[#f5f0e6] tracking-[0.2em] uppercase">
                            Bushido<span className="text-[#E63946]">OS</span>
                        </h1>
                        <p className="text-[#6b6762] text-xs uppercase tracking-widest mt-2">The Way of the Warrior Founder</p>
                    </div>

                    {/* The Forge input (Triggers Auth) */}
                    <div className="w-full max-w-2xl px-6 relative z-20">
                        {/* Ambient Glow */}
                        <div className="absolute -inset-10 bg-[radial-gradient(circle_at_center,rgba(230,57,70,0.08)_0%,transparent_60%)] blur-3xl pointer-events-none"></div>

                        <KickstartInput onKickstart={(idea) => {
                            onOpenAuth && onOpenAuth();
                        }} />

                        <div className="mt-8 flex justify-center gap-4 animate-[fadeIn_1s_ease-out_0.5s_forwards]">
                            <button onClick={onOpenAuth} className="px-6 py-2 rounded-full border border-[rgba(230,57,70,0.3)] text-[#E63946] text-xs font-medium hover:bg-[rgba(230,57,70,0.1)] transition-colors uppercase tracking-wider">
                                Log In
                            </button>
                            <button onClick={onOpenAuth} className="px-6 py-2 rounded-full bg-[#E63946] text-[#f5f0e6] text-xs font-medium hover:bg-[#D32F2F] shadow-[0_0_15px_rgba(230,57,70,0.4)] transition-all uppercase tracking-wider">
                                Get Started
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // ===== LOGGED IN VIEW (ZEN FORGE) =====
    return (
        <div className="min-h-screen flex bg-[#0d0d12] overflow-hidden relative selection:bg-[#E63946] selection:text-[#f5f0e6]">
            {/* Background Texture Overlay */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-0" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}></div>

            {/* Left Rail */}
            <ZenRail
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onSignOut={onSignOut}
                user={user}
            />

            {/* Main Stage */}
            <main className="flex-1 relative z-10 flex flex-col items-center justify-center h-[calc(100vh-4rem)] md:h-screen w-full pb-16 md:pb-0">

                {/* View: HOME / FORGE */}
                {activeTab === 'home' && (
                    <>
                        {/* Brand Header (Subtle) */}
                        <div className="absolute top-8 left-1/2 -translate-x-1/2 text-center group cursor-default">
                            <h1 className="text-xl font-bold text-[#6b6762] tracking-[0.3em] uppercase group-hover:text-[#f5f0e6] transition-colors duration-500">
                                Bushido<span className="text-[#E63946]">OS</span>
                            </h1>
                            <div className="h-0.5 w-0 bg-[#E63946] mx-auto mt-2 group-hover:w-12 transition-all duration-500"></div>
                        </div>

                        {/* The Forge (Input) */}
                        <div className="w-full max-w-2xl px-6 relative z-20 -mt-10 md:mt-0">
                            <div className="absolute -inset-10 bg-[radial-gradient(circle_at_center,rgba(230,57,70,0.08)_0%,transparent_60%)] blur-3xl pointer-events-none"></div>

                            <KickstartInput onKickstart={onKickstart} onRoast={handleRoast} />

                            <RoastModal
                                isOpen={isRoastOpen}
                                onClose={() => setIsRoastOpen(false)}
                                isRunning={isRoasting}
                                result={roastResult}
                            />

                            <div className="mt-12 text-center opacity-0 animate-[fadeIn_1s_ease-out_0.5s_forwards]">
                                <span className="text-[10px] text-[#4a4a55] uppercase tracking-[0.4em] font-medium border-t border-[#4a4a55] pt-4 px-8">
                                    Enter The Forge
                                </span>
                            </div>
                        </div>

                        {/* Floating Stack (Right Side) */}
                        <StrategyStack
                            projects={projects}
                            onSelectProject={onSelectProject}
                            onDeleteProject={onDeleteProject}
                        />
                    </>
                )}

                {/* View: ARCHIVES */}
                {activeTab === 'archives' && (
                    <div className="w-full h-full p-6 pb-24 md:p-20 overflow-y-auto">
                        <h2 className="text-2xl md:text-3xl font-bold text-[#f5f0e6] mb-8 border-l-4 border-[#E63946] pl-4">Archives</h2>

                        {sortedProjects.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-[60vh] text-center animate-[fadeIn_0.5s_ease-out]">
                                <div className="w-24 h-24 rounded-full bg-[#1a1a20] flex items-center justify-center mb-6 group cursor-default shadow-inner border border-[#2a2a35]">
                                    <Archive className="w-10 h-10 text-[#4a4a55] group-hover:text-[#E63946] transition-colors duration-300" />
                                </div>
                                <h3 className="text-xl font-medium text-[#f5f0e6] tracking-wide mb-2">No Chronicles Yet</h3>
                                <p className="text-[#6b6762] max-w-md mb-8">
                                    Your journey has just begun. Projects you create in the Forge will be recorded here.
                                </p>
                                <button
                                    onClick={() => setActiveTab('home')}
                                    className="px-6 py-2 rounded-full border border-[rgba(230,57,70,0.3)] text-[#E63946] text-sm hover:bg-[rgba(230,57,70,0.1)] transition-colors uppercase tracking-wider"
                                >
                                    Return to Forge
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {sortedProjects.map(project => (
                                    <ArchiveCard
                                        key={project.id}
                                        project={project}
                                        onSelect={() => onSelectProject(project.id)}
                                        onDelete={onDeleteProject}
                                        onRename={onRenameProject}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* View: SETTINGS / COMMAND CENTER */}
                {activeTab === 'settings' && (
                    <SettingsPage
                        user={user}
                        onSignOut={onSignOut}
                        githubConnected={githubConnected}
                        onConnectGithub={onConnectGithub}
                        projectCount={projects.length}
                    />
                )}

            </main>
        </div>
    );
};