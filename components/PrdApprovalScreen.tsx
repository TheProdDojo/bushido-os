import React, { useState, useMemo } from 'react';
import { PrdSchema, UserStory } from '../types/beads';
import { CheckCircle, Circle, ChevronDown, ChevronRight, Lock, RotateCcw, Loader2, FileText, ArrowRight } from 'lucide-react';
import { PipelineProgress } from './PipelineProgress';

interface PrdApprovalScreenProps {
    prd: PrdSchema | null;
    isGenerating: boolean;
    onLockAndHandshake: (approvedPrd: PrdSchema) => void;
    onRequestChanges: (feedback: string) => void;
    onGoBack?: () => void;
}

const StoryCard: React.FC<{
    story: UserStory;
    isApproved: boolean;
    onToggleApprove: () => void;
    onToggleCriteria: (index: number) => void;
    checkedCriteria: Set<number>;
}> = ({ story, isApproved, onToggleApprove, onToggleCriteria, checkedCriteria }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    const priorityColors: Record<string, string> = {
        critical: 'bg-red-500/20 text-red-400 border-red-500/30',
        high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
        medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        low: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
    };

    return (
        <div className={`rounded-xl border transition-all duration-200 ${isApproved
            ? 'border-emerald-500/40 bg-emerald-500/5'
            : 'border-zinc-800 bg-zinc-900/20'
            }`}>
            {/* Header */}
            <div className="flex items-start gap-3 p-4">
                {/* Approve Toggle */}
                <button
                    onClick={onToggleApprove}
                    className={`mt-0.5 shrink-0 transition-colors ${isApproved ? 'text-emerald-500' : 'text-zinc-600 hover:text-zinc-400'
                        }`}
                >
                    {isApproved
                        ? <CheckCircle className="w-5 h-5" />
                        : <Circle className="w-5 h-5" />
                    }
                </button>

                {/* Story Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono text-zinc-500">{story.id}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase ${priorityColors[story.priority] || priorityColors.medium}`}>
                            {story.priority}
                        </span>
                    </div>
                    <p className="text-sm text-white leading-relaxed">{story.story}</p>
                </div>

                {/* Expand */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-zinc-500 hover:text-zinc-300 shrink-0 mt-0.5"
                >
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
            </div>

            {/* Acceptance Criteria */}
            {isExpanded && story.acceptanceCriteria.length > 0 && (
                <div className="px-4 pb-4 pl-12 space-y-1.5">
                    <p className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider mb-2">Acceptance Criteria</p>
                    {story.acceptanceCriteria.map((criteria, idx) => (
                        <div
                            key={idx}
                            onClick={() => onToggleCriteria(idx)}
                            className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-all ${checkedCriteria.has(idx)
                                ? 'bg-emerald-500/5'
                                : 'hover:bg-zinc-800/50'
                                }`}
                        >
                            <div className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${checkedCriteria.has(idx)
                                ? 'border-emerald-500 bg-emerald-500'
                                : 'border-zinc-600'
                                }`}>
                                {checkedCriteria.has(idx) && (
                                    <CheckCircle className="w-3 h-3 text-white" />
                                )}
                            </div>
                            <p className={`text-xs ${checkedCriteria.has(idx) ? 'text-zinc-300' : 'text-zinc-500'}`}>
                                {criteria}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export const PrdApprovalScreen: React.FC<PrdApprovalScreenProps> = ({
    prd, isGenerating, onLockAndHandshake, onRequestChanges, onGoBack
}) => {
    const [approvedStories, setApprovedStories] = useState<Set<string>>(new Set());
    const [criteriaChecked, setCriteriaChecked] = useState<Record<string, Set<number>>>({});

    const toggleStoryApproval = (storyId: string) => {
        setApprovedStories(prev => {
            const next = new Set(prev);
            if (next.has(storyId)) next.delete(storyId);
            else next.add(storyId);
            return next;
        });
    };

    const toggleCriteria = (storyId: string, index: number) => {
        setCriteriaChecked(prev => {
            const current = new Set(prev[storyId] || []);
            if (current.has(index)) current.delete(index);
            else current.add(index);
            return { ...prev, [storyId]: current };
        });
    };

    const allApproved = prd ? approvedStories.size === prd.stories.length : false;
    const totalCriteria = prd?.stories.reduce((acc, s) => acc + s.acceptanceCriteria.length, 0) || 0;
    const checkedCriteriaCount = Object.values(criteriaChecked).reduce((acc, s) => acc + s.size, 0);

    // Loading state
    if (isGenerating) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-6">
                    <div className="relative w-20 h-20 mx-auto">
                        <div className="absolute inset-0 border-4 border-amber-500/20 rounded-full" />
                        <div className="absolute inset-0 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
                        <FileText className="absolute inset-0 m-auto w-8 h-8 text-amber-500 animate-pulse" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white mb-1">Product Agent Working...</h3>
                        <p className="text-sm text-zinc-400">Extracting user stories and acceptance criteria from strategy</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!prd) return null;

    return (
        <div className="flex-1 overflow-y-auto scrollbar-default">
            <PipelineProgress
                currentStep="prd"
                onNavigateBack={onGoBack}
                backLabel="Back to Strategy Review"
            />
            <div className="w-full max-w-4xl mx-auto p-8 md:p-12 space-y-8">

                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-500/10 rounded-xl">
                            <FileText className="w-8 h-8 text-amber-500" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white tracking-wide">PRD Approval</h2>
                            <p className="text-sm text-zinc-400 mt-0.5">
                                Review each user story and approve before handshake
                            </p>
                        </div>
                    </div>
                </div>

                {/* Non-Negotiables */}
                {prd.nonNegotiables.length > 0 && (
                    <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-red-400 mb-3 flex items-center gap-2">
                            <Lock className="w-3 h-3" />
                            Non-Negotiables
                        </h3>
                        <ul className="space-y-1.5">
                            {prd.nonNegotiables.map((nn, i) => (
                                <li key={i} className="text-xs text-zinc-300 flex items-start gap-2">
                                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                                    {nn}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Stats Bar */}
                <div className="flex items-center gap-6 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
                    <div>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider">Stories</p>
                        <p className="text-lg font-bold text-white">
                            <span className="text-emerald-400">{approvedStories.size}</span>
                            <span className="text-zinc-600">/{prd.stories.length}</span>
                        </p>
                    </div>
                    <div className="w-px h-8 bg-zinc-800" />
                    <div>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider">Criteria</p>
                        <p className="text-lg font-bold text-white">
                            <span className="text-emerald-400">{checkedCriteriaCount}</span>
                            <span className="text-zinc-600">/{totalCriteria}</span>
                        </p>
                    </div>
                    <div className="ml-auto">
                        <button
                            onClick={() => {
                                // Approve all
                                const allIds = new Set(prd.stories.map(s => s.id));
                                setApprovedStories(allIds);
                                const allCriteria: Record<string, Set<number>> = {};
                                prd.stories.forEach(s => {
                                    allCriteria[s.id] = new Set(s.acceptanceCriteria.map((_, i) => i));
                                });
                                setCriteriaChecked(allCriteria);
                            }}
                            className="text-xs text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-all"
                        >
                            Approve All
                        </button>
                    </div>
                </div>

                {/* Stories */}
                <div className="space-y-4">
                    {prd.stories.map(story => (
                        <StoryCard
                            key={story.id}
                            story={story}
                            isApproved={approvedStories.has(story.id)}
                            onToggleApprove={() => toggleStoryApproval(story.id)}
                            onToggleCriteria={(idx) => toggleCriteria(story.id, idx)}
                            checkedCriteria={criteriaChecked[story.id] || new Set()}
                        />
                    ))}
                </div>

                {/* Action Bar */}
                <div className="sticky bottom-0 bg-gradient-to-t from-[var(--bushido-ink)] pt-6 pb-2">
                    <div className="flex gap-3">
                        <button
                            onClick={() => {
                                const unapproved = prd.stories.filter(s => !approvedStories.has(s.id));
                                const feedback = unapproved.map(s => `Rejected: ${s.id} — ${s.story}`).join('\n');
                                onRequestChanges(feedback || 'Please revise the PRD.');
                            }}
                            className="flex-1 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Request Changes
                        </button>
                        <button
                            onClick={() => {
                                // Build final PRD with passes set
                                const finalPrd: PrdSchema = {
                                    ...prd,
                                    stories: prd.stories.map(s => ({
                                        ...s,
                                        passes: approvedStories.has(s.id)
                                    }))
                                };
                                onLockAndHandshake(finalPrd);
                            }}
                            disabled={!allApproved}
                            className={`flex-[2] py-3.5 rounded-xl font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-2 transition-all ${allApproved
                                ? 'bg-gradient-to-r from-[#E63946] to-[#B71C1C] text-white shadow-lg shadow-red-900/20 hover:shadow-red-900/40 hover:-translate-y-0.5'
                                : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                                }`}
                        >
                            <Lock className="w-4 h-4" />
                            Lock PRD & Handshake
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
