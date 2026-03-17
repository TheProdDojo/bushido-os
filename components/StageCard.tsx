import React from 'react';
import { Artifact, ArtifactStatus, STAGE_CONFIG, StageType } from '../types';
import { ToastType } from './Toast';
import { AIConfig } from '../services/ai/types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { SpecRenderer } from './SpecRenderer';

interface StageCardProps {
    artifact: Artifact;
    onEdit: () => void;
    onValidate: () => void;
    onInterview?: () => void;
    onRegenerate: () => void;
    onAudit?: () => void;
    onBuild?: () => void; // New prop for Agent Export
    onRefineSection?: (title: string, content: string) => void;
    onToast: (type: ToastType, message: string) => void;
    aiConfig: AIConfig;
}

export const StageCard: React.FC<StageCardProps> = ({ artifact, onEdit, onValidate, onInterview, onRegenerate, onAudit, onBuild, onRefineSection, onToast, aiConfig }) => {
    const config = STAGE_CONFIG[artifact.type];

    const isDraft = artifact.status === ArtifactStatus.DRAFT;
    const isValidated = artifact.status === ArtifactStatus.VALIDATED;
    const isGenerating = artifact.status === ArtifactStatus.GENERATING;
    const isPending = artifact.status === ArtifactStatus.PENDING || artifact.status === ArtifactStatus.EMPTY;

    const handleCopy = () => {
        if (artifact.content) {
            navigator.clipboard.writeText(artifact.content).then(() => {
                onToast('success', 'Copied to clipboard');
            });
        }
    };

    return (
        <div className="flex flex-col w-full max-w-7xl mx-auto pb-24">

            {/* Canvas Header (The "Meta" Card) */}
            <div className="w-full bg-zinc-900/50 backdrop-blur rounded-xl shadow-lg shadow-black/40 border border-zinc-800 p-8 mb-8 transition-all duration-500 relative overflow-hidden">

                {/* Subtle background blob */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-3xl opacity-50 -mr-16 -mt-16 pointer-events-none"></div>

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-widest bg-zinc-900 text-zinc-400 border border-zinc-700">
                                {config.label}
                            </span>
                            {isValidated && (
                                <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-widest bg-emerald-900/10 text-emerald-400 border border-emerald-900/30 flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                    Validated
                                </span>
                            )}
                            {isGenerating && (
                                <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-widest bg-red-900/20 text-red-400 border border-red-900/30 animate-pulse flex items-center gap-1">
                                    <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                                    Building...
                                </span>
                            )}
                        </div>
                        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
                            {artifact.title || (isGenerating ? 'Drafting Strategy...' : (isPending ? config.label : 'Untitled Artifact'))}
                        </h1>
                        {artifact.lastUpdated > 0 && (
                            <p className="text-sm text-zinc-500 font-medium mt-2">
                                Last updated: {new Date(artifact.lastUpdated).toLocaleDateString()} &bull; {new Date(artifact.lastUpdated).toLocaleTimeString()}
                            </p>
                        )}
                    </div>

                    {/* Document Actions Toolbar */}
                    <div className="flex items-center gap-2 bg-black p-1.5 rounded-xl border border-zinc-800 shadow-sm">
                        {/* INTERVIEW BUTTON (User Persona Only) */}
                        {artifact.type === StageType.USER_PERSONA && (isDraft || isValidated) && onInterview && (
                            <button
                                onClick={onInterview}
                                className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all mr-2"
                            >
                                <span>Chat With Persona</span>
                            </button>
                        )}

                        {/* BUILD BUTTON (Product Spec Only) */}
                        {artifact.type === StageType.PRODUCT_SPEC && (isDraft || isValidated) && onBuild && (
                            <button
                                onClick={onBuild}
                                className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all mr-2 animate-fade-in"
                                title="Generate prompt for AI Coding Agents"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                </svg>
                                <span>Build Protocol</span>
                            </button>
                        )}

                        {!isPending && !isGenerating && (
                            <>
                                {onAudit && (isDraft || isValidated) && (
                                    <button
                                        onClick={onAudit}
                                        className="p-2 text-red-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                                        title="Run VC Audit"
                                        aria-label="Run VC Audit"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                        </svg>
                                    </button>
                                )}
                                <div className="w-px h-6 bg-slate-800 mx-1"></div>
                                <button
                                    onClick={onRegenerate}
                                    className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                                    title="Regenerate this stage"
                                    aria-label="Regenerate this stage"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                </button>
                                <button
                                    onClick={handleCopy}
                                    className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                                    title="Copy Markdown"
                                    aria-label="Copy Markdown to Clipboard"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={onEdit}
                                    className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                                    title="Edit Document"
                                    aria-label="Edit Document"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                </button>
                            </>
                        )}
                        {isDraft && (
                            <button
                                onClick={onValidate}
                                className="ml-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm transition-all shadow-red-900/20"
                                aria-label="Approve and Validate Stage"
                            >
                                Approve
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Visual Persona Image (Conditional) - Floats as a separate card */}
            {artifact.imageUrl && (
                <div className="w-full flex justify-center mb-8">
                    <div className="relative group bg-slate-900 p-2 rounded-full border border-slate-800 shadow-md">
                        <img
                            src={artifact.imageUrl}
                            alt="Generated Visual Persona"
                            className="w-48 h-48 rounded-full object-cover shadow-inner"
                        />
                        <div className="absolute inset-0 rounded-full bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-xs text-white font-bold bg-black/50 px-2 py-1 rounded backdrop-blur">AI Generated</span>
                        </div>
                    </div>
                </div>
            )}

            {/* The Grid Canvas */}
            <div className="w-full min-h-[500px]">
                {isGenerating ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
                        <div className="h-64 bg-slate-800/50 rounded-xl w-full"></div>
                        <div className="h-64 bg-slate-800/50 rounded-xl w-full"></div>
                        <div className="h-96 bg-slate-800/50 rounded-xl w-full md:col-span-2"></div>
                    </div>
                ) : isPending ? (
                    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-slate-500 p-12 text-center bg-slate-900/50 rounded-3xl border border-slate-800 border-dashed">
                        <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mb-6 border border-slate-800 shadow-sm">
                            <span className="text-2xl opacity-50">⏳</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-300 mb-2">
                            {config.label}
                        </h3>
                        <p className="text-slate-500 max-w-sm leading-relaxed mb-6">
                            {config.description}
                        </p>
                        <div className="px-4 py-2 bg-slate-900 rounded-full text-xs font-semibold text-slate-500 border border-slate-800 shadow-sm">
                            Waiting for upstream tasks...
                        </div>
                    </div>
                ) : (
                    <>
                        {config.isStructured ? (
                            <SpecRenderer content={artifact.content} aiConfig={aiConfig} />
                        ) : (
                            <MarkdownRenderer
                                content={artifact.content}
                                onRefineSection={onRefineSection}
                            />
                        )}

                        {/* SOURCES CARD */}
                        {artifact.sources && artifact.sources.length > 0 && (
                            <div className="mt-8 bg-slate-900 rounded-xl shadow-sm border border-slate-800 overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/30">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
                                        Verified Sources
                                    </h4>
                                </div>
                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {artifact.sources.map((source, idx) => (
                                        <a
                                            key={idx}
                                            href={source.uri}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            aria-label={`Source: ${source.title}`}
                                            className="flex items-center gap-3 p-3 rounded-lg border border-slate-800 hover:border-red-500/50 hover:bg-red-900/10 transition-all group"
                                        >
                                            <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center text-slate-500 group-hover:text-red-400 group-hover:bg-slate-900 transition-colors">
                                                <span className="text-xs font-bold">{idx + 1}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium text-slate-300 truncate group-hover:text-red-400">{source.title}</p>
                                                <p className="text-[10px] text-slate-500 truncate">{new URL(source.uri).hostname}</p>
                                            </div>
                                            <svg className="w-4 h-4 text-slate-600 group-hover:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

        </div>
    );
};