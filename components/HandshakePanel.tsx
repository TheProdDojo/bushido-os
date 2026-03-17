import React from 'react';
import { Download, Copy, Terminal, ArrowRight } from 'lucide-react';
import { PrdSchema } from '../types/beads';

interface HandshakePanelProps {
    prd: PrdSchema;
    onDownload: () => void;
    onCopy: () => void;
    onStartBuild: () => void;
}

export const HandshakePanel: React.FC<HandshakePanelProps> = ({ prd, onDownload, onCopy, onStartBuild }) => {
    return (
        <div className="mt-8 glass-card p-6 border-l-4 border-l-[#E63946] animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h3 className="text-xl font-bold text-[#f5f0e6] flex items-center gap-2">
                        <Terminal className="w-5 h-5 text-[#E63946]" />
                        IDE Handshake Protocol
                    </h3>
                    <p className="text-sm text-[#6b6762] mt-1">
                        Spec approved. Ready to transmit to Agentic IDE.
                    </p>
                </div>
                <div className="px-3 py-1 bg-[#2a2a36] rounded-full border border-[rgba(230,57,70,0.2)]">
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-[10px] font-mono text-[#a8a4a0] uppercase tracking-wider">
                            Ready for Transfer
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-[#0d0d12]/50 p-4 rounded-lg border border-[#2a2a36]">
                    <div className="text-xs text-[#6b6762] uppercase tracking-wider mb-2">Protocol</div>
                    <div className="font-mono text-[#E63946] text-sm">JSON-RPC / BEAD</div>
                </div>
                <div className="bg-[#0d0d12]/50 p-4 rounded-lg border border-[#2a2a36]">
                    <div className="text-xs text-[#6b6762] uppercase tracking-wider mb-2">Payload Size</div>
                    <div className="font-mono text-[#a8a4a0] text-sm">
                        {JSON.stringify(prd).length} bytes
                    </div>
                </div>
                <div className="bg-[#0d0d12]/50 p-4 rounded-lg border border-[#2a2a36]">
                    <div className="text-xs text-[#6b6762] uppercase tracking-wider mb-2">Target</div>
                    <div className="font-mono text-[#a8a4a0] text-sm">Cursor / Windsurf</div>
                </div>
            </div>

            <div className="flex gap-3">
                <button
                    onClick={onDownload}
                    className="flex-1 py-3 bg-[#2a2a36] hover:bg-[#3a3a45] text-[#f5f0e6] rounded-lg border border-[#3a3a45] transition-all flex items-center justify-center gap-2 text-sm font-medium group"
                >
                    <Download className="w-4 h-4 group-hover:text-[#E63946] transition-colors" />
                    Download PRD
                </button>
                <button
                    onClick={onCopy}
                    className="flex-1 py-3 bg-[#2a2a36] hover:bg-[#3a3a45] text-[#f5f0e6] rounded-lg border border-[#3a3a45] transition-all flex items-center justify-center gap-2 text-sm font-medium group"
                >
                    <Copy className="w-4 h-4 group-hover:text-[#E63946] transition-colors" />
                    Copy Context
                </button>
                <button
                    onClick={onStartBuild}
                    className="flex-[2] py-3 bg-gradient-to-r from-[#E63946] to-[#B71C1C] text-white rounded-lg shadow-lg shadow-red-900/20 hover:shadow-red-900/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wider"
                >
                    Initialize Build Phase
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};
