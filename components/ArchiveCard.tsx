
import React, { useState, useRef, useEffect } from 'react';
import { ProjectMetadata } from '../types';
import { MoreVertical, Edit2, Trash2, Calendar, FileText, ArrowRight } from 'lucide-react';

interface ArchiveCardProps {
    project: ProjectMetadata;
    onSelect: () => void;
    onDelete: (e: React.MouseEvent, id: string) => void;
    onRename: (id: string, newName: string) => void;
}

export const ArchiveCard: React.FC<ArchiveCardProps> = ({ project, onSelect, onDelete, onRename }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameValue, setRenameValue] = useState(project.idea);
    const menuRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleRenameSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (renameValue.trim()) {
            onRename(project.id, renameValue.trim());
            setIsRenaming(false);
        }
    };

    return (
        <div
            className="group relative bg-[#1a1a22] rounded-xl border border-[#2a2a35] hover:border-[#E63946]/50 transition-all hover:bg-[#1f1f2a] hover:shadow-lg hover:shadow-[#E63946]/5 flex flex-col"
            onClick={(e) => {
                if (!isRenaming && !isMenuOpen) {
                    onSelect();
                }
            }}
        >
            {/* Top Section: Icon & Menu */}
            <div className="p-6 pb-2 flex justify-between items-start">
                <div className="w-12 h-12 bg-[#0d0d12] rounded-lg border border-[#2a2a35] flex items-center justify-center text-[#E63946] group-hover:scale-105 transition-transform">
                    <FileText className="w-6 h-6" />
                </div>

                <div className="relative" ref={menuRef} onClick={e => e.stopPropagation()}>
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className={`p-2 rounded-lg text-[#6b6762] hover:text-[#f5f0e6] hover:bg-[#2a2a35] transition-colors ${isMenuOpen ? 'text-[#f5f0e6] bg-[#2a2a35]' : 'opacity-0 group-hover:opacity-100'}`}
                    >
                        <MoreVertical className="w-4 h-4" />
                    </button>

                    {isMenuOpen && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-[#1a1a22] border border-[#2a2a35] rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <button
                                onClick={() => {
                                    setIsRenaming(true);
                                    setIsMenuOpen(false);
                                    setTimeout(() => inputRef.current?.focus(), 100);
                                }}
                                className="w-full text-left px-4 py-3 text-sm text-[#f5f0e6] hover:bg-[#2a2a35] flex items-center gap-2"
                            >
                                <Edit2 className="w-4 h-4" /> Rename
                            </button>
                            <button
                                onClick={(e) => {
                                    onDelete(e, project.id);
                                    setIsMenuOpen(false);
                                }}
                                className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-red-500/10 flex items-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" /> Delete
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Content Section */}
            <div className="px-6 flex-1 flex flex-col justify-center min-h-[5rem]">
                {isRenaming ? (
                    <form onSubmit={handleRenameSubmit} onClick={e => e.stopPropagation()}>
                        <input
                            ref={inputRef}
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={() => handleRenameSubmit()}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                    setRenameValue(project.idea);
                                    setIsRenaming(false);
                                }
                            }}
                            className="w-full bg-[#0d0d12] border border-[#E63946] rounded px-2 py-1 text-[#f5f0e6] font-medium focus:outline-none"
                        />
                    </form>
                ) : (
                    <h3 className="text-lg font-bold text-[#f5f0e6] line-clamp-2 leading-relaxed group-hover:text-[#E63946] transition-colors">
                        {project.idea}
                    </h3>
                )}
            </div>

            {/* Footer Section */}
            <div className="p-6 pt-4 border-t border-[#2a2a35] mt-auto flex items-center justify-between text-xs text-[#6b6762]">
                <div className="flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(project.lastUpdated).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    })}</span>
                </div>

                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[#E63946] font-medium">
                    Open <ArrowRight className="w-3 h-3" />
                </div>
            </div>
        </div>
    );
};
