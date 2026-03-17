import React, { useState, useEffect } from 'react';
import {
    GitHubConnection,
    loadConnection,
    clearConnection,
    getGitHubOAuthUrl,
    getGitHubAppInstallUrl,
    selectRepository
} from '../services/githubService';
import { SyncStatusBadge, SyncStatus } from './SyncStatusBadge';

interface GitHubSettingsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    syncStatus: SyncStatus;
    onConnectionChange?: (connection: GitHubConnection) => void;
}

export const GitHubSettingsPanel: React.FC<GitHubSettingsPanelProps> = ({
    isOpen,
    onClose,
    projectId,
    syncStatus,
    onConnectionChange,
}) => {
    const [connection, setConnection] = useState<GitHubConnection>(loadConnection());
    const [repoInput, setRepoInput] = useState('');
    const [isConnecting, setIsConnecting] = useState(false);

    useEffect(() => {
        setConnection(loadConnection());
    }, [isOpen]);

    if (!isOpen) return null;

    const handleConnect = () => {
        setIsConnecting(true);
        window.location.href = getGitHubOAuthUrl(projectId);
    };

    const handleInstallApp = () => {
        window.open(getGitHubAppInstallUrl(), '_blank');
    };

    const handleDisconnect = () => {
        if (window.confirm('Disconnect from GitHub? This will stop sync for all projects.')) {
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

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen p-4">
                {/* Backdrop */}
                <div
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
                    onClick={onClose}
                />

                {/* Panel */}
                <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden">
                    {/* Header */}
                    <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                            </svg>
                            <h3 className="text-lg font-bold text-white">GitHub Sync</h3>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-white transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6">
                        {/* Status */}
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                            <span className="text-sm font-medium text-slate-600">Sync Status</span>
                            <SyncStatusBadge status={syncStatus} />
                        </div>

                        {/* Connection State */}
                        {!connection.isConnected ? (
                            <div className="space-y-4">
                                <div className="text-center py-6">
                                    <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                                        <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                        </svg>
                                    </div>
                                    <h4 className="text-lg font-semibold text-slate-800 mb-2">
                                        Connect to GitHub
                                    </h4>
                                    <p className="text-sm text-slate-500 max-w-xs mx-auto">
                                        Link your repo to keep strategy artifacts synced with your codebase.
                                    </p>
                                </div>

                                <button
                                    onClick={handleConnect}
                                    disabled={isConnecting}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50"
                                >
                                    {isConnecting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            <span>Connecting...</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                            </svg>
                                            <span>Connect with GitHub</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Connected User */}
                                <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                                    {connection.user?.avatar_url && (
                                        <img
                                            src={connection.user.avatar_url}
                                            alt={connection.user.login}
                                            className="w-10 h-10 rounded-full"
                                        />
                                    )}
                                    <div className="flex-1">
                                        <p className="font-semibold text-emerald-800">
                                            @{connection.user?.login}
                                        </p>
                                        <p className="text-xs text-emerald-600">
                                            Connected {connection.connectedAt ? new Date(connection.connectedAt).toLocaleDateString() : ''}
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleDisconnect}
                                        className="text-xs text-emerald-600 hover:text-red-600 transition-colors"
                                    >
                                        Disconnect
                                    </button>
                                </div>

                                {/* Selected Repo */}
                                {connection.selectedRepo ? (
                                    <div className="p-4 bg-slate-50 rounded-xl">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                                </svg>
                                                <span className="font-medium text-slate-700">
                                                    {connection.selectedRepo.fullName}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const updated = { ...connection, selectedRepo: undefined };
                                                    setConnection(updated);
                                                }}
                                                className="text-xs text-slate-500 hover:text-slate-700"
                                            >
                                                Change
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <label className="block text-sm font-medium text-slate-700">
                                            Select Repository
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={repoInput}
                                                onChange={(e) => setRepoInput(e.target.value)}
                                                placeholder="owner/repo-name"
                                                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                            <button
                                                onClick={handleSelectRepo}
                                                disabled={!repoInput.includes('/')}
                                                className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Link
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Install App Prompt */}
                                {connection.installations.length === 0 && (
                                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                                        <p className="text-sm text-amber-800 mb-2">
                                            <strong>Tip:</strong> Install the BushidoOS GitHub App for automatic sync.
                                        </p>
                                        <button
                                            onClick={handleInstallApp}
                                            className="text-sm text-amber-700 font-medium hover:text-amber-900 underline"
                                        >
                                            Install GitHub App →
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
                        <p className="text-xs text-slate-500 text-center">
                            Sync keeps your strategy docs aligned with code changes.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
