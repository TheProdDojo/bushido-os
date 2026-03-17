import React from 'react';
import { AlertTriangle, CheckCircle, Hammer, RefreshCw } from 'lucide-react';

interface Discrepancy {
    violation: string;
    fix: string;
    severity: 'critical' | 'warning';
}

interface PunchList {
    id: string;
    score: number;
    items: Discrepancy[];
}

interface ForemanDashboardProps {
    status: 'idle' | 'auditing' | 'review' | 'approved';
    punchList: PunchList | null;
    onReAudit: () => void;
    onApprove: () => void;
}

export const ForemanDashboard: React.FC<ForemanDashboardProps> = ({ status, punchList, onReAudit, onApprove }) => {
    if (status === 'idle') return null;

    if (status === 'auditing') {
        return (
            <div className="glass-card p-8 mt-8 flex flex-col items-center justify-center min-h-[300px] animate-fade-in border border-[#E63946]/20">
                <div className="relative mb-6">
                    <div className="absolute inset-0 bg-[#E63946] blur-xl opacity-20 animate-pulse rounded-full"></div>
                    <Hammer className="w-12 h-12 text-[#E63946] animate-bounce relative z-10" />
                </div>
                <h3 className="text-xl font-bold text-[#f5f0e6] mb-2">Foreman is Inspecting</h3>
                <p className="text-[#6b6762] text-sm animate-pulse">Auditing implementation against blueprints...</p>
            </div>
        );
    }

    const isClean = punchList && punchList.score >= 90;

    return (
        <div className="mt-8 glass-card overflow-hidden animate-fade-in border border-[#2a2a36]">
            {/* Header */}
            <div className="bg-[#1a1a22] p-6 border-b border-[#2a2a36] flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${isClean ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                        <span className={`text-xl font-bold font-mono ${isClean ? 'text-emerald-500' : 'text-red-500'}`}>
                            {punchList?.score || 0}
                        </span>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-[#f5f0e6]">Site Inspection Report</h3>
                        <p className="text-xs text-[#6b6762] font-mono">
                            ID: {punchList?.id.split('-')[1]} • {isClean ? 'PASSED' : 'ACTION REQUIRED'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={onReAudit}
                    className="p-2 hover:bg-[#2a2a36] rounded-lg text-[#6b6762] hover:text-[#f5f0e6] transition-colors"
                    title="Re-run Audit"
                >
                    <RefreshCw className="w-5 h-5" />
                </button>
            </div>

            {/* Body */}
            <div className="p-6">
                {!isClean ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-amber-500 text-sm font-medium mb-4">
                            <AlertTriangle className="w-4 h-4" />
                            <span>Punch List ({punchList?.items.length} Items)</span>
                        </div>

                        <div className="space-y-3">
                            {punchList?.items.map((item, idx) => (
                                <div key={idx} className="bg-[#0d0d12]/50 border border-l-4 border-[#2a2a36] border-l-red-500 p-4 rounded-r-lg">
                                    <h4 className="text-[#f5f0e6] text-sm font-bold mb-1">{item.violation}</h4>
                                    <p className="text-[#a8a4a0] text-xs font-mono bg-[#1a1a22] p-2 rounded mt-2">
                                        Suggestion: {item.fix}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 flex justify-end">
                            <p className="text-xs text-[#6b6762] italic mr-4 self-center">Fix these issues in the IDE then Re-Audit</p>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-8 h-8 text-emerald-500" />
                        </div>
                        <h3 className="text-[#f5f0e6] font-bold text-lg mb-2">Construction Complete</h3>
                        <p className="text-[#6b6762] text-sm max-w-md mx-auto mb-6">
                            Implementation matches the blueprints. The integrity of the structure is verified.
                        </p>
                        <button
                            onClick={onApprove}
                            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-lg shadow-emerald-900/20 transition-all"
                        >
                            Sign Off & Launch
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
