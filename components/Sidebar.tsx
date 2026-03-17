import React from 'react';
import { Home, Search, Clock, FolderOpen, Star, Users, Compass, BookOpen, Gift, Zap, Settings, ChevronDown, ArrowLeft, FileText, Globe, Target, UserCheck, Layers, Map as MapIcon, Database, PanelLeftClose, PanelLeftOpen, MessageSquare, GitBranch, Share2, Github, Lock } from 'lucide-react';
import { StageType, Artifact, ArtifactStatus } from '../types';

interface SidebarProps {
    user: { email?: string; name?: string; avatar?: string } | null;
    onOpenSettings: () => void;

    // Dashboard Mode Props
    activeTab?: 'home' | 'recent' | 'all' | 'starred';
    onTabChange?: (tab: 'home' | 'recent' | 'all' | 'starred') => void;

    // Project Mode Props
    projectTitle?: string;
    activeStage?: StageType;
    onSelectStage?: (stage: StageType) => void;
    stages?: StageType[];
    onBack?: () => void;

    // New Features
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
    isChatOpen?: boolean;
    onToggleChat?: () => void;
    githubConnected?: boolean;
    onConnectGithub?: () => void;

    // Status Tracking
    artifacts?: Record<StageType, Artifact>;
}

const STAGE_ICONS: Record<StageType, any> = {
    [StageType.DEEP_RESEARCH]: Globe,
    [StageType.MARKET_ANALYSIS]: Database,
    [StageType.USER_PERSONA]: UserCheck,
    [StageType.SOLUTION_CONCEPT]: Layers,
    [StageType.PRODUCT_SPEC]: FileText,
    [StageType.EXECUTION_ROADMAP]: MapIcon
};

const STAGE_LABELS: Record<StageType, string> = {
    [StageType.DEEP_RESEARCH]: 'Deep Research',
    [StageType.MARKET_ANALYSIS]: 'Market Analysis',
    [StageType.USER_PERSONA]: 'User Persona',
    [StageType.SOLUTION_CONCEPT]: 'Solution Concept',
    [StageType.PRODUCT_SPEC]: 'Product Spec',
    [StageType.EXECUTION_ROADMAP]: 'Execution Roadmap'
};

export const Sidebar: React.FC<SidebarProps> = ({
    user,
    onOpenSettings,
    activeTab = 'home',
    onTabChange,
    projectTitle,
    activeStage,
    onSelectStage,
    stages,
    onBack,
    isCollapsed = false,
    onToggleCollapse,
    isChatOpen = false,
    onToggleChat,
    githubConnected = false,
    onConnectGithub,
    artifacts
}) => {
    const navItems = [
        { id: 'home', icon: Home, label: 'Home' },
        { id: 'search', icon: Search, label: 'Search' },
    ];

    const projectItems = [
        { id: 'recent', icon: Clock, label: 'Recent' },
        { id: 'all', icon: FolderOpen, label: 'All Strategies' },
        { id: 'starred', icon: Star, label: 'Starred' },
        { id: 'shared', icon: Users, label: 'Shared with me' },
    ];

    const resourceItems = [
        { id: 'discover', icon: Compass, label: 'Discover' },
        { id: 'templates', icon: BookOpen, label: 'Templates' },
    ];

    const displayName = user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'Founder';

    // RENDER: Project Mode (Inside a Strategy)
    // RENDER: Project Mode (Inside a Strategy)
    if (projectTitle && stages) {
        // Reorder stages: Deep Research first
        const sortedStages = [...stages].sort((a, b) => {
            if (a === StageType.DEEP_RESEARCH) return -1;
            if (b === StageType.DEEP_RESEARCH) return 1;
            return 0;
        });

        return (
            <aside className={`${isCollapsed ? 'w-20' : 'w-64'} h-full bg-[#111118] border-r border-[rgba(239,68,68,0.1)] flex flex-col transition-all duration-300 relative`}>
                {/* Header with Back Button */}
                <div className={`p-4 flex items-center gap-3 border-b border-[rgba(255,255,255,0.05)] ${isCollapsed ? 'justify-center' : ''}`}>
                    <button
                        onClick={onBack}
                        className="w-8 h-8 rounded-lg hover:bg-[#1a1a22] flex items-center justify-center text-[#a8a4a0] hover:text-white transition-colors shrink-0"
                        title="Back to Dashboard"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    {!isCollapsed && (
                        <div className="flex-1 min-w-0 animate-fade-in">
                            <div className="text-[10px] font-bold text-[#ef4444] uppercase tracking-wider">Strategy</div>
                            <div className="text-sm font-medium text-white truncate" title={projectTitle}>{projectTitle}</div>
                        </div>
                    )}
                </div>

                {/* Stages Navigation */}
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-hide">
                    {!isCollapsed && (
                        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-[#6b6762] animate-fade-in">
                            Phases
                        </div>
                    )}
                    {sortedStages.map((stage) => {
                        const Icon = STAGE_ICONS[stage];
                        const isActive = activeStage === stage;

                        // Status Logic
                        const artifact = artifacts ? artifacts[stage] : null;
                        const isDone = artifact?.status === ArtifactStatus.VALIDATED;
                        const isGenerating = artifact?.status === ArtifactStatus.GENERATING;
                        const isDraft = artifact?.status === ArtifactStatus.DRAFT;
                        const hasContent = isDraft || isDone || isGenerating;

                        // Locking: phases are locked until AI generates content for them
                        // Deep Research is always accessible (entry point)
                        const isLocked = stage !== StageType.DEEP_RESEARCH && !hasContent;
                        const isClickable = !isLocked;

                        return (
                            <button
                                key={stage}
                                onClick={() => isClickable && onSelectStage?.(stage)}
                                disabled={isLocked}
                                className={`w-full flex items-center ${isCollapsed ? 'justify-center py-3' : 'gap-3 px-3 py-2.5'} rounded-lg text-sm transition-all group relative
                                    ${isLocked
                                        ? 'opacity-40 cursor-not-allowed'
                                        : isActive
                                            ? 'bg-[rgba(239,68,68,0.1)] text-[#ef4444] font-medium'
                                            : 'text-[#a8a4a0] hover:text-[#f5f0e6] hover:bg-[#1a1a22]'
                                    }`}
                                title={isCollapsed ? STAGE_LABELS[stage] : isLocked ? `${STAGE_LABELS[stage]} — Locked` : ''}
                            >
                                {isActive && !isLocked && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#ef4444] rounded-r-full shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                                )}

                                <div className="relative">
                                    {isLocked ? (
                                        <Lock className="w-4 h-4 text-[#4a4642]" />
                                    ) : (
                                        <Icon className={`w-4 h-4 ${isActive ? 'text-[#ef4444]' : 'text-[#6b6762] group-hover:text-[#a8a4a0]'} ${isGenerating ? 'animate-pulse text-[#ef4444]' : ''}`} />
                                    )}
                                    {/* Status Dot */}
                                    {artifacts && !isCollapsed && !isLocked && (
                                        <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full border-2 border-[#111118] 
                                            ${isDone ? 'bg-emerald-500' :
                                                isGenerating ? 'bg-[#ef4444] animate-ping' :
                                                    hasContent ? 'bg-amber-400' : 'hidden'}`}
                                        />
                                    )}
                                </div>

                                {!isCollapsed && (
                                    <span className="truncate flex-1 text-left ml-2">{STAGE_LABELS[stage]}</span>
                                )}

                                {/* Status label on right side */}
                                {!isCollapsed && isLocked && (
                                    <span className="text-[10px] text-[#4a4642] uppercase tracking-wider ml-auto">Locked</span>
                                )}
                                {!isCollapsed && isGenerating && (
                                    <span className="text-[10px] text-[#ef4444] animate-pulse ml-auto">Generating…</span>
                                )}
                                {!isCollapsed && !isLocked && !isGenerating && hasContent && (
                                    <span className={`text-[10px] uppercase tracking-wider ml-auto ${isDone ? 'text-emerald-500' : 'text-amber-400'}`}>
                                        {isDone ? 'Done' : 'Ready'}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* Bottom Tools (Contextual to Project) */}
                <div className="p-3 border-t border-[rgba(239,68,68,0.1)] space-y-1">

                    {/* Chat Toggle */}
                    <button
                        onClick={onToggleChat}
                        className={`w-full flex items-center ${isCollapsed ? 'justify-center py-3' : 'gap-3 px-3 py-2'} rounded-lg text-sm ${isChatOpen ? 'text-[#ef4444] bg-[rgba(239,68,68,0.05)]' : 'text-[#a8a4a0] hover:text-[#f5f0e6] hover:bg-[#1a1a22]'} transition-colors`}
                        title="Toggle Chat"
                    >
                        <MessageSquare className="w-4 h-4" />
                        {!isCollapsed && <span>AI Chat</span>}
                    </button>

                    {/* GitHub Sync */}
                    <button
                        onClick={onConnectGithub}
                        className={`w-full flex items-center ${isCollapsed ? 'justify-center py-3' : 'gap-3 px-3 py-2'} rounded-lg text-sm ${githubConnected ? 'text-emerald-500' : 'text-[#a8a4a0] hover:text-[#f5f0e6] hover:bg-[#1a1a22]'} transition-colors`}
                        title={githubConnected ? "GitHub Connected" : "Connect GitHub"}
                    >
                        <Github className="w-4 h-4" />
                        {!isCollapsed && <span>{githubConnected ? 'Synced' : 'Sync GitHub'}</span>}
                    </button>

                    {/* Collapse Toggle */}
                    <button
                        onClick={onToggleCollapse}
                        className={`w-full flex items-center ${isCollapsed ? 'justify-center py-3' : 'gap-3 px-3 py-2'} rounded-lg text-sm text-[#6b6762] hover:text-[#f5f0e6] hover:bg-[#1a1a22] transition-colors`}
                        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                        {!isCollapsed && <span>Collapse</span>}
                    </button>
                </div>
            </aside>
        );
    }

    // RENDER: Dashboard Mode (Global)
    return (
        <aside className="w-64 h-full bg-[#111118] border-r border-[rgba(239,68,68,0.1)] flex flex-col">
            {/* Logo */}
            <div className="p-4 flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-[#ef4444] to-[#b91c1c] rounded-lg flex items-center justify-center shadow-lg">
                    <span className="text-sm">🥋</span>
                </div>
            </div>

            {/* User Dropdown */}
            {user && (
                <div className="px-3 mb-4">
                    <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-[#1a1a22] hover:bg-[#2a2a36] transition-colors">
                        {user.avatar ? (
                            <img src={user.avatar} alt="" className="w-6 h-6 rounded-full" />
                        ) : (
                            <div className="w-6 h-6 bg-gradient-to-br from-[#ef4444] to-[#b91c1c] rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                                {displayName.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <span className="flex-1 text-left text-sm text-[#f5f0e6] font-medium truncate">
                            {displayName}'s Dojo
                        </span>
                        <ChevronDown className="w-4 h-4 text-[#6b6762]" />
                    </button>
                </div>
            )}

            {/* Main Nav */}
            <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => item.id === 'home' && onTabChange?.('home')}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${activeTab === 'home' && item.id === 'home'
                            ? 'bg-[rgba(239,68,68,0.1)] text-[#ef4444]'
                            : 'text-[#a8a4a0] hover:text-[#f5f0e6] hover:bg-[#1a1a22]'
                            }`}
                    >
                        <item.icon className="w-4 h-4" />
                        {item.label}
                    </button>
                ))}

                {/* Projects Section */}
                <div className="pt-4">
                    <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#6b6762]">
                        Strategies
                    </div>
                    {projectItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => onTabChange?.(item.id as any)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${activeTab === item.id
                                ? 'bg-[rgba(239,68,68,0.1)] text-[#ef4444]'
                                : 'text-[#a8a4a0] hover:text-[#f5f0e6] hover:bg-[#1a1a22]'
                                }`}
                        >
                            <item.icon className="w-4 h-4" />
                            {item.label}
                        </button>
                    ))}
                </div>

                {/* Resources Section */}
                <div className="pt-4">
                    <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#6b6762]">
                        Resources
                    </div>
                    {resourceItems.map((item) => (
                        <button
                            key={item.id}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#a8a4a0] hover:text-[#f5f0e6] hover:bg-[#1a1a22] transition-colors"
                        >
                            <item.icon className="w-4 h-4" />
                            {item.label}
                        </button>
                    ))}
                </div>
            </nav>

            {/* Bottom CTAs */}
            <div className="p-3 space-y-2 border-t border-[rgba(239,68,68,0.1)]">
                {/* Share CTA */}
                <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-[#1a1a22] hover:bg-[#2a2a36] transition-colors">
                    <div className="text-left">
                        <div className="text-sm font-medium text-[#f5f0e6]">Share BushidoOS</div>
                        <div className="text-xs text-[#6b6762]">Earn credits</div>
                    </div>
                    <Gift className="w-4 h-4 text-[#ef4444]" />
                </button>

                {/* Upgrade CTA */}
                <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-gradient-to-r from-[rgba(239,68,68,0.1)] to-[rgba(185,28,28,0.1)] border border-[rgba(239,68,68,0.2)] hover:border-[#ef4444] transition-colors">
                    <div className="text-left">
                        <div className="text-sm font-medium text-[#f5f0e6]">Upgrade to Pro</div>
                        <div className="text-xs text-[#6b6762]">Unlimited generations</div>
                    </div>
                    <Zap className="w-4 h-4 text-[#ef4444]" />
                </button>

                {/* Settings */}
                <button
                    onClick={onOpenSettings}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#6b6762] hover:text-[#f5f0e6] hover:bg-[#1a1a22] transition-colors"
                >
                    <Settings className="w-4 h-4" />
                    Settings
                </button>
            </div>
        </aside>
    );
};