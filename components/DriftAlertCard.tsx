import React from 'react';
import { DriftReport } from '../types/supervisor';

interface DriftAlertCardProps {
    report: DriftReport | null;
    onVerify: () => void;
    isVerifying: boolean;
}

export const DriftAlertCard: React.FC<DriftAlertCardProps> = ({ report, onVerify, isVerifying }) => {
    if (!report && !isVerifying) {
        return (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-6 flex items-center justify-between">
                <div>
                    <h3 className="text-white font-bold">Unverified State</h3>
                    <p className="text-slate-500 text-sm">Run the Supervisor to check for strategic drift.</p>
                </div>
                <button
                    onClick={onVerify}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                    Run Supervisor
                </button>
            </div>
        );
    }

    if (isVerifying) {
        return (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-6 animate-pulse">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-800 rounded-full"></div>
                    <div className="space-y-2">
                        <div className="h-4 w-48 bg-slate-800 rounded"></div>
                        <div className="h-3 w-32 bg-slate-800 rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (!report) return null;

    const isAligned = report.score > 90;
    const isCritical = report.score < 50;

    const statusColor = isAligned ? 'green' : (isCritical ? 'red' : 'yellow');
    const borderColor = isAligned ? 'border-green-900' : (isCritical ? 'border-red-900' : 'border-yellow-900');
    const bgColor = isAligned ? 'bg-green-950/30' : (isCritical ? 'bg-red-950/30' : 'bg-yellow-950/30');

    return (
        <div className={`rounded-xl border ${borderColor} ${bgColor} p-6 mb-6 transition-all`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">

                {/* Score Section */}
                <div className="flex items-center gap-4">
                    <div className={`relative w-16 h-16 flex items-center justify-center rounded-full border-4 border-${statusColor}-500/30`}>
                        <span className={`text-xl font-bold text-${statusColor}-400`}>{report.score}%</span>
                    </div>
                    <div>
                        <h3 className={`text-lg font-bold text-${statusColor}-100`}>
                            {isAligned ? 'Aligned with Spec' : 'Strategic Drift Detected'}
                        </h3>
                        <p className={`text-sm text-${statusColor}-200/70`}>
                            {report.summary}
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    <button
                        onClick={onVerify}
                        className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                        title="Re-verify"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                    {!isAligned && (
                        <button className={`px-4 py-2 bg-${statusColor}-600 hover:bg-${statusColor}-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-${statusColor}-900/20`}>
                            Fix Drift
                        </button>
                    )}
                </div>
            </div>

            {/* Issues List */}
            {report.issues.length > 0 && !isAligned && (
                <div className="mt-6 space-y-2">
                    <h4 className={`text-xs font-bold text-${statusColor}-400 uppercase tracking-wider mb-2`}>Detected Issues</h4>
                    {report.issues.map(issue => (
                        <div key={issue.id} className="bg-black/20 p-3 rounded-lg flex items-start gap-3">
                            <span className="mt-1 w-2 h-2 rounded-full bg-red-500"></span>
                            <div>
                                <p className="text-sm text-white font-medium">{issue.message}</p>
                                {issue.file && <p className="text-xs text-slate-400 font-mono">{issue.file}</p>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
