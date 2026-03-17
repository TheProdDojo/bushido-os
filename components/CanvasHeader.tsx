import React from 'react';
import { StageType, ArtifactStatus, Artifact } from '../types';
import { Download, Menu } from 'lucide-react';

interface CanvasHeaderProps {
  artifacts: Record<StageType, Artifact>;
  onExport: () => void;
  onPlayPodcast: () => void;
  onToggleSidebar?: () => void;
}

export const CanvasHeader: React.FC<CanvasHeaderProps> = ({
  artifacts,
  onExport,
  onPlayPodcast,
  onToggleSidebar,
}) => {
  // Check if we have enough content for a podcast
  const canPlayPodcast = artifacts[StageType.MARKET_ANALYSIS].status === ArtifactStatus.VALIDATED || artifacts[StageType.MARKET_ANALYSIS].status === ArtifactStatus.DRAFT;

  return (
    <div className="h-16 bg-black/80 backdrop-blur border-b border-zinc-800 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30">

      {/* Mobile Menu Toggle */}
      <div className="md:hidden flex items-center">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-2 -ml-2 mr-2 text-zinc-400 hover:text-white transition-colors rounded-lg hover:bg-zinc-800"
            title="Open Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Spacer for desktop to keep elements pushed right if justify-between isn't enough depending on children, actually justify-end was used before, so we can use justify-between now and a spacer... wait, let's just make the right side use flex and gap */}
      <div className="hidden md:block flex-1"></div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* PODCAST BUTTON */}
        {canPlayPodcast && (
          <button
            onClick={onPlayPodcast}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 text-red-400 bg-red-900/10 hover:bg-red-900/20 hover:text-red-300 rounded-lg transition-colors border border-red-900/20"
            title="Listen to Strategy Podcast"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            <span className="text-xs font-medium">Briefing</span>
          </button>
        )}

        <button
          onClick={onExport}
          className="flex items-center gap-2 px-3 py-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors border border-zinc-800 hover:border-zinc-700"
          title="Download Full Spec"
        >
          <Download className="w-4 h-4" />
          <span className="text-xs font-medium hidden md:inline">Export</span>
        </button>
      </div>
    </div>
  );
};