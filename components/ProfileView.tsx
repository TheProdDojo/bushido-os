
import React from 'react';
import { User, Zap, CreditCard, Shield, Clock, Award, TrendingUp, Settings as SettingsIcon } from 'lucide-react';
import { NeuralEngineStatus } from './Settings/NeuralEngineStatus';
import { useCredits } from '../services/creditService';

interface ProfileViewProps {
    user: { email?: string; name?: string; avatar?: string } | null;
    onSignOut?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ user, onSignOut }) => {
    const { credits, topUp } = useCredits();

    return (
        <div className="w-full max-w-5xl mx-auto p-8 h-full overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#E63946] to-[#B71C1C] flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                        {user?.avatar ? <img src={user.avatar} alt="User" className="w-full h-full rounded-full object-cover" /> : (user?.name?.[0] || 'R')}
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-[#f5f0e6]">Command Center</h1>
                        <p className="text-[#6b6762] flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            Online • {user?.email || 'Ronin'}
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={onSignOut} className="px-4 py-2 border border-[#2a2a35] rounded-lg text-[#6b6762] hover:text-[#f5f0e6] hover:bg-[#1a1a22] transition-colors text-sm">
                        Sign Out
                    </button>
                    <button className="px-4 py-2 bg-[#E63946] text-white rounded-lg hover:bg-[#D32F2F] transition-colors text-sm font-medium shadow-lg shadow-red-900/20">
                        Upgrade Plan
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* LEFT COLUMN: THE ARMORY (Credits) */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-[#1a1a22] border border-[#2a2a35] rounded-xl p-6 relative overflow-hidden">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-[#f5f0e6] font-bold text-lg flex items-center gap-2">
                                <Shield className="w-5 h-5 text-[#E63946]" />
                                The Armory
                            </h2>
                            <span className="text-xs text-[#6b6762] bg-[#2a2a35] px-2 py-1 rounded">Resouces</span>
                        </div>

                        {/* Strategy Credits */}
                        <div className="mb-6">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-[#6b6762] text-sm font-medium">Strategy Credits</span>
                                <span className="text-2xl font-bold text-[#f5f0e6]">{credits.strategyCredits}</span>
                            </div>
                            <div className="w-full h-2 bg-[#2a2a35] rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 w-[50%]"></div>
                            </div>
                            <p className="text-[10px] text-[#6b6762] mt-2">Used for DeepSeek R1 Strategy Generation</p>
                        </div>

                        {/* Research Tokens */}
                        <div className="mb-8">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-[#6b6762] text-sm font-medium">Research Tokens</span>
                                <span className="text-2xl font-bold text-[#f5f0e6]">{credits.researchTokens}</span>
                            </div>
                            <div className="w-full h-2 bg-[#2a2a35] rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 w-[75%]"></div>
                            </div>
                            <p className="text-[10px] text-[#6b6762] mt-2">Used for Gemini Flash Research & Audits</p>
                        </div>

                        <button
                            onClick={() => topUp()}
                            className="w-full py-3 bg-[#2a2a35] border border-[#3a3a45] text-[#f5f0e6] rounded-lg hover:bg-[#3a3a45] transition-colors flex items-center justify-center gap-2 text-sm font-medium group"
                        >
                            <CreditCard className="w-4 h-4 text-[#6b6762] group-hover:text-[#E63946] transition-colors" />
                            Refill Supplies
                        </button>
                    </div>

                    <div className="bg-[#1a1a22] border border-[#2a2a35] rounded-xl p-6">
                        <h3 className="text-[#f5f0e6] font-bold text-sm mb-4">Subscription</h3>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                                <Award className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div>
                                <div className="text-[#f5f0e6] font-medium">Ronin Tier</div>
                                <div className="text-xs text-[#6b6762]">Free Plan</div>
                            </div>
                        </div>
                        <ul className="space-y-2 mb-4">
                            <li className="flex items-center gap-2 text-xs text-[#6b6762]">
                                <Zap className="w-3 h-3 text-emerald-500" /> 3 Projects
                            </li>
                            <li className="flex items-center gap-2 text-xs text-[#6b6762]">
                                <Zap className="w-3 h-3 text-emerald-500" /> Community Support
                            </li>
                        </ul>
                        <button
                            onClick={() => {
                                // Mock Upgrade Flow
                                const newBalance = { strategyCredits: 50, researchTokens: 500 };
                                topUp(newBalance);
                                alert("WELCOME TO THE SHOGUNATE.\n\nYour account has been upgraded to the Shogun Tier.\n- Unlimited Strategy Credits\n- Priority Neural Engine Access\n- Early Access to Features");
                            }}
                            className="w-full py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-xs font-bold hover:opacity-90 transition-opacity shadow-lg shadow-indigo-500/20"
                        >
                            Upgrade to Shogun
                        </button>
                    </div>
                </div>

                {/* CENTRE & RIGHT: SYSTEM STATUS & SETTINGS */}
                <div className="lg:col-span-2 space-y-6">
                    <NeuralEngineStatus />

                    {/* Stats or History Placeholder */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-[#1a1a22] border border-[#2a2a35] rounded-xl p-6">
                            <div className="flex items-center gap-3 mb-2">
                                <TrendingUp className="w-5 h-5 text-emerald-500" />
                                <span className="text-[#6b6762] text-sm font-medium">Generation Velocity</span>
                            </div>
                            <div className="text-2xl font-bold text-[#f5f0e6]">12.4s</div>
                            <div className="text-xs text-emerald-500 mt-1">avg. per strategy</div>
                        </div>
                        <div className="bg-[#1a1a22] border border-[#2a2a35] rounded-xl p-6">
                            <div className="flex items-center gap-3 mb-2">
                                <Clock className="w-5 h-5 text-amber-500" />
                                <span className="text-[#6b6762] text-sm font-medium">Uptime</span>
                            </div>
                            <div className="text-2xl font-bold text-[#f5f0e6]">99.9%</div>
                            <div className="text-xs text-amber-500 mt-1">all systems operational</div>
                        </div>
                    </div>

                    {/* Preferences Section */}
                    <div className="bg-[#1a1a22] border border-[#2a2a35] rounded-xl p-6">
                        <h3 className="text-[#f5f0e6] font-bold text-sm mb-4 flex items-center gap-2">
                            <SettingsIcon className="w-4 h-4 text-[#6b6762]" />
                            Global Preferences
                        </h3>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-[#f5f0e6] text-sm font-medium">Zen Mode</div>
                                    <div className="text-xs text-[#6b6762]">Hide distractions during generation</div>
                                </div>
                                <div className="w-10 h-5 bg-[#E63946] rounded-full relative cursor-pointer">
                                    <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full"></div>
                                </div>
                            </div>
                            <div className="h-px bg-[#2a2a35] w-full"></div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-[#f5f0e6] text-sm font-medium">Auto-Sync</div>
                                    <div className="text-xs text-[#6b6762]">Push logic changes to GitHub automatically</div>
                                </div>
                                <div className="w-10 h-5 bg-[#2a2a35] rounded-full relative cursor-pointer">
                                    <div className="absolute left-1 top-1 w-3 h-3 bg-[#6b6762] rounded-full"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
