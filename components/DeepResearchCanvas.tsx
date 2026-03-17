import React, { useRef, useEffect, useState, useMemo } from 'react';
import { ResearchLog, ResearchPillar, Source, StageType } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Globe, Database, UserCheck, Layers, FileText, Map as MapIcon, ChevronDown, ChevronRight, Send, Brain, Loader2, RefreshCw, StopCircle, AlertTriangle } from 'lucide-react';

/** Renders basic inline markdown (bold, italic) as React elements */
function renderInlineMarkdown(text: string): React.ReactNode {
    // Split on **bold** and *italic* patterns
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
        // Match **bold** first (greedy)
        const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
        // Match *italic* 
        const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/);

        // Find the earliest match
        const boldIdx = boldMatch ? remaining.indexOf(boldMatch[0]) : Infinity;
        const italicIdx = italicMatch ? remaining.indexOf(italicMatch[0]) : Infinity;

        if (boldIdx === Infinity && italicIdx === Infinity) {
            parts.push(remaining);
            break;
        }

        if (boldIdx <= italicIdx && boldMatch) {
            if (boldIdx > 0) parts.push(remaining.slice(0, boldIdx));
            parts.push(<strong key={key++} className="font-semibold text-zinc-200">{boldMatch[1]}</strong>);
            remaining = remaining.slice(boldIdx + boldMatch[0].length);
        } else if (italicMatch) {
            if (italicIdx > 0) parts.push(remaining.slice(0, italicIdx));
            parts.push(<em key={key++}>{italicMatch[1]}</em>);
            remaining = remaining.slice(italicIdx + italicMatch[0].length);
        }
    }

    return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : <>{parts}</>;
}

interface DeepResearchCanvasProps {
    idea: string;
    logs: ResearchLog[];
    plan: string[];
    pillars?: ResearchPillar[];
    content: string;
    sources: Source[];
    isPlanning?: boolean;
    isGenerating?: boolean;
    pipelineError?: string | null;
    onApprovePlan?: () => void;
    onCancelPlan?: () => void;
    onRevise?: (instruction: string) => void;
    onRegenerate?: () => void;
    onToggleSidebar?: () => void;
}

const PILLAR_ICONS: Record<string, React.ElementType> = {
    MARKET_ANALYSIS: Database,
    USER_PERSONA: UserCheck,
    SOLUTION_CONCEPT: Layers,
    PRODUCT_SPEC: FileText,
    EXECUTION_ROADMAP: MapIcon,
};

const PILLAR_COLORS: Record<string, string> = {
    MARKET_ANALYSIS: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    USER_PERSONA: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    SOLUTION_CONCEPT: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    PRODUCT_SPEC: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    EXECUTION_ROADMAP: 'text-red-400 bg-red-500/10 border-red-500/20',
};

export const DeepResearchCanvas: React.FC<DeepResearchCanvasProps> = ({
    idea, logs, plan, pillars, content, sources, isPlanning, isGenerating, pipelineError, onApprovePlan, onCancelPlan, onRevise, onRegenerate, onToggleSidebar
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const logsEndRef = useRef<HTMLDivElement>(null);
    const [thoughtsOpen, setThoughtsOpen] = useState(true);
    const [reviseText, setReviseText] = useState('');
    const [wasAutoCollapsed, setWasAutoCollapsed] = useState(false);
    const [planVisible, setPlanVisible] = useState(false);
    const [postPlanOpen, setPostPlanOpen] = useState(false);

    const hasPillars = pillars && pillars.length > 0;
    const hasPlan = plan.length > 0 || hasPillars;
    const hasContent = !!content;
    const isThinking = isGenerating && logs.length > 0 && !hasPlan && !hasContent;
    const isAborted = !isGenerating && !hasPlan && !hasContent && logs.length > 0;

    // Derived states for clarity
    const showPlanCards = isPlanning && hasPlan && planVisible;
    const showEmptyState = !isGenerating && !hasPlan && !hasContent;
    const showInitialSpinner = isGenerating && logs.length === 0 && !hasPlan && !hasContent;

    // Auto-scroll only for the latest log entry
    useEffect(() => {
        if (thoughtsOpen && logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [logs.length, thoughtsOpen]);

    // Sequenced animation: thoughts collapse → delay → plan fades in
    useEffect(() => {
        if (hasPlan && !wasAutoCollapsed) {
            // Step 1: Collapse thoughts after a brief display period
            const collapseTimer = setTimeout(() => {
                setThoughtsOpen(false);
                setWasAutoCollapsed(true);
            }, 1000);
            return () => clearTimeout(collapseTimer);
        }
    }, [hasPlan, wasAutoCollapsed]);

    // Step 2: Show plan cards AFTER thoughts have collapsed
    useEffect(() => {
        if (wasAutoCollapsed && hasPlan && !planVisible) {
            const revealTimer = setTimeout(() => {
                setPlanVisible(true);
            }, 500); // Wait for collapse animation to finish
            return () => clearTimeout(revealTimer);
        }
    }, [wasAutoCollapsed, hasPlan, planVisible]);

    // If plan is already visible on mount (e.g. restored from persistence), show immediately
    useEffect(() => {
        if (hasPlan && !isGenerating && !planVisible) {
            setPlanVisible(true);
            setThoughtsOpen(false);
            setWasAutoCollapsed(true);
        }
    }, []);

    // Reset states when logs are cleared (new generation)
    useEffect(() => {
        if (logs.length === 0) {
            setWasAutoCollapsed(false);
            setPlanVisible(false);
            setThoughtsOpen(true);
        }
    }, [logs.length]);

    const handleReviseSubmit = () => {
        const text = reviseText.trim();
        if (!text || !onRevise) return;
        setReviseText('');
        setWasAutoCollapsed(false);
        onRevise(text);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleReviseSubmit();
        }
    };

    // Determine header title and status
    const headerTitle = hasContent ? 'Research Brief' : isPlanning ? 'Bushido Strategy Plan' : 'Deep Research';
    const statusDot = hasContent ? 'bg-emerald-500' : isGenerating ? 'bg-red-500 animate-pulse' : hasPlan ? 'bg-yellow-500' : 'bg-zinc-600';

    return (
        <div className="flex flex-col h-screen w-full bg-black text-zinc-100 font-sans overflow-hidden relative z-0">

            {/* Header */}
            <div className="px-4 md:px-8 py-5 border-b border-zinc-800 shrink-0 bg-black/80 backdrop-blur-xl relative overflow-hidden z-10">
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-orange-500/5"></div>
                <div className="relative z-10 flex items-center gap-3">

                    {/* Mobile Menu Toggle */}
                    <div className="md:hidden flex items-center">
                        {onToggleSidebar && (
                            <button
                                onClick={onToggleSidebar}
                                className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors rounded-lg hover:bg-zinc-800"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                        )}
                    </div>

                    <div className={`w-2.5 h-2.5 rounded-full ${statusDot}`}></div>
                    <div className="flex-1">
                        <h1 className="text-lg font-bold text-white font-sans tracking-tight truncate">
                            {headerTitle}
                        </h1>
                        <p className="text-xs text-zinc-500 line-clamp-1 font-sans mt-0.5">{idea}</p>
                    </div>
                    {/* Stop button in header during generation */}
                    {isGenerating && (
                        <button
                            onClick={onCancelPlan}
                            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 text-zinc-400 hover:text-white rounded-lg transition-all text-xs font-medium font-sans"
                        >
                            <StopCircle className="w-3.5 h-3.5" />
                            Stop
                        </button>
                    )}
                </div>
            </div>

            {/* Scrollable vertical content */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-default">
                <div className="max-w-4xl mx-auto px-6 md:px-12 py-8 space-y-6">

                    {/* ─── THINKING PROCESS (Collapsible) ─── */}
                    {logs.length > 0 && (
                        <div className={`rounded-xl border transition-all duration-300 overflow-hidden ${thoughtsOpen
                            ? 'border-zinc-700/50 bg-zinc-900/60 backdrop-blur'
                            : 'border-zinc-800/30 bg-zinc-900/20'
                            }`}>
                            {/* Toggle header */}
                            <button
                                onClick={() => setThoughtsOpen(!thoughtsOpen)}
                                className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-white/[0.02] transition-colors group"
                            >
                                <Brain className={`w-4 h-4 transition-colors ${isThinking ? 'text-red-400 animate-pulse' : 'text-zinc-500'}`} />
                                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest flex-1 font-sans">
                                    Thinking Process
                                </span>
                                <span className="text-[10px] text-zinc-600 font-mono">
                                    {(() => {
                                        const elapsed = logs.length > 1
                                            ? Math.round((logs[logs.length - 1].timestamp - logs[0].timestamp) / 1000)
                                            : 0;
                                        return isThinking ? `${elapsed}s` : `thought for ${elapsed}s`;
                                    })()}
                                </span>
                                {thoughtsOpen
                                    ? <ChevronDown className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                                    : <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                                }
                            </button>

                            {/* Collapsible log body — using grid-row for smooth collapse */}
                            <div className="grid transition-[grid-template-rows] duration-500 ease-in-out" style={{ gridTemplateRows: thoughtsOpen ? '1fr' : '0fr' }}>
                                <div className="overflow-hidden">
                                    <div className="px-5 pb-4 overflow-y-auto max-h-[360px] scrollbar-default">
                                        <p className="text-xs text-zinc-300/80 leading-relaxed font-sans whitespace-pre-wrap">
                                            {logs.map((log) => (
                                                <span key={log.id}>{renderInlineMarkdown(log.message)} </span>
                                            ))}
                                            {isThinking && <span className="inline-block h-3 w-1.5 bg-red-500 animate-pulse align-middle rounded-sm ml-0.5"></span>}
                                        </p>
                                        <div ref={logsEndRef} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ─── INITIAL LOADING (no thoughts yet) ─── */}
                    {showInitialSpinner && (
                        <div className="flex flex-col items-center justify-center py-24 text-zinc-600">
                            <Globe className="w-14 h-14 mb-4 animate-pulse text-red-500/40" strokeWidth={1} />
                            <p className="text-sm font-medium font-sans">Gathering Intelligence...</p>
                        </div>
                    )}

                    {/* ─── EMPTY STATE (aborted before plan, or no data) ─── */}
                    {showEmptyState && (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-6">
                                <Globe className="w-8 h-8 text-zinc-600" strokeWidth={1.5} />
                            </div>
                            <h3 className="text-lg font-bold text-zinc-300 font-sans mb-2">
                                {logs.length > 0 ? 'Generation Stopped' : 'No Research Plan'}
                            </h3>
                            <p className="text-sm text-zinc-500 font-sans max-w-md mb-8 leading-relaxed">
                                {logs.length > 0
                                    ? 'The research was stopped before a plan could be generated. You can regenerate to start fresh.'
                                    : 'Start by generating a research plan to explore your idea.'
                                }
                            </p>
                            {onRegenerate && (
                                <button
                                    onClick={onRegenerate}
                                    className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg shadow-lg shadow-red-900/20 transition-all transform hover:-translate-y-0.5 font-sans"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Regenerate Plan
                                </button>
                            )}
                        </div>
                    )}

                    {/* ─── PLAN / PILLAR CARDS ─── */}
                    {isPlanning && hasPlan && (
                        <div
                            className="w-full bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 md:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden transition-all duration-700 ease-out"
                            style={{
                                opacity: planVisible ? 1 : 0,
                                transform: planVisible ? 'translateY(0)' : 'translateY(20px)',
                            }}
                        >
                            {/* Decorative */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-40"></div>
                            <div className="absolute -top-20 -right-20 w-64 h-64 bg-red-500/10 rounded-full blur-3xl pointer-events-none"></div>

                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-3 font-sans">
                                        <span className="flex items-center justify-center w-8 h-8 rounded bg-red-500/20 text-red-500">
                                            <Globe className="w-5 h-5" />
                                        </span>
                                        Mission Checkpoint
                                    </h2>
                                    <div className={`px-3 py-1 rounded-full text-xs font-mono border ${isGenerating
                                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse'
                                        : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                        }`}>
                                        {isGenerating ? 'GENERATING...' : 'AWAITING APPROVAL'}
                                    </div>
                                </div>

                                {hasPillars ? (
                                    <div className="mb-6 space-y-4">
                                        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4 font-sans">Research Plan — Bushido Pillars</h3>
                                        <div className="space-y-3">
                                            {pillars!.map((pillar, i) => {
                                                const Icon = PILLAR_ICONS[pillar.stage] || Globe;
                                                const colorClasses = PILLAR_COLORS[pillar.stage] || 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
                                                const [textColor, bgColor, borderColor] = colorClasses.split(' ');
                                                return (
                                                    <div key={i} className={`bg-black/40 rounded-xl border ${borderColor} overflow-hidden`}>
                                                        <div className={`flex items-center gap-3 px-4 py-3 border-b ${borderColor}`}>
                                                            <div className={`w-7 h-7 rounded-lg ${bgColor} flex items-center justify-center`}>
                                                                <Icon className={`w-4 h-4 ${textColor}`} />
                                                            </div>
                                                            <span className={`text-sm font-bold ${textColor} font-sans uppercase tracking-wide`}>
                                                                {pillar.label}
                                                            </span>
                                                            <span className="ml-auto text-[10px] font-mono text-zinc-600">
                                                                {pillar.goals.length} {pillar.goals.length === 1 ? 'goal' : 'goals'}
                                                            </span>
                                                        </div>
                                                        <div className="px-4 py-2">
                                                            {pillar.goals.map((goal, gIdx) => (
                                                                <div key={gIdx} className="flex items-start gap-3 py-2 group">
                                                                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-mono text-zinc-500 mt-0.5 border border-zinc-700 group-hover:border-zinc-600 transition-colors">
                                                                        {gIdx + 1}
                                                                    </span>
                                                                    <span className="text-zinc-300 text-sm leading-relaxed font-sans">
                                                                        {renderInlineMarkdown(goal)}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mb-6">
                                        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4 font-sans">Proposed Research Plan</h3>
                                        <div className="bg-black/40 rounded-xl p-2 border border-white/5">
                                            <ul className="space-y-1">
                                                {plan.map((step, i) => (
                                                    <li key={i} className="flex items-start gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors">
                                                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-mono text-zinc-400 mt-0.5 border border-zinc-700">
                                                            {i + 1}
                                                        </span>
                                                        <span className="text-zinc-300 text-sm leading-relaxed font-sans">
                                                            {step.replace(/^\d+\.\s*/, '').replace(/^- /, '')}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                )}

                                {/* Pipeline Error Banner */}
                                {pipelineError && (
                                    <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                                        <div className="flex items-start gap-3">
                                            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-sm font-semibold text-red-300 font-sans mb-1">Execution Failed</p>
                                                <p className="text-xs text-red-400/80 font-sans leading-relaxed">{pipelineError}</p>
                                                <p className="text-xs text-zinc-500 font-sans mt-2">Your plan is preserved. You can retry or regenerate a new plan.</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex items-center gap-3 pt-4 border-t border-zinc-800/50">
                                    <button
                                        onClick={onApprovePlan}
                                        disabled={isGenerating}
                                        className="flex-1 py-3 px-6 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg shadow-lg shadow-red-900/20 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 group font-sans disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                                    >
                                        <span>{pipelineError ? 'Retry Execution' : 'Execute Mission'}</span>
                                        <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                        </svg>
                                    </button>
                                    {onRegenerate && !isGenerating && (
                                        <button
                                            onClick={onRegenerate}
                                            className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg transition-colors border border-zinc-700 hover:border-zinc-600 font-sans flex items-center gap-2 text-sm font-medium"
                                        >
                                            <RefreshCw className="w-3.5 h-3.5" />
                                            Regenerate
                                        </button>
                                    )}
                                    {isGenerating && (
                                        <button
                                            onClick={onCancelPlan}
                                            className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg transition-colors border border-zinc-700 hover:border-zinc-600 font-sans flex items-center gap-2 text-sm font-medium"
                                        >
                                            <StopCircle className="w-3.5 h-3.5" />
                                            Stop
                                        </button>
                                    )}
                                </div>

                                <p className="text-center text-[10px] text-zinc-600 mt-4 font-mono">
                                    Estimated Cost: ~{(hasPillars ? pillars!.reduce((sum, p) => sum + p.goals.length, 0) : plan.length) * 2} Research Credits
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ─── COLLAPSED PLAN VIEW (persists after execution) ─── */}
                    {!isPlanning && hasPlan && (
                        <div className={`rounded-xl border transition-all duration-300 overflow-hidden ${postPlanOpen
                            ? 'border-zinc-700/50 bg-zinc-900/60 backdrop-blur'
                            : 'border-zinc-800/30 bg-zinc-900/20'
                            }`}>
                            <button
                                onClick={() => setPostPlanOpen(!postPlanOpen)}
                                className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-white/[0.02] transition-colors group"
                            >
                                <Globe className={`w-4 h-4 text-zinc-500`} />
                                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest flex-1 font-sans">
                                    Research Plan
                                </span>
                                <span className="text-[10px] text-zinc-600 font-mono">
                                    {hasPillars ? `${pillars!.length} pillars` : `${plan.length} steps`}
                                </span>
                                {postPlanOpen
                                    ? <ChevronDown className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                                    : <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                                }
                            </button>

                            <div className="grid transition-[grid-template-rows] duration-500 ease-in-out" style={{ gridTemplateRows: postPlanOpen ? '1fr' : '0fr' }}>
                                <div className="overflow-hidden">
                                    <div className="px-5 pb-4">
                                        {hasPillars ? (
                                            <div className="space-y-2">
                                                {pillars!.map((pillar, i) => {
                                                    const Icon = PILLAR_ICONS[pillar.stage] || Globe;
                                                    const colorClasses = PILLAR_COLORS[pillar.stage] || 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
                                                    const [textColor, bgColor] = colorClasses.split(' ');
                                                    return (
                                                        <div key={i} className="flex items-start gap-3 py-1.5">
                                                            <div className={`w-5 h-5 rounded ${bgColor} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                                                                <Icon className={`w-3 h-3 ${textColor}`} />
                                                            </div>
                                                            <div className="text-xs text-zinc-400 font-sans">
                                                                <span className={`font-semibold ${textColor}`}>{pillar.label}:</span>{' '}
                                                                {pillar.goals.join(' · ')}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <ol className="space-y-1.5">
                                                {plan.map((step, i) => (
                                                    <li key={i} className="flex items-start gap-3 text-xs text-zinc-400 font-sans">
                                                        <span className="flex-shrink-0 w-4 h-4 rounded-full bg-zinc-800 flex items-center justify-center text-[9px] font-mono text-zinc-500 mt-0.5 border border-zinc-700">
                                                            {i + 1}
                                                        </span>
                                                        {step.replace(/^\d+\.\s*/, '').replace(/^- /, '')}
                                                    </li>
                                                ))}
                                            </ol>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Post-execution: rendered content */}
                    {hasContent && (
                        <div className="prose prose-invert prose-zinc max-w-none">
                            <MarkdownRenderer content={content} />
                        </div>
                    )}

                    {/* Sources tray */}
                    {sources.length > 0 && (
                        <div className="pt-6 border-t border-zinc-800">
                            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 ml-1">Verified Sources</h4>
                            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                {sources.map((source, idx) => (
                                    <a
                                        key={idx}
                                        href={source.uri}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg min-w-[200px] max-w-[250px] hover:border-red-500/50 hover:bg-zinc-800 transition-all group"
                                    >
                                        <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-500 group-hover:bg-red-600 group-hover:text-white transition-colors">
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-medium text-zinc-300 truncate group-hover:text-white transition-colors">{source.title}</div>
                                            <div className="text-[10px] text-zinc-500 truncate">{new URL(source.uri).hostname}</div>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ─── REVISION TEXT BOX (sticky bottom) ─── */}
            {isPlanning && hasPlan && onRevise && !isGenerating && (
                <div className="shrink-0 border-t border-zinc-800 bg-black/90 backdrop-blur-xl px-6 md:px-12 py-4">
                    <div className="max-w-4xl mx-auto">
                        <p className="text-[10px] text-zinc-500 mb-2 font-sans uppercase tracking-wider">
                            Want to change something? Describe your revision below.
                        </p>
                        <div className="flex items-end gap-3">
                            <div className="flex-1 relative">
                                <textarea
                                    value={reviseText}
                                    onChange={(e) => setReviseText(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="e.g. Focus more on B2B market, remove consumer analysis..."
                                    rows={2}
                                    className="w-full bg-zinc-900/80 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 resize-none font-sans transition-colors"
                                />
                            </div>
                            <button
                                onClick={handleReviseSubmit}
                                disabled={!reviseText.trim()}
                                className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 text-zinc-300 hover:text-white rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 font-sans text-sm font-medium shrink-0"
                            >
                                <Send className="w-4 h-4" />
                                Revise
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};