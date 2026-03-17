
import React, { useState } from 'react';
import { User, CreditCard, Puzzle, HelpCircle, LogOut, Trash2, Github, Mail, ChevronRight, Zap, CheckCircle, ExternalLink, Palette, Moon, Sun } from 'lucide-react';
import { useCredits } from '../services/creditService';

type SettingsSection = 'general' | 'subscriptions' | 'integrations' | 'support';

interface SettingsPageProps {
    user: { email?: string; name?: string; avatar?: string; provider?: string } | null;
    onSignOut?: () => void;
    githubConnected?: boolean;
    onConnectGithub?: () => void;
    projectCount?: number;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
    user,
    onSignOut,
    githubConnected = false,
    onConnectGithub,
    projectCount = 0
}) => {
    const [activeSection, setActiveSection] = useState<SettingsSection>('general');
    const { credits, topUp } = useCredits();
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');

    const navItems: { id: SettingsSection; label: string; icon: React.ReactNode }[] = [
        { id: 'general', label: 'General', icon: <User className="w-4 h-4" /> },
        { id: 'subscriptions', label: 'Subscriptions', icon: <CreditCard className="w-4 h-4" /> },
        { id: 'integrations', label: 'Integrations', icon: <Puzzle className="w-4 h-4" /> },
        { id: 'support', label: 'Support', icon: <HelpCircle className="w-4 h-4" /> },
    ];

    return (
        <div className="w-full h-full flex flex-col md:flex-row bg-[#0d0d12] text-[#f5f0e6]">
            {/* Sidebar */}
            <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-[#2a2a35] p-3 md:p-6 flex flex-row md:flex-col gap-2 overflow-x-auto scrollbar-hide shrink-0 z-10">
                <h2 className="text-lg font-bold mb-6 hidden md:block">Settings</h2>
                <div className="flex flex-row md:flex-col gap-2 min-w-max md:min-w-0">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveSection(item.id)}
                            className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-lg text-xs md:text-sm font-medium transition-all w-auto md:w-full text-left whitespace-nowrap ${activeSection === item.id
                                ? 'bg-[#E63946]/10 text-[#E63946] border-b-2 md:border-b-0 md:border-l-2 border-[#E63946]'
                                : 'text-[#6b6762] hover:bg-[#1a1a22] hover:text-[#f5f0e6] border-b-2 md:border-b-0 md:border-l-2 border-transparent'
                                }`}
                        >
                            {item.icon}
                            {item.label}
                        </button>
                    ))}
                </div>
            </aside>

            {/* Content Area */}
            <main className="flex-1 p-4 md:p-8 pb-32 md:pb-8 overflow-y-auto w-full">
                {activeSection === 'general' && (
                    <GeneralSection user={user} onSignOut={onSignOut} theme={theme} setTheme={setTheme} />
                )}
                {activeSection === 'subscriptions' && (
                    <SubscriptionsSection credits={credits} topUp={topUp} projectCount={projectCount} />
                )}
                {activeSection === 'integrations' && (
                    <IntegrationsSection githubConnected={githubConnected} onConnectGithub={onConnectGithub} />
                )}
                {activeSection === 'support' && (
                    <SupportSection />
                )}
            </main>
        </div>
    );
};

// --- GENERAL SECTION ---
const GeneralSection: React.FC<{
    user: { email?: string; name?: string; avatar?: string; provider?: string } | null;
    onSignOut?: () => void;
    theme: 'dark' | 'light';
    setTheme: (t: 'dark' | 'light') => void;
}> = ({ user, onSignOut, theme, setTheme }) => (
    <div className="max-w-2xl space-y-8">
        <h3 className="text-xl font-bold border-b border-[#2a2a35] pb-4">Profile & Account</h3>

        <div className="bg-[#1a1a22] rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#E63946] to-[#B71C1C] flex items-center justify-center text-2xl font-bold">
                    {user?.avatar ? <img src={user.avatar} className="w-full h-full rounded-full object-cover" /> : (user?.name?.[0] || 'U')}
                </div>
                <div>
                    <p className="font-semibold text-lg">{user?.name || 'Ronin'}</p>
                    <p className="text-sm text-[#6b6762]">{user?.email || 'No email'}</p>
                </div>
            </div>
            {user?.provider && (
                <div className="flex items-center gap-2 text-xs text-[#6b6762] bg-[#0d0d12] px-3 py-2 rounded-lg w-fit">
                    <CheckCircle className="w-3 h-3 text-emerald-500" />
                    Synced via {user.provider}
                </div>
            )}
        </div>

        <div className="flex gap-4">
            <button onClick={onSignOut} className="flex items-center gap-2 px-4 py-2 bg-[#1a1a22] border border-[#2a2a35] rounded-lg text-sm hover:bg-[#2a2a35] transition-colors">
                <LogOut className="w-4 h-4" /> Log Out
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-red-900/20 border border-red-900/30 rounded-lg text-sm text-red-400 hover:bg-red-900/30 transition-colors">
                <Trash2 className="w-4 h-4" /> Delete Account
            </button>
        </div>

        <h3 className="text-xl font-bold border-b border-[#2a2a35] pb-4 pt-6">Appearance</h3>
        <div className="flex gap-4">
            <button
                onClick={() => setTheme('dark')}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg border ${theme === 'dark' ? 'border-[#E63946] bg-[#E63946]/10' : 'border-[#2a2a35] bg-[#1a1a22]'}`}
            >
                <Moon className="w-4 h-4" /> Dark Mode
            </button>
            <button
                onClick={() => setTheme('light')}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg border ${theme === 'light' ? 'border-[#E63946] bg-[#E63946]/10' : 'border-[#2a2a35] bg-[#1a1a22]'}`}
            >
                <Sun className="w-4 h-4" /> Light Mode
            </button>
        </div>
    </div>
);

// --- SUBSCRIPTIONS SECTION (REDESIGNED) ---
const SubscriptionsSection: React.FC<{ credits: { strategyCredits: number; researchTokens: number }; topUp: (amount?: any) => void; projectCount: number }> = ({ credits, topUp, projectCount }) => (
    <div className="max-w-2xl space-y-8">
        <h3 className="text-xl font-bold border-b border-[#2a2a35] pb-4 text-[#f5f0e6]">Supply Lines (Free Tier)</h3>

        <div className="bg-[#1a1a22] rounded-xl p-6 space-y-6 border border-[#2a2a35]">
            <div>
                <div className="flex justify-between mb-2">
                    <span className="text-sm text-[#6b6762]">Active Campaigns</span>
                    <span className="text-sm font-medium text-[#f5f0e6]">{projectCount} / 3</span>
                </div>
                <div className="w-full h-1 bg-[#2a2a35] rounded-full overflow-hidden">
                    <div className="h-full bg-[#E63946] shadow-[0_0_10px_rgba(230,57,70,0.5)]" style={{ width: `${Math.min(100, (projectCount / 3) * 100)}%` }}></div>
                </div>
            </div>
            <div>
                <div className="flex justify-between mb-2">
                    <span className="text-sm text-[#6b6762]">Strategy Credits</span>
                    <span className="text-sm font-medium text-[#f5f0e6]">{credits.strategyCredits}</span>
                </div>
                <div className="w-full h-1 bg-[#2a2a35] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#E63946] to-[#B71C1C]" style={{ width: `${Math.min(100, credits.strategyCredits * 10)}%` }}></div>
                </div>
            </div>
            <div>
                <div className="flex justify-between mb-2">
                    <span className="text-sm text-[#6b6762]">Research Tokens</span>
                    <span className="text-sm font-medium text-[#f5f0e6]">{credits.researchTokens}</span>
                </div>
                <div className="w-full h-1 bg-[#2a2a35] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#E63946] to-[#B71C1C]" style={{ width: `${Math.min(100, credits.researchTokens / 2)}%` }}></div>
                </div>
            </div>
            <button onClick={() => topUp()} className="w-full py-2 bg-[#2a2a35] rounded-lg text-xs font-medium text-[#f5f0e6] hover:bg-[#3a3a45] transition-colors border border-[#3a3a45] hover:border-[#E63946] uppercase tracking-wider">
                Resupply
            </button>
        </div>

        <h3 className="text-xl font-bold border-b border-[#2a2a35] pb-4 pt-6 text-[#f5f0e6]">Shogun Tier</h3>
        <div className="relative overflow-hidden bg-[#1a1a22] border border-[#E63946]/30 rounded-xl p-6 group">
            <div className="absolute inset-0 bg-[#E63946]/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>

            <ul className="space-y-3 mb-6 relative z-10">
                <li className="flex items-center gap-3 text-sm text-[#6b6762] group-hover:text-[#f5f0e6] transition-colors">
                    <Zap className="w-4 h-4 text-[#E63946]" />
                    <span>Unlimited Campaigns</span>
                </li>
                <li className="flex items-center gap-3 text-sm text-[#6b6762] group-hover:text-[#f5f0e6] transition-colors">
                    <Zap className="w-4 h-4 text-[#E63946]" />
                    <span>100 Strategy Credits / month</span>
                </li>
                <li className="flex items-center gap-3 text-sm text-[#6b6762] group-hover:text-[#f5f0e6] transition-colors">
                    <Zap className="w-4 h-4 text-[#E63946]" />
                    <span>1000 Research Tokens / month</span>
                </li>
                <li className="flex items-center gap-3 text-sm text-[#6b6762] group-hover:text-[#f5f0e6] transition-colors">
                    <Zap className="w-4 h-4 text-[#E63946]" />
                    <span>Priority Neural Engine Access</span>
                </li>
            </ul>
            <button
                onClick={() => {
                    topUp({ strategyCredits: 100, researchTokens: 1000 });
                    alert("Welcome to the Shogunate!");
                }}
                className="relative z-10 w-full py-3 bg-[#E63946] text-[#f5f0e6] rounded-lg text-xs font-bold hover:bg-[#D32F2F] transition-colors shadow-[0_0_20px_rgba(230,57,70,0.2)] uppercase tracking-wider"
            >
                Upgrade to Shogun — $29/mo
            </button>
        </div>
    </div>
);

// --- INTEGRATIONS SECTION ---
const IntegrationsSection: React.FC<{ githubConnected?: boolean; onConnectGithub?: () => void }> = ({ githubConnected, onConnectGithub }) => (
    <div className="max-w-2xl space-y-8">
        <h3 className="text-xl font-bold border-b border-[#2a2a35] pb-4">Connected Services</h3>

        <div className="bg-[#1a1a22] rounded-xl p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#0d0d12] rounded-lg flex items-center justify-center">
                    <Github className="w-6 h-6" />
                </div>
                <div>
                    <p className="font-medium">GitHub</p>
                    <p className="text-xs text-[#6b6762]">{githubConnected ? 'Connected' : 'Not connected'}</p>
                </div>
            </div>
            {githubConnected ? (
                <span className="flex items-center gap-2 text-xs text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full">
                    <CheckCircle className="w-3 h-3" /> Connected
                </span>
            ) : (
                <button onClick={onConnectGithub} className="px-4 py-2 bg-[#E63946] text-white rounded-lg text-sm font-medium hover:bg-[#D32F2F] transition-colors">
                    Connect
                </button>
            )}
        </div>
    </div>
);

// --- SUPPORT SECTION ---
const SupportSection: React.FC = () => (
    <div className="max-w-2xl space-y-8">
        <h3 className="text-xl font-bold border-b border-[#2a2a35] pb-4">Frequently Asked Questions</h3>

        <div className="space-y-4">
            {[
                { q: "What are Strategy Credits?", a: "Strategy Credits power our advanced AI models for generating business strategies. Each full strategy generation costs 5 credits." },
                { q: "How do Research Tokens work?", a: "Research Tokens fuel our fast research AI. Deep market research typically consumes 10 tokens." },
                { q: "Can I upgrade my plan?", a: "Yes! Go to the Subscriptions tab and click 'Upgrade to Shogun' for unlimited access." },
            ].map((faq, i) => (
                <details key={i} className="group bg-[#1a1a22] rounded-xl">
                    <summary className="flex items-center justify-between p-4 cursor-pointer list-none">
                        <span className="font-medium">{faq.q}</span>
                        <ChevronRight className="w-4 h-4 text-[#6b6762] group-open:rotate-90 transition-transform" />
                    </summary>
                    <p className="px-4 pb-4 text-sm text-[#6b6762]">{faq.a}</p>
                </details>
            ))}
        </div>

        <h3 className="text-xl font-bold border-b border-[#2a2a35] pb-4 pt-6">Contact Support</h3>
        <a href="mailto:support@joinbushido.com" className="flex items-center gap-3 bg-[#1a1a22] rounded-xl p-4 hover:bg-[#2a2a35] transition-colors">
            <Mail className="w-5 h-5 text-[#E63946]" />
            <div>
                <p className="font-medium">Email Support</p>
                <p className="text-xs text-[#6b6762]">support@joinbushido.com</p>
            </div>
            <ExternalLink className="w-4 h-4 ml-auto text-[#6b6762]" />
        </a>
    </div>
);
