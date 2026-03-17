import React, { useState, useEffect } from 'react';
import { Settings, GitBranch, Cpu, Key, Database, Globe, Lock, Save, AlertTriangle } from 'lucide-react';
import { GitHubConnection, loadConnection, clearConnection, getGitHubOAuthUrl, getGitHubAppInstallUrl, selectRepository } from '../services/githubService';
import { SyncStatusBadge, SyncStatus } from './SyncStatusBadge';
import { AIConfig, ModelProvider } from '../services/ai/types';

interface GlobalSettingsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    syncStatus: SyncStatus;
    onConnectionChange?: (connection: GitHubConnection) => void;
    currentConfig: AIConfig;
    onConfigChange: (config: AIConfig) => void;
}

const PROVIDERS: { id: ModelProvider; label: string }[] = [
    { id: 'google', label: 'Google Gemini' },
    { id: 'openai', label: 'OpenAI / Compatible' },
    { id: 'openrouter', label: 'OpenRouter' },
    { id: 'ollama', label: 'Ollama (Local)' },
];

export const GlobalSettingsPanel: React.FC<GlobalSettingsPanelProps> = ({
    isOpen,
    onClose,
    projectId,
    syncStatus,
    onConnectionChange,
    currentConfig,
    onConfigChange,
}) => {
    const [activeTab, setActiveTab] = useState<'github' | 'brain'>('github');
    const [connection, setConnection] = useState<GitHubConnection>(loadConnection());
    const [repoInput, setRepoInput] = useState('');
    const [localConfig, setLocalConfig] = useState<AIConfig>(currentConfig);

    useEffect(() => {
        setConnection(loadConnection());
        setLocalConfig(currentConfig);
    }, [isOpen, currentConfig]);

    if (!isOpen) return null;

    // --- GitHub Handlers ---
    const handleConnect = () => window.location.href = getGitHubOAuthUrl(projectId);
    const handleInstallApp = () => window.open(getGitHubAppInstallUrl(), '_blank');
    const handleDisconnect = () => {
        if (window.confirm('Disconnect from GitHub?')) {
            clearConnection();
            setConnection({ isConnected: false, installations: [] });
            onConnectionChange?.({ isConnected: false, installations: [] });
        }
    };
    const handleSelectRepo = () => {
        const [owner, name] = repoInput.split('/');
        if (owner && name) {
            selectRepository(owner.trim(), name.trim());
            const updated = loadConnection();
            setConnection(updated);
            onConnectionChange?.(updated);
            setRepoInput('');
        }
    };

    // --- AI Config Handlers ---
    const handleSaveConfig = () => {
        onConfigChange(localConfig);
        alert('Brain configuration saved!');
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

                <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
                    {/* Header */}
                    <div className="bg-slate-900 px-6 py-4 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <Settings className="w-6 h-6 text-white" />
                            <h3 className="text-lg font-bold text-white">Project Settings</h3>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-slate-200 shrink-0">
                        <button
                            onClick={() => setActiveTab('github')}
                            className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors ${activeTab === 'github'
                                ? 'border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50/50'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                }`}
                        >
                            <GitBranch className="w-4 h-4" />
                            GitHub Sync
                        </button>
                        <button
                            onClick={() => setActiveTab('brain')}
                            className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors ${activeTab === 'brain'
                                ? 'border-b-2 border-rose-600 text-rose-600 bg-rose-50/50'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                }`}
                        >
                            <Cpu className="w-4 h-4" />
                            Brain Config
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto">
                        {activeTab === 'github' ? (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                                    <span className="text-sm font-medium text-slate-600">Sync Status</span>
                                    <SyncStatusBadge status={syncStatus} />
                                </div>

                                {!connection.isConnected ? (
                                    <div className="text-center py-8">
                                        <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                                            <GitBranch className="w-8 h-8 text-slate-400" />
                                        </div>
                                        <h4 className="text-lg font-semibold text-slate-800 mb-2">Connect to GitHub</h4>
                                        <button onClick={handleConnect} className="mt-4 px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800">
                                            Connect Account
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                                            <div className="flex items-center gap-3">
                                                {connection.user?.avatar_url && <img src={connection.user.avatar_url} className="w-10 h-10 rounded-full" />}
                                                <div>
                                                    <p className="font-semibold text-emerald-800">@{connection.user?.login}</p>
                                                    <p className="text-xs text-emerald-600">Connected</p>
                                                </div>
                                            </div>
                                            <button onClick={handleDisconnect} className="text-xs text-red-600 hover:underline">Disconnect</button>
                                        </div>

                                        {connection.selectedRepo ? (
                                            <div className="p-4 bg-slate-50 rounded-xl flex justify-between items-center">
                                                <span className="font-medium">{connection.selectedRepo.fullName}</span>
                                                <button onClick={() => setConnection({ ...connection, selectedRepo: undefined })} className="text-xs text-blue-600">Change</button>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2">
                                                <input
                                                    value={repoInput}
                                                    onChange={e => setRepoInput(e.target.value)}
                                                    placeholder="owner/repo"
                                                    className="flex-1 px-3 py-2 border rounded-lg"
                                                />
                                                <button onClick={handleSelectRepo} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Link</button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <section className="space-y-4">
                                    <h4 className="font-medium text-slate-900 flex items-center gap-2">
                                        <Database className="w-4 h-4" />
                                        Model Provider
                                    </h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        {PROVIDERS.map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => setLocalConfig(prev => ({ ...prev, provider: p.id }))}
                                                className={`p-3 rounded-lg border text-left text-sm transition-all ${localConfig.provider === p.id
                                                    ? 'border-rose-500 bg-rose-50 ring-1 ring-rose-500'
                                                    : 'border-slate-200 hover:border-rose-200'
                                                    }`}
                                            >
                                                {p.label}
                                            </button>
                                        ))}
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Model Name</label>
                                            <input
                                                type="text"
                                                value={localConfig.modelName}
                                                onChange={e => setLocalConfig({ ...localConfig, modelName: e.target.value })}
                                                className="w-full px-3 py-2 border rounded-lg text-sm"
                                                placeholder="e.g. gpt-4o, deepseek-r1"
                                            />
                                        </div>
                                        {(localConfig.provider === 'openai' || localConfig.provider === 'ollama') && (
                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 mb-1">Base URL</label>
                                                <input
                                                    type="text"
                                                    value={localConfig.baseURL || ''}
                                                    onChange={e => setLocalConfig({ ...localConfig, baseURL: e.target.value })}
                                                    className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                                                    placeholder="https://api.openai.com/v1"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </section>

                                <section className="space-y-4 pt-4 border-t border-slate-100">
                                    <div className="bg-[#E63946]/5 border border-[#E63946]/20 rounded-xl p-4 mb-6">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-[#E63946] rounded-lg">
                                                <Cpu className="w-5 h-5 text-white" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900">Bushido Neural Engine</h4>
                                                <p className="text-xs text-slate-500">Managed Intelligence • Ronin Tier</p>
                                            </div>
                                        </div>
                                        <div className="text-xs text-slate-600 mt-2">
                                            Your workspace is powered by our hosted tiered architecture. No configuration required.
                                        </div>
                                    </div>

                                    {/* BYOK Section Removed for Hosted Model Transition */}
                                    {/* <details className="group"> ... </details> */}
                                </section>

                                <div className="pt-4 flex justify-end">
                                    <button
                                        onClick={handleSaveConfig}
                                        className="flex items-center gap-2 px-6 py-2 bg-rose-600 text-white font-medium rounded-lg hover:bg-rose-700 shadow-lg shadow-rose-200"
                                    >
                                        <Save className="w-4 h-4" />
                                        Save Configuration
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
