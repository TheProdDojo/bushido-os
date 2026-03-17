import React, { useEffect, useState } from 'react';
import { getBuilderScore, checkStreakStatus, BuilderScore } from '../services/storageService';

interface BushidoScoreProps {
    projectId: string;
    compact?: boolean;
}

// Generate activity data for heatmap (last 12 weeks)
function generateHeatmapData(): number[][] {
    const weeks: number[][] = [];
    for (let w = 0; w < 12; w++) {
        const week: number[] = [];
        for (let d = 0; d < 7; d++) {
            // Random placeholder data - in production, this would come from activity logs
            week.push(Math.random() > 0.6 ? Math.floor(Math.random() * 4) : 0);
        }
        weeks.push(week);
    }
    return weeks;
}

const INTENSITY_COLORS = [
    'bg-slate-100',      // 0: no activity
    'bg-emerald-200',    // 1: low
    'bg-emerald-400',    // 2: medium
    'bg-emerald-600',    // 3: high
];

export const BushidoScore: React.FC<BushidoScoreProps> = ({ projectId, compact = false }) => {
    const [score, setScore] = useState<BuilderScore | null>(null);
    const [streakBroken, setStreakBroken] = useState(false);
    const [daysInactive, setDaysInactive] = useState(0);
    const [heatmapData] = useState(() => generateHeatmapData());

    useEffect(() => {
        async function loadScore() {
            const builderScore = await getBuilderScore(projectId);
            setScore(builderScore);

            const streakStatus = await checkStreakStatus(projectId);
            setStreakBroken(streakStatus.isBroken);
            setDaysInactive(streakStatus.daysInactive);
        }
        loadScore();
    }, [projectId]);

    if (!score) {
        return null;
    }

    // Compact version for header
    if (compact) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-amber-50 to-orange-50 rounded-full border border-amber-200">
                <span className="text-lg">🔥</span>
                <span className="font-bold text-amber-700">{score.currentStreak}</span>
                <span className="text-xs text-amber-600">day streak</span>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                            <span className="text-2xl">⚔️</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-white">Bushido Score</h3>
                            <p className="text-xs text-slate-400">Your builder journey</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-bold text-white">{score.totalPoints}</div>
                        <div className="text-xs text-slate-400">total points</div>
                    </div>
                </div>
            </div>

            {/* Streak Warning */}
            {streakBroken && (
                <div className="px-6 py-3 bg-red-50 border-b border-red-100 flex items-center gap-3">
                    <span className="text-xl">💔</span>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-red-800">
                            Your {score.longestStreak}-day streak was broken
                        </p>
                        <p className="text-xs text-red-600">
                            {daysInactive} days since last activity. Start building to begin a new streak!
                        </p>
                    </div>
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
                <div className="px-4 py-4 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                        <span className="text-xl">🔥</span>
                        <span className="text-2xl font-bold text-slate-800">
                            {score.currentStreak}
                        </span>
                    </div>
                    <p className="text-xs text-slate-500">Current Streak</p>
                </div>
                <div className="px-4 py-4 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                        <span className="text-xl">🏆</span>
                        <span className="text-2xl font-bold text-slate-800">
                            {score.longestStreak}
                        </span>
                    </div>
                    <p className="text-xs text-slate-500">Best Streak</p>
                </div>
                <div className="px-4 py-4 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                        <span className="text-xl">🎖️</span>
                        <span className="text-2xl font-bold text-slate-800">
                            {score.achievements.length}
                        </span>
                    </div>
                    <p className="text-xs text-slate-500">Achievements</p>
                </div>
            </div>

            {/* Activity Heatmap */}
            <div className="px-6 py-4">
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-slate-700">Activity</h4>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                        <span>Less</span>
                        {INTENSITY_COLORS.map((color, i) => (
                            <div key={i} className={`w-3 h-3 rounded-sm ${color}`} />
                        ))}
                        <span>More</span>
                    </div>
                </div>

                <div className="flex gap-1">
                    {heatmapData.map((week, weekIdx) => (
                        <div key={weekIdx} className="flex flex-col gap-1">
                            {week.map((intensity, dayIdx) => (
                                <div
                                    key={dayIdx}
                                    className={`w-3 h-3 rounded-sm ${INTENSITY_COLORS[intensity]} transition-colors hover:ring-2 hover:ring-slate-300`}
                                    title={`Week ${weekIdx + 1}, Day ${dayIdx + 1}`}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* Achievements */}
            {score.achievements.length > 0 && (
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
                    <h4 className="text-sm font-medium text-slate-700 mb-2">Achievements</h4>
                    <div className="flex flex-wrap gap-2">
                        {score.achievements.map((achievement, i) => (
                            <span
                                key={i}
                                className="px-3 py-1 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 text-xs font-medium rounded-full border border-amber-200"
                            >
                                {achievement}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Point Values */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100">
                <details className="text-xs text-slate-500">
                    <summary className="cursor-pointer hover:text-slate-700">How to earn points</summary>
                    <div className="mt-2 space-y-1 pl-4">
                        <p>+10 pts: Validate a stage</p>
                        <p>+5 pts: Approve a sync update</p>
                        <p>+20 pts: Export project bundle</p>
                        <p>+50 pts: Complete full strategy</p>
                    </div>
                </details>
            </div>
        </div>
    );
};
