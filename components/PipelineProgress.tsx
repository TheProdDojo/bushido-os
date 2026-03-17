import React from 'react';
import { Flame, Shield, FileText, Handshake, Check, ArrowLeft } from 'lucide-react';

export type PipelineStep = 'roast' | 'review' | 'prd' | 'handshake';

interface PipelineProgressProps {
    currentStep: PipelineStep;
    onNavigateBack?: () => void;
    backLabel?: string;
}

const STEPS: { key: PipelineStep; label: string; icon: React.ReactNode }[] = [
    { key: 'roast', label: 'Roast', icon: <Flame className="w-3.5 h-3.5" /> },
    { key: 'review', label: 'Review', icon: <Shield className="w-3.5 h-3.5" /> },
    { key: 'prd', label: 'PRD', icon: <FileText className="w-3.5 h-3.5" /> },
    { key: 'handshake', label: 'Handshake', icon: <Handshake className="w-3.5 h-3.5" /> },
];

const stepIndex = (step: PipelineStep) => STEPS.findIndex(s => s.key === step);

export const PipelineProgress: React.FC<PipelineProgressProps> = ({
    currentStep, onNavigateBack, backLabel
}) => {
    const currentIdx = stepIndex(currentStep);

    return (
        <div className="w-full px-8 md:px-12 pt-6 pb-2">
            {/* Back Navigation */}
            {onNavigateBack && (
                <button
                    onClick={onNavigateBack}
                    className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-3 group"
                >
                    <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                    {backLabel || 'Back'}
                </button>
            )}

            {/* Stepper */}
            <div className="flex items-center gap-1">
                {STEPS.map((step, idx) => {
                    const isCompleted = idx < currentIdx;
                    const isCurrent = idx === currentIdx;
                    const isUpcoming = idx > currentIdx;

                    return (
                        <React.Fragment key={step.key}>
                            {/* Step Pill */}
                            <div
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all ${isCurrent
                                        ? 'bg-[#E63946]/15 text-[#E63946] border border-[#E63946]/30'
                                        : isCompleted
                                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                            : 'bg-zinc-900/50 text-zinc-600 border border-zinc-800'
                                    }`}
                            >
                                {isCompleted ? (
                                    <Check className="w-3 h-3" />
                                ) : (
                                    step.icon
                                )}
                                <span className="hidden sm:inline">{step.label}</span>
                            </div>

                            {/* Connector */}
                            {idx < STEPS.length - 1 && (
                                <div className={`flex-1 h-px max-w-[40px] ${idx < currentIdx
                                        ? 'bg-emerald-500/30'
                                        : 'bg-zinc-800'
                                    }`} />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};
