import React from 'react';
import { Artifact, StageType, STAGE_CONFIG } from '../types';
import { CheckCircle, RefreshCw, Edit3, ArrowRight, Shield } from 'lucide-react';
import { PipelineProgress } from './PipelineProgress';

interface StrategyReviewScreenProps {
    artifacts: Record<StageType, Artifact>;
    evolvedPillars: StageType[];
    onApprove: () => void;
    onEditPillar: (stage: StageType) => void;
    onGoBack?: () => void;
}

const PILLAR_STAGES: StageType[] = [
    StageType.MARKET_ANALYSIS,
    StageType.USER_PERSONA,
    StageType.SOLUTION_CONCEPT,
    StageType.PRODUCT_SPEC,
    StageType.EXECUTION_ROADMAP,
];

const PILLAR_COLORS: Record<string, { border: string; bg: string; text: string; icon: string }> = {
    MARKET_ANALYSIS: { border: 'border-cyan-500/30', bg: 'bg-cyan-500/5', text: 'text-cyan-400', icon: 'text-cyan-500' },
    USER_PERSONA: { border: 'border-emerald-500/30', bg: 'bg-emerald-500/5', text: 'text-emerald-400', icon: 'text-emerald-500' },
    SOLUTION_CONCEPT: { border: 'border-purple-500/30', bg: 'bg-purple-500/5', text: 'text-purple-400', icon: 'text-purple-500' },
    PRODUCT_SPEC: { border: 'border-amber-500/30', bg: 'bg-amber-500/5', text: 'text-amber-400', icon: 'text-amber-500' },
    EXECUTION_ROADMAP: { border: 'border-red-500/30', bg: 'bg-red-500/5', text: 'text-red-400', icon: 'text-red-500' },
};

const PillarReviewCard: React.FC<{
    artifact: Artifact;
    isEvolved: boolean;
    onEdit: () => void;
}> = ({ artifact, isEvolved, onEdit }) => {
    const colors = PILLAR_COLORS[artifact.type] || PILLAR_COLORS.MARKET_ANALYSIS;
    const label = STAGE_CONFIG[artifact.type]?.label || artifact.type;
    const preview = artifact.content?.slice(0, 400)?.replace(/```[\s\S]*?```/g, '[code block]').replace(/\n/g, ' ') || '(No content)';

    return (
        <div className={`rounded-xl border ${colors.border} ${isEvolved ? colors.bg : 'bg-zinc-900/20'} p-5 transition-all`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    {isEvolved ? (
                        <div className="p-1.5 rounded-lg bg-[#E63946]/10">
                            <RefreshCw className="w-4 h-4 text-[#E63946]" />
                        </div>
                    ) : (
                        <div className="p-1.5 rounded-lg bg-zinc-800">
                            <CheckCircle className={`w-4 h-4 ${colors.icon}`} />
                        </div>
                    )}
                    <div>
                        <h3 className={`text-sm font-bold uppercase tracking-wider ${isEvolved ? 'text-white' : 'text-zinc-400'}`}>
                            {label}
                        </h3>
                        {isEvolved && (
                            <span className="text-[10px] uppercase font-bold text-[#E63946]">🔄 Evolved from roast feedback</span>
                        )}
                    </div>
                </div>
                <button
                    onClick={onEdit}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium transition-all"
                >
                    <Edit3 className="w-3 h-3" />
                    Edit
                </button>
            </div>

            {/* Preview */}
            <div className={`text-xs leading-relaxed ${isEvolved ? 'text-zinc-300' : 'text-zinc-500'} line-clamp-4`}>
                {preview}
            </div>

            {/* Title */}
            {artifact.title && (
                <div className="mt-3 pt-3 border-t border-zinc-800">
                    <p className={`text-xs font-mono ${colors.text}`}>{artifact.title}</p>
                </div>
            )}
        </div>
    );
};

export const StrategyReviewScreen: React.FC<StrategyReviewScreenProps> = ({
    artifacts, evolvedPillars, onApprove, onEditPillar, onGoBack
}) => {
    const evolvedCount = evolvedPillars.length;

    return (
        <div className="flex-1 overflow-y-auto scrollbar-default">
            <PipelineProgress
                currentStep="review"
                onNavigateBack={onGoBack}
                backLabel="Back to Roast"
            />
            <div className="w-full max-w-4xl mx-auto p-8 md:p-12 space-y-8">

                {/* Header */}
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/10 rounded-xl">
                        <Shield className="w-8 h-8 text-emerald-500" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white tracking-wide">Strategy Review</h2>
                        <p className="text-sm text-zinc-400 mt-0.5">
                            {evolvedCount > 0
                                ? `${evolvedCount} pillar${evolvedCount > 1 ? 's' : ''} evolved from roast feedback. Review and approve.`
                                : 'All pillars unchanged. Review and approve to proceed.'}
                        </p>
                    </div>
                </div>

                {/* Pillar Grid */}
                <div className="space-y-4">
                    {PILLAR_STAGES.map(stage => {
                        const artifact = artifacts[stage];
                        if (!artifact) return null;
                        const isEvolved = evolvedPillars.includes(stage);

                        return (
                            <PillarReviewCard
                                key={stage}
                                artifact={artifact}
                                isEvolved={isEvolved}
                                onEdit={() => onEditPillar(stage)}
                            />
                        );
                    })}
                </div>

                {/* Action Bar */}
                <div className="sticky bottom-0 bg-gradient-to-t from-[var(--bushido-ink)] pt-6 pb-2">
                    <button
                        onClick={onApprove}
                        className="w-full py-4 bg-gradient-to-r from-[#E63946] to-[#B71C1C] text-white rounded-xl font-bold uppercase tracking-wider text-sm shadow-lg shadow-red-900/20 hover:shadow-red-900/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                    >
                        Approve Strategy & Generate PRD
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};
