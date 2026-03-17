import React, { useState } from 'react';
import { ProjectState } from '../types';
import { generateBushidoBundle, downloadBlob } from '../services/exportService';

interface AgentExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    promptContent: string;
    onGenerate: (agent: 'replit' | 'cursor' | 'bolt') => void;
    isGenerating: boolean;
    project: ProjectState | null;
}

export const AgentExportModal: React.FC<AgentExportModalProps> = ({
    isOpen,
    onClose,
    promptContent,
    onGenerate,
    isGenerating,
    project
}) => {
    const [activeTab, setActiveTab] = useState<'replit' | 'cursor' | 'bolt'>('replit');
    const [copied, setCopied] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    if (!isOpen) return null;

    const handleCopy = () => {
        navigator.clipboard.writeText(promptContent).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleTabChange = (agent: 'replit' | 'cursor' | 'bolt') => {
        setActiveTab(agent);
        onGenerate(agent);
    };

    const handleDownloadBundle = async () => {
        if (!project) return;

        setIsDownloading(true);
        try {
            const blob = await generateBushidoBundle(project);
            const safeName = project.idea
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .slice(0, 30);
            downloadBlob(blob, `${safeName}-bushido-bundle.zip`);
        } catch (e) {
            console.error('Failed to generate bundle:', e);
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen p-4 text-center sm:p-0">

                {/* Backdrop */}
                <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={onClose}>
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"></div>
                </div>

                {/* Modal Panel */}
                <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full border border-slate-200">

                    {/* Header */}
                    <div className="bg-slate-900 px-6 py-5 border-b border-slate-800 flex justify-between items-center relative overflow-hidden">
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="p-3 bg-indigo-500/20 rounded-xl text-indigo-400 border border-indigo-500/30">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-white tracking-tight">
                                    Build Protocol
                                </h3>
                                <p className="text-sm text-slate-400 font-medium">Export optimized prompts for AI Coding Agents</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-white rounded-full transition-colors relative z-10"
                            aria-label="Close modal"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Toolbar */}
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row gap-4 justify-between items-center">
                        <div className="flex p-1 bg-slate-200 rounded-lg">
                            {(['replit', 'bolt', 'cursor'] as const).map(agent => (
                                <button
                                    key={agent}
                                    onClick={() => handleTabChange(agent)}
                                    className={`px-4 py-2 text-sm font-bold rounded-md transition-all uppercase tracking-wider ${activeTab === agent ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    {agent}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-slate-500 font-medium">
                            Use this prompt in <strong className="text-slate-700">{activeTab === 'replit' ? 'Replit Agent' : activeTab === 'bolt' ? 'Bolt.new' : 'Cursor Composer'}</strong> to generate the MVP.
                        </p>
                    </div>

                    {/* Body */}
                    <div className="p-0 bg-slate-900">
                        <div className="relative">
                            {isGenerating ? (
                                <div className="h-[400px] flex flex-col items-center justify-center text-slate-400">
                                    <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                    <p className="animate-pulse">Synthesizing Product Spec into Master Prompt...</p>
                                </div>
                            ) : (
                                <textarea
                                    readOnly
                                    value={promptContent}
                                    className="w-full h-[400px] p-6 bg-slate-900 text-indigo-50 font-mono text-sm leading-relaxed resize-none focus:outline-none selection:bg-indigo-500/30"
                                />
                            )}

                            {/* Floating Action Buttons */}
                            {!isGenerating && promptContent && (
                                <div className="absolute bottom-6 right-6 flex gap-3">
                                    {/* Download Bundle Button */}
                                    {project && (
                                        <button
                                            onClick={handleDownloadBundle}
                                            disabled={isDownloading}
                                            className="flex items-center gap-2 px-5 py-3 font-bold rounded-lg shadow-lg transition-all transform hover:scale-105 active:scale-95 bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isDownloading ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    <span>Packing...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                    </svg>
                                                    <span>.bushido/ Bundle</span>
                                                </>
                                            )}
                                        </button>
                                    )}

                                    {/* Copy Button */}
                                    <button
                                        onClick={handleCopy}
                                        className={`flex items-center gap-2 px-6 py-3 font-bold rounded-lg shadow-lg transition-all transform hover:scale-105 active:scale-95 ${copied ? 'bg-indigo-400 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}
                                    >
                                        {copied ? (
                                            <>
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                <span>Copied!</span>
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                <span>Copy Prompt</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer with instructions */}
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="text-sm text-slate-600">
                                <p className="font-semibold text-slate-800 mb-1">Using the .bushido/ Bundle</p>
                                <p>Download the bundle and extract it to your project root. The <code className="px-1.5 py-0.5 bg-slate-200 rounded text-xs">.cursorrules</code> file will automatically guide Cursor/Windsurf.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};