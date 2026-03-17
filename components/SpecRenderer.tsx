import React, { useMemo, useState, useEffect } from 'react';
import { SpecSchema, FeatureSpec, PrdSchema } from '../types/beads';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AIConfig } from '../services/ai/types';
import { RoastModal } from './RoastModal';
import { runRoast, RoastResult } from '../services/ai/agents/roastService';
import { Flame, CheckCircle, Lock, Unlock } from 'lucide-react';
import { HandshakePanel } from './HandshakePanel';
import { ForemanDashboard } from './ForemanDashboard';

interface SpecRendererProps {
    content: string;
    aiConfig: AIConfig;
}

export const SpecRenderer: React.FC<SpecRendererProps> = React.memo(({ content, aiConfig }) => {
    // 1. Parse JSON
    const parsedSpec = useMemo(() => {
        try {
            const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
            if (jsonMatch) return JSON.parse(jsonMatch[1]) as SpecSchema;
            if (content.trim().startsWith('{')) return JSON.parse(content) as SpecSchema;
            return null;
        } catch (e) {
            return null;
        }
    }, [content]);

    // State for Foreman / General Contractor Flow
    const [approvedFeatures, setApprovedFeatures] = useState<Set<string>>(new Set());
    const [isSpecLocked, setIsSpecLocked] = useState(false);
    const [viewMode, setViewMode] = useState<'spec' | 'handshake' | 'build'>('spec');
    const [foremanStatus, setForemanStatus] = useState<'idle' | 'auditing' | 'review' | 'approved'>('idle');
    const [punchList, setPunchList] = useState<any>(null); // Mock punchlist

    // Roast State
    const [isRoastOpen, setIsRoastOpen] = useState(false);
    const [isRunningRoast, setIsRunningRoast] = useState(false);
    const [roastResult, setRoastResult] = useState<RoastResult | null>(null);

    // Auto-approve all features if strict compliance isn't needed for demo
    useEffect(() => {
        if (parsedSpec && approvedFeatures.size === 0) {
            // Optional: Pre-fill approval for easier demo flow
        }
    }, [parsedSpec]);

    const handleToggleApproval = (id: string) => {
        if (isSpecLocked) return;
        const newSet = new Set(approvedFeatures);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setApprovedFeatures(newSet);
    };

    const handleLockSpec = () => {
        setIsSpecLocked(true);
        setViewMode('handshake');
    };

    const handleStartBuild = () => {
        setViewMode('build');
        setForemanStatus('auditing');
        // Simulate Audit Delay — TODO: Wire to real verificationService when WebContainer/GitHub API is available
        setTimeout(() => {
            setForemanStatus('review');
            setPunchList({
                id: `punchlist-${Date.now()}`,
                score: 85,
                items: [
                    { violation: 'Missing Auth Error Handling', fix: 'Add try/catch block in login flow', severity: 'critical' },
                    { violation: 'Button Color Mismatch', fix: 'Use var(--bushido-red) instead of #ff0000', severity: 'warning' }
                ]
            });
        }, 3000);
    };

    const handleReAudit = () => {
        setForemanStatus('auditing');
        setTimeout(() => {
            setForemanStatus('approved');
            setPunchList({ id: 'punchlist-002', score: 100, items: [] });
        }, 2000);
    };

    const handleRunRoast = async () => {
        if (!parsedSpec) return;
        setIsRoastOpen(true);
        if (!roastResult) {
            setIsRunningRoast(true);
            try {
                const result = await runRoast(parsedSpec, aiConfig);
                setRoastResult(result);
            } catch (e) {
                console.error("Roast failed", e);
            } finally {
                setIsRunningRoast(false);
            }
        }
    };

    // Fallback to Markdown
    if (!parsedSpec) {
        return (
            <div className="prose prose-invert max-w-none text-slate-300">
                <div className="bg-yellow-900/20 border border-yellow-800 p-4 rounded-lg mb-4 text-yellow-200 text-sm">
                    ⚠️ Content is not strict JSON. Rendering as standard markdown.
                </div>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
        );
    }

    const allApproved = parsedSpec.features.every(f => approvedFeatures.has(f.id));

    return (
        <div className="animate-fade-in space-y-8 relative">
            <RoastModal
                isOpen={isRoastOpen}
                onClose={() => setIsRoastOpen(false)}
                isRunning={isRunningRoast}
                result={roastResult}
            />

            {/* Header */}
            <div className="border-b border-slate-800 pb-6 flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">{parsedSpec.title}</h1>
                    <div className="flex items-center gap-4 text-sm text-slate-400 font-mono">
                        <span>v{parsedSpec.version}</span>
                        <span>•</span>
                        {!isSpecLocked ? (
                            <span className="text-amber-500 flex items-center gap-1"><Unlock className="w-3 h-3" /> Draft</span>
                        ) : (
                            <span className="text-emerald-500 flex items-center gap-1"><Lock className="w-3 h-3" /> Locked</span>
                        )}
                    </div>
                </div>
                {!isSpecLocked && (
                    <button
                        onClick={handleRunRoast}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-lg shadow-red-900/20 transition-all border border-red-500/50"
                    >
                        <Flame className="w-4 h-4" />
                        Roast Spec
                    </button>
                )}
            </div>

            {/* Constraints Grid (Hidden in Build Mode to save space) */}
            {viewMode === 'spec' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
                        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Tech Stack</h3>
                        <div className="flex flex-wrap gap-2">
                            {parsedSpec.constraints.techStack.map(tech => (
                                <span key={tech} className="px-3 py-1 bg-blue-900/30 text-blue-300 border border-blue-800 rounded-full text-xs font-medium">
                                    {tech}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
                        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Coding Standards</h3>
                        <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
                            {parsedSpec.constraints.codingStandards.map(std => (
                                <li key={std}>{std}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* Features List */}
            <div>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="w-1 h-6 bg-red-500 rounded-full"></span>
                        Functional Requirements
                    </h2>
                    {!isSpecLocked && (
                        <div className="text-xs text-slate-500">
                            {approvedFeatures.size} / {parsedSpec.features.length} Approved
                        </div>
                    )}
                </div>

                <div className="grid gap-4">
                    {parsedSpec.features.map(feature => (
                        <FeatureCard
                            key={feature.id}
                            feature={feature}
                            isApproved={approvedFeatures.has(feature.id)}
                            onToggle={() => handleToggleApproval(feature.id)}
                            isLocked={isSpecLocked}
                        />
                    ))}
                </div>

                {/* Approve & Lock Action */}
                {!isSpecLocked && (
                    <div className="mt-8 flex justify-end">
                        <button
                            disabled={!allApproved}
                            onClick={handleLockSpec}
                            className={`px-6 py-3 rounded-lg font-bold uppercase tracking-wider text-sm flex items-center gap-2 transition-all ${allApproved
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-900/20'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                }`}
                        >
                            <Lock className="w-4 h-4" />
                            Approve & Lock Spec
                        </button>
                    </div>
                )}
            </div>

            {/* HANDSHAKE PANEL */}
            {viewMode === 'handshake' && (
                <HandshakePanel
                    prd={parsedSpec as unknown as PrdSchema}
                    onDownload={() => {
                        const blob = new Blob([JSON.stringify(parsedSpec, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${parsedSpec.title?.replace(/\s+/g, '_').toLowerCase() || 'spec'}_prd.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                    }}
                    onCopy={() => {
                        const specContext = JSON.stringify(parsedSpec, null, 2);
                        navigator.clipboard.writeText(specContext).then(() => {
                            // Briefly indicate success via a subtle visual cue
                            // (no toast available here — SpecRenderer doesn't have onToast prop)
                        });
                    }}
                    onStartBuild={handleStartBuild}
                />
            )}

            {/* FOREMAN DASHBOARD */}
            {viewMode === 'build' && (
                <ForemanDashboard
                    status={foremanStatus}
                    punchList={punchList}
                    onReAudit={handleReAudit}
                    onApprove={() => alert('Project Launched!')}
                />
            )}
        </div>
    );
});

SpecRenderer.displayName = 'SpecRenderer';

const PRIORITY_COLORS: Record<string, string> = {
    critical: 'bg-red-500/20 text-red-300 border-red-900',
    high: 'bg-orange-500/20 text-orange-300 border-orange-900',
    medium: 'bg-blue-500/20 text-blue-300 border-blue-900',
    low: 'bg-slate-500/20 text-slate-300 border-slate-700'
};

interface FeatureCardProps {
    feature: FeatureSpec;
    isApproved: boolean;
    onToggle: () => void;
    isLocked: boolean;
}

const FeatureCard: React.FC<FeatureCardProps> = React.memo(({ feature, isApproved, onToggle, isLocked }) => {
    return (
        <div
            className={`
                p-5 rounded-xl border transition-all duration-300 group
                ${isApproved
                    ? 'bg-slate-900/30 border-emerald-900/30'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }
            `}
        >
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <button
                        onClick={onToggle}
                        disabled={isLocked}
                        className={`mt-1 w-5 h-5 rounded border flex items-center justify-center transition-colors ${isApproved
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'bg-transparent border-slate-600 hover:border-emerald-500'
                            } ${isLocked ? 'cursor-default opacity-50' : 'cursor-pointer'}`}
                    >
                        {isApproved && <CheckCircle className="w-3.5 h-3.5" />}
                    </button>

                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <span className="font-mono text-xs text-slate-500">#{feature.id}</span>
                            <h3 className={`text-lg font-bold transition-colors ${isApproved ? 'text-emerald-50 text-opacity-80' : 'text-slate-100'}`}>
                                {feature.name}
                            </h3>
                        </div>
                    </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${PRIORITY_COLORS[feature.priority] || PRIORITY_COLORS.low}`}>
                    {feature.priority}
                </span>
            </div>

            <div className="pl-9">
                <p className="text-sm text-slate-400 italic mb-4 border-l-2 border-slate-700 pl-3">
                    "{feature.userStory}"
                </p>

                <div className="bg-slate-950/50 rounded-lg p-3">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Acceptance Criteria</h4>
                    <ul className="space-y-1">
                        {feature.acceptanceCriteria.map((ac, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                                <div className={`mt-1.5 w-1 h-1 rounded-full ${isApproved ? 'bg-emerald-500' : 'bg-green-500/50'}`}></div>
                                <span className={isApproved ? 'text-slate-400 line-through' : ''}>{ac}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
});

FeatureCard.displayName = 'FeatureCard';
