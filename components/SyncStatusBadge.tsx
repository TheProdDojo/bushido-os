import React from 'react';

export type SyncStatus = 'disconnected' | 'synced' | 'drift' | 'syncing' | 'error';

interface SyncStatusBadgeProps {
    status: SyncStatus;
    lastSyncedAt?: number;
    driftCount?: number;
    onClick?: () => void;
    compact?: boolean;
}

const STATUS_CONFIG: Record<SyncStatus, {
    label: string;
    color: string;
    bgColor: string;
    icon: React.ReactNode;
    pulse?: boolean;
}> = {
    disconnected: {
        label: 'Not Connected',
        color: 'text-slate-400',
        bgColor: 'bg-slate-100',
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" />
            </svg>
        ),
    },
    synced: {
        label: 'Synced',
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    },
    drift: {
        label: 'Drift Detected',
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
        ),
        pulse: true,
    },
    syncing: {
        label: 'Syncing...',
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-50',
        icon: (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
        ),
    },
    error: {
        label: 'Sync Error',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    },
};

function formatTimeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({
    status,
    lastSyncedAt,
    driftCount,
    onClick,
    compact = false,
}) => {
    const config = STATUS_CONFIG[status];

    const badge = (
        <div
            className={`
        inline-flex items-center gap-2 px-3 py-1.5 rounded-full font-medium text-sm
        ${config.bgColor} ${config.color}
        ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
        ${config.pulse ? 'animate-pulse' : ''}
      `}
            onClick={onClick}
        >
            {config.icon}
            {!compact && (
                <>
                    <span>{config.label}</span>
                    {status === 'drift' && driftCount && driftCount > 0 && (
                        <span className="px-1.5 py-0.5 bg-amber-200 text-amber-800 rounded text-xs font-bold">
                            {driftCount}
                        </span>
                    )}
                    {status === 'synced' && lastSyncedAt && (
                        <span className="text-emerald-500 text-xs">
                            {formatTimeAgo(lastSyncedAt)}
                        </span>
                    )}
                </>
            )}
        </div>
    );

    return badge;
};

// Compact version for header/toolbar
export const SyncStatusDot: React.FC<{ status: SyncStatus; onClick?: () => void }> = ({
    status,
    onClick,
}) => {
    const colors: Record<SyncStatus, string> = {
        disconnected: 'bg-slate-300',
        synced: 'bg-emerald-500',
        drift: 'bg-amber-500 animate-pulse',
        syncing: 'bg-indigo-500 animate-ping',
        error: 'bg-red-500',
    };

    return (
        <div
            onClick={onClick}
            className={`w-3 h-3 rounded-full ${colors[status]} transition-all hover:scale-110 ${onClick ? 'cursor-pointer' : ''}`}
            title={STATUS_CONFIG[status].label}
        />
    );
};
