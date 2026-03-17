import React, { useState } from 'react';
import { Home, Hammer, ScrollText, Settings, LogOut, User } from 'lucide-react';

interface ZenRailProps {
    activeTab: 'home' | 'archives' | 'settings';
    onTabChange: (tab: 'home' | 'archives' | 'settings') => void;
    onSignOut?: () => void;
    user?: { avatar?: string; name?: string } | null;
}

export const ZenRail: React.FC<ZenRailProps> = ({
    activeTab,
    onTabChange,
    onSignOut,
    user
}) => {
    const [hovered, setHovered] = useState<string | null>(null);

    const items = [
        { id: 'home', icon: Home, label: 'Dojo' },
        { id: 'archives', icon: ScrollText, label: 'Archives' },
        { id: 'settings', icon: Settings, label: 'Settings' },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 h-16 w-full md:sticky md:top-0 md:h-screen shrink-0 md:w-16 bg-[#0d0d12] border-t md:border-t-0 md:border-r border-[rgba(230,57,70,0.1)] flex flex-row md:flex-col items-center justify-between md:justify-start px-6 md:px-0 py-0 md:py-6 z-50">
            {/* Brand Seal */}
            <div className="hidden md:flex mb-10 w-10 h-10 bg-gradient-to-br from-[#E63946] to-[#B71C1C] rounded-lg items-center justify-center shadow-lg cursor-pointer hover:shadow-[0_0_15px_rgba(230,57,70,0.3)] transition-all">
                <span className="text-lg text-[#f5f0e6] font-bold">武</span>
            </div>

            {/* Main Nav Items */}
            <div className="flex-1 md:flex-none flex flex-row md:flex-col gap-2 sm:gap-6 md:gap-8 w-full md:w-auto items-center justify-center md:items-center">
                {items.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => onTabChange(item.id as any)}
                            onMouseEnter={() => setHovered(item.id)}
                            onMouseLeave={() => setHovered(null)}
                            className={`relative group p-3 rounded-xl transition-all duration-300 ${isActive
                                ? 'text-[#E63946] bg-[rgba(230,57,70,0.05)]'
                                : 'text-[#6b6762] hover:text-[#f5f0e6] hover:bg-[rgba(255,255,255,0.02)]'
                                }`}
                        >
                            <item.icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />

                            {/* Tooltip (Desktop Only) */}
                            <div className={`hidden md:block absolute left-16 top-1/2 -translate-y-1/2 bg-[#1a1a22] text-[#f5f0e6] text-xs font-medium px-3 py-1.5 rounded-md border border-[rgba(230,57,70,0.2)] shadow-xl whitespace-nowrap transition-all duration-200 pointer-events-none ${hovered === item.id ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
                                }`}>
                                {item.label}
                            </div>

                            {/* Active Indicator */}
                            {isActive && (
                                <>
                                    {/* Desktop left edge */}
                                    <div className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#E63946] rounded-r-full shadow-[0_0_10px_rgba(230,57,70,0.5)]" />
                                    {/* Mobile top edge */}
                                    <div className="md:hidden absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#E63946] rounded-b-full shadow-[0_0_10px_rgba(230,57,70,0.5)]" />
                                </>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Bottom Actions */}
            <div className="hidden md:flex flex-col gap-4 items-center mt-auto md:mt-auto">
                {user && (
                    <div className="relative group">
                        {user.avatar ? (
                            <img src={user.avatar} alt="" className="w-8 h-8 rounded-full border border-[rgba(230,57,70,0.2)] grayscale group-hover:grayscale-0 transition-all" />
                        ) : (
                            <div className="w-8 h-8 bg-[#1a1a22] rounded-full flex items-center justify-center text-[10px] font-bold text-[#f5f0e6] border border-[rgba(230,57,70,0.2)]">
                                {user.name?.charAt(0) || 'F'}
                            </div>
                        )}
                    </div>
                )}

                {onSignOut && (
                    <button
                        onClick={onSignOut}
                        className="p-2 text-[#6b6762] hover:text-[#bf3a3a] transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Mobile Output: Show only Avatar next to items if possible or hide entirely to save space? We have Settings tab for logout and profile. So we can hide the user/logout on mobile rail! */}
        </nav>
    );
};
