
import React from 'react';
import { RoastResult, RoastFeedback } from '../services/ai/agents/roastService';
import { Flame, X, AlertTriangle, CheckCircle } from 'lucide-react';

interface RoastModalProps {
    isOpen: boolean;
    onClose: () => void;
    result: RoastResult | null;
    isRunning: boolean;
}

const PersonaCard: React.FC<{ feedback: RoastFeedback }> = ({ feedback }) => {
    const isApproved = feedback.verdict === 'approved';
    const isRejected = feedback.verdict === 'rejected';

    const borderColor = isApproved ? 'border-emerald-500/50' : (isRejected ? 'border-red-500/50' : 'border-yellow-500/50');
    const bgGradient = isApproved ? 'from-emerald-950/30' : (isRejected ? 'from-red-950/30' : 'from-yellow-950/30');

    return (
        <div className={`p-4 rounded-xl border ${borderColor} bg-gradient-to-br ${bgGradient} to-zinc-900/50`}>
            {/* Header */}
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">{feedback.persona}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${isApproved ? 'bg-emerald-500/20 text-emerald-400' : isRejected ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                            {feedback.verdict}
                        </span>
                        <span className="text-xs font-mono text-zinc-500">Score: {feedback.score}/100</span>
                    </div>
                </div>
                {/* Icon based on verdict */}
                {isApproved ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : isRejected ? <X className="w-5 h-5 text-red-500" /> : <AlertTriangle className="w-5 h-5 text-yellow-500" />}
            </div>

            {/* Critical Flaws */}
            {feedback.criticalFlaws.length > 0 && (
                <div className="mb-3">
                    <h4 className="text-[10px] uppercase text-zinc-500 font-bold mb-1">Critical Flaws</h4>
                    <ul className="space-y-1">
                        {feedback.criticalFlaws.map((flaw, i) => (
                            <li key={i} className="text-xs text-red-300 flex gap-2 items-start">
                                <span className="mt-1 w-1 h-1 rounded-full bg-red-500 shrink-0"></span>
                                {flaw}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Suggestions */}
            <div>
                <h4 className="text-[10px] uppercase text-zinc-500 font-bold mb-1">Suggestions</h4>
                <ul className="space-y-1">
                    {feedback.suggestions.map((sugg, i) => (
                        <li key={i} className="text-xs text-zinc-300 flex gap-2 items-start">
                            <span className="mt-1 w-1 h-1 rounded-full bg-indigo-500 shrink-0"></span>
                            {sugg}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export const RoastModal: React.FC<RoastModalProps> = ({ isOpen, onClose, result, isRunning }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
            <div className="relative w-full max-w-6xl bg-[#0d0d12] border border-red-900/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-red-900/20 flex justify-between items-center bg-red-950/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-500/10 rounded-lg animate-pulse-slow">
                            <Flame className="w-6 h-6 text-red-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-wide uppercase">The Roast Swarm</h2>
                            <p className="text-xs text-red-300/70 font-mono">Agentic Stress Test Protocol</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-default">
                    {isRunning ? (
                        <div className="flex flex-col items-center justify-center h-64 space-y-6">
                            <div className="relative w-16 h-16">
                                <div className="absolute inset-0 border-4 border-red-500/20 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                            <div className="text-center">
                                <h3 className="text-lg font-bold text-white mb-1">Summoning the Swarm...</h3>
                                <p className="text-sm text-zinc-400">Consulting CEO, Dev, Design, and Marketing agents.</p>
                            </div>
                        </div>
                    ) : result ? (
                        <div className="space-y-8">
                            {/* Summary Banner */}
                            <div className="flex flex-col md:flex-row gap-6 items-center justify-between bg-zinc-900/50 p-6 rounded-xl border border-zinc-800">
                                <div>
                                    <h3 className="text-2xl font-bold text-white mb-2">Overall Score: <span className={result.overallScore > 70 ? 'text-emerald-400' : 'text-red-400'}>{result.overallScore}/100</span></h3>
                                    <p className="text-sm text-zinc-400">{result.summary}</p>
                                </div>
                            </div>

                            {/* Grid of Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {result.feedbacks.map((fb, idx) => (
                                    <PersonaCard key={idx} feedback={fb} />
                                ))}
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
};
