import React, { useState, useMemo } from 'react';
import { StrategyRoastResult, StrategyRoastFeedback, AttributedFlaw } from '../services/ai/agents/roastService';
import { ActionableRoastItem } from '../types/beads';
import { StageType, STAGE_CONFIG } from '../types';
import { Flame, CheckCircle, X, AlertTriangle, ChevronDown, ChevronRight, Loader2, Zap, Shield } from 'lucide-react';
import { PipelineProgress } from './PipelineProgress';

interface RoastGateScreenProps {
    result: StrategyRoastResult | null;
    isRunning: boolean;
    isEvolving?: boolean;
    onProceed: (actionItems: ActionableRoastItem[]) => void;
}

const PILLAR_COLORS: Record<string, string> = {
    MARKET_ANALYSIS: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    USER_PERSONA: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    SOLUTION_CONCEPT: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    PRODUCT_SPEC: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    EXECUTION_ROADMAP: 'bg-red-500/20 text-red-400 border-red-500/30',
};

interface FlawToggleProps {
    item: AttributedFlaw;
    persona: string;
    type: 'flaw' | 'suggestion';
    isActioned: boolean;
    onToggle: () => void;
}

const FlawToggle: React.FC<FlawToggleProps> = ({ item, type, isActioned, onToggle }) => {
    const pillarLabel = STAGE_CONFIG[item.targetPillar]?.label || item.targetPillar;
    const pillarColor = PILLAR_COLORS[item.targetPillar] || 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';

    return (
        <div
            onClick={onToggle}
            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200 ${isActioned
                ? 'border-[#E63946]/40 bg-[#E63946]/5'
                : 'border-zinc-800 bg-zinc-900/30 hover:border-zinc-700'
                }`}
        >
            {/* Toggle */}
            <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${isActioned
                ? 'border-[#E63946] bg-[#E63946]'
                : 'border-zinc-600'
                }`}>
                {isActioned && <Zap className="w-3 h-3 text-white" />}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <p className={`text-sm ${isActioned ? 'text-white' : 'text-zinc-300'}`}>
                    {item.text}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono uppercase ${pillarColor}`}>
                        {pillarLabel}
                    </span>
                    <span className={`text-[10px] uppercase font-bold ${type === 'flaw' ? 'text-red-400' : 'text-blue-400'
                        }`}>
                        {type}
                    </span>
                </div>
            </div>
        </div>
    );
};

const PersonaCard: React.FC<{
    feedback: StrategyRoastFeedback;
    actionedKeys: Set<string>;
    onToggleItem: (key: string) => void;
}> = ({ feedback, actionedKeys, onToggleItem }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const isApproved = feedback.verdict === 'approved';
    const isRejected = feedback.verdict === 'rejected';

    const borderColor = isApproved ? 'border-emerald-500/40' : (isRejected ? 'border-red-500/40' : 'border-yellow-500/40');

    const allItems = [
        ...feedback.criticalFlaws.map((f, i) => ({ item: f, type: 'flaw' as const, key: `${feedback.persona}-flaw-${i}` })),
        ...feedback.suggestions.map((s, i) => ({ item: s, type: 'suggestion' as const, key: `${feedback.persona}-sugg-${i}` })),
    ];

    const actionedCount = allItems.filter(ai => actionedKeys.has(ai.key)).length;

    return (
        <div className={`rounded-xl border ${borderColor} bg-[#0d0d12]/80 overflow-hidden`}>
            {/* Header */}
            <div
                className="flex justify-between items-center p-4 cursor-pointer hover:bg-zinc-900/30 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg ${isApproved ? 'bg-emerald-500/10' : isRejected ? 'bg-red-500/10' : 'bg-yellow-500/10'}`}>
                        {isApproved ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : isRejected ? <X className="w-5 h-5 text-red-500" /> : <AlertTriangle className="w-5 h-5 text-yellow-500" />}
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">{feedback.persona}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-xs font-mono ${feedback.score > 70 ? 'text-emerald-400' : feedback.score > 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                                {feedback.score}/100
                            </span>
                            {actionedCount > 0 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#E63946]/20 text-[#E63946] font-bold">
                                    {actionedCount} ACTIONED
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                {isExpanded ? <ChevronDown className="w-4 h-4 text-zinc-500" /> : <ChevronRight className="w-4 h-4 text-zinc-500" />}
            </div>

            {/* Body */}
            {isExpanded && (
                <div className="px-4 pb-4 space-y-2">
                    {allItems.map(({ item, type, key }) => (
                        <FlawToggle
                            key={key}
                            item={item}
                            persona={feedback.persona}
                            type={type}
                            isActioned={actionedKeys.has(key)}
                            onToggle={() => onToggleItem(key)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export const RoastGateScreen: React.FC<RoastGateScreenProps> = ({
    result, isRunning, isEvolving, onProceed
}) => {
    const [actionedKeys, setActionedKeys] = useState<Set<string>>(new Set());

    const handleToggle = (key: string) => {
        setActionedKeys(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    // Build ActionableRoastItem[] from toggled keys
    const actionItems: ActionableRoastItem[] = useMemo(() => {
        if (!result) return [];
        const items: ActionableRoastItem[] = [];
        for (const feedback of result.feedbacks) {
            feedback.criticalFlaws.forEach((f, i) => {
                const key = `${feedback.persona}-flaw-${i}`;
                items.push({
                    persona: feedback.persona,
                    flaw: f.text,
                    suggestion: '',
                    targetPillar: f.targetPillar,
                    actioned: actionedKeys.has(key),
                });
            });
            feedback.suggestions.forEach((s, i) => {
                const key = `${feedback.persona}-sugg-${i}`;
                items.push({
                    persona: feedback.persona,
                    flaw: '',
                    suggestion: s.text,
                    targetPillar: s.targetPillar,
                    actioned: actionedKeys.has(key),
                });
            });
        }
        return items;
    }, [result, actionedKeys]);

    const actionedCount = actionedKeys.size;
    const totalItems = result?.feedbacks.reduce((acc, f) => acc + f.criticalFlaws.length + f.suggestions.length, 0) || 0;

    // Loading state
    if (isRunning) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-6">
                    <div className="relative w-20 h-20 mx-auto">
                        <div className="absolute inset-0 border-4 border-red-500/20 rounded-full" />
                        <div className="absolute inset-0 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
                        <Flame className="absolute inset-0 m-auto w-8 h-8 text-red-500 animate-pulse" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white mb-1">Summoning the Roast Swarm...</h3>
                        <p className="text-sm text-zinc-400">4 personas are stress-testing your strategy</p>
                    </div>
                </div>
            </div>
        );
    }

    // Evolving state
    if (isEvolving) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-6">
                    <div className="relative w-20 h-20 mx-auto">
                        <div className="absolute inset-0 border-4 border-[#E63946]/20 rounded-full" />
                        <div className="absolute inset-0 border-4 border-[#E63946] border-t-transparent rounded-full animate-spin" />
                        <Zap className="absolute inset-0 m-auto w-8 h-8 text-[#E63946] animate-pulse" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white mb-1">Evolving Strategy...</h3>
                        <p className="text-sm text-zinc-400">Applying {actionedCount} feedback items to affected pillars</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!result) return null;

    return (
        <div className="flex-1 overflow-y-auto scrollbar-default">
            <PipelineProgress currentStep="roast" />
            <div className="w-full max-w-4xl mx-auto p-8 md:p-12 space-y-8">

                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-500/10 rounded-xl">
                            <Flame className="w-8 h-8 text-red-500" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white tracking-wide">Roast Swarm Results</h2>
                            <p className="text-sm text-zinc-400 mt-0.5">Review, then choose which feedback to evolve into your strategy</p>
                        </div>
                    </div>
                    <div className={`text-4xl font-bold font-mono ${result.overallScore > 70 ? 'text-emerald-400' : result.overallScore > 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {result.overallScore}<span className="text-lg text-zinc-500">/100</span>
                    </div>
                </div>

                {/* Summary Banner */}
                <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
                    <p className="text-sm text-zinc-300">{result.summary}</p>
                    <p className="text-xs text-zinc-500 mt-2">
                        Toggle items below to <span className="text-[#E63946] font-bold">ACTION</span> them — actioned items will be used to evolve the affected strategy pillars.
                    </p>
                </div>

                {/* Persona Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result.feedbacks.map((fb, idx) => (
                        <PersonaCard
                            key={idx}
                            feedback={fb}
                            actionedKeys={actionedKeys}
                            onToggleItem={handleToggle}
                        />
                    ))}
                </div>

                {/* Action Bar */}
                <div className="sticky bottom-0 bg-gradient-to-t from-[var(--bushido-ink)] pt-6 pb-2">
                    <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-800 bg-[#0d0d12]/90 backdrop-blur-md">
                        <div className="text-sm text-zinc-400">
                            <span className="text-white font-bold">{actionedCount}</span>
                            <span className="text-zinc-500">/{totalItems}</span> feedback items selected
                        </div>
                        <div className="flex gap-3">
                            {actionedCount > 0 ? (
                                <button
                                    onClick={() => onProceed(actionItems.filter(i => i.actioned))}
                                    className="px-6 py-3 bg-gradient-to-r from-[#E63946] to-[#B71C1C] text-white rounded-lg font-bold uppercase tracking-wider text-sm shadow-lg shadow-red-900/20 hover:shadow-red-900/40 hover:-translate-y-0.5 transition-all flex items-center gap-2"
                                >
                                    <Zap className="w-4 h-4" />
                                    Apply & Evolve Strategy
                                </button>
                            ) : (
                                <button
                                    onClick={() => onProceed([])}
                                    className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium text-sm transition-all flex items-center gap-2"
                                >
                                    <Shield className="w-4 h-4" />
                                    Proceed Without Changes
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
