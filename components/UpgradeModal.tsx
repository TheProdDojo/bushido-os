import React from 'react';
import { Key, ExternalLink, Sparkles, Lock, Zap } from 'lucide-react';

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onOpenSettings: () => void;
    reason: 'limit_reached' | 'stage_locked' | 'unlock_full';
    usage?: {
        used: number;
        limit: number;
        resetsAt: string;
    };
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
    isOpen,
    onClose,
    onOpenSettings,
    reason,
    usage,
}) => {
    if (!isOpen) return null;

    const getContent = () => {
        switch (reason) {
            case 'limit_reached':
                return {
                    icon: <Zap className="w-8 h-8 text-amber-500" />,
                    title: "You're on Fire! 🔥",
                    subtitle: `You've used all ${usage?.limit} free generations for today.`,
                    description: "Connect your own API key for unlimited generations and full access to all strategy stages.",
                    resetInfo: usage ? `Free tier resets at ${usage.resetsAt}` : null,
                };
            case 'stage_locked':
                return {
                    icon: <Lock className="w-8 h-8 text-indigo-500" />,
                    title: "Unlock Full Strategy",
                    subtitle: "Free tier includes Market Analysis only.",
                    description: "Add your API key to generate the complete Product Roadmap, P&L Projections, Technical Architecture, and Agent Prompt.",
                    resetInfo: null,
                };
            case 'unlock_full':
            default:
                return {
                    icon: <Sparkles className="w-8 h-8 text-purple-500" />,
                    title: "Upgrade to Unlimited",
                    subtitle: "Bring your own API key for full power.",
                    description: "Get unlimited generations, all 5 strategy stages, and use any model you prefer.",
                    resetInfo: null,
                };
        }
    };

    const content = getContent();

    const apiKeyProviders = [
        {
            name: 'Google Gemini',
            description: 'Best for research & reasoning',
            url: 'https://aistudio.google.com/app/apikey',
            free: true,
            recommended: true,
        },
        {
            name: 'OpenRouter',
            description: 'Access to 100+ models',
            url: 'https://openrouter.ai/keys',
            free: false,
        },
        {
            name: 'Tavily Search',
            description: 'Enhanced research (optional)',
            url: 'https://tavily.com/',
            free: true,
        },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                {/* Header with gradient */}
                <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-6 text-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                            {content.icon}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">{content.title}</h2>
                            <p className="text-white/80 text-sm">{content.subtitle}</p>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6">
                    <p className="text-slate-600 mb-6">{content.description}</p>

                    {content.resetInfo && (
                        <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                            ⏰ {content.resetInfo}
                        </div>
                    )}

                    {/* API Key Providers */}
                    {/* Upgrade Options for Hosted Model */}
                    <div className="space-y-3 mb-6">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Upgrade to Shogun Tier
                        </p>
                        <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 text-center">
                            <p className="text-sm text-indigo-800 font-medium mb-2">Unlock Unlimited Power</p>
                            <p className="text-xs text-indigo-600">Subscribe or top up credits in the Command Center.</p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                            Maybe Later
                        </button>
                        <button
                            onClick={() => {
                                onClose();
                                onOpenSettings(); // Redirects to ProfileView where upgrade options will be
                            }}
                            className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium flex items-center justify-center gap-2"
                        >
                            <Zap className="w-4 h-4" />
                            Upgrade Now
                        </button>
                    </div>
                </div>

                {/* Footer note */}
                <div className="px-6 pb-4">
                    <p className="text-xs text-slate-400 text-center">
                        🔒 Your API key is encrypted and stored locally in your browser.
                    </p>
                </div>
            </div>
        </div>
    );
};
