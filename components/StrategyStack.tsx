import React from 'react';
import { ProjectMetadata, ArtifactStatus, STAGE_CONFIG } from '../types';
import { Flame, Clock, Trash2, ArrowRight } from 'lucide-react';

interface StrategyStackProps {
    projects: ProjectMetadata[];
    onSelectProject: (id: string) => void;
    onDeleteProject: (e: React.MouseEvent, id: string) => void;
}

export const StrategyStack: React.FC<StrategyStackProps> = ({
    projects,
    onSelectProject,
    onDeleteProject
}) => {
    const recentProjects = [...projects]
        .sort((a, b) => b.lastUpdated - a.lastUpdated)
        .slice(0, 5); // Show top 5 recent

    if (recentProjects.length === 0) return null;

    return (
        <div className="fixed right-8 top-1/2 -translate-y-1/2 w-80 z-20 hidden lg:block">
            <div className="flex items-center justify-between mb-4 pl-2">
                <h3 className="text-sm font-bold text-[#6b6762] uppercase tracking-widest">Recent Strategies</h3>
                <button className="text-[10px] text-[#E63946] hover:underline flex items-center gap-1">
                    VIEW ALL <ArrowRight className="w-3 h-3" />
                </button>
            </div>

            <div className="relative group">
                {recentProjects.map((project, index) => {
                    // Stagger effect
                    const offset = index * 12; // vertical separation
                    const scale = 1 - (index * 0.05); // slight scaling down
                    const opacity = 1 - (index * 0.15); // fade out

                    return (
                        <div
                            key={project.id}
                            onClick={() => onSelectProject(project.id)}
                            style={{
                                transform: `translateY(${offset}px) scale(${scale})`,
                                zIndex: 50 - index,
                                opacity: opacity
                            }}
                            className="absolute top-0 left-0 w-full origin-top hover:!translate-y-[-10px] hover:!scale-105 hover:!opacity-100 hover:!z-[60] transition-all duration-300 cursor-pointer"
                        >
                            <div className="bg-[#111118] border border-[rgba(230,57,70,0.15)] p-4 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-md">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Flame className={`w-3 h-3 ${index === 0 ? 'text-[#E63946]' : 'text-[#6b6762]'}`} />
                                            <span className="text-[10px] text-[#6b6762] font-mono">
                                                {new Date(project.lastUpdated).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <h4 className="text-sm font-medium text-[#f5f0e6] line-clamp-2 leading-tight">
                                            {project.idea}
                                        </h4>
                                    </div>
                                    <button
                                        onClick={(e) => onDeleteProject(e, project.id)}
                                        className="text-[#6b6762] hover:text-[#bf3a3a] opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>

                                {/* Micro Progress Bar */}
                                <div className="mt-3 h-0.5 w-full bg-[#1a1a22] rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-[#E63946]"
                                        style={{ width: `${Math.random() * 60 + 20}%` }} // Placeholder progress
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
