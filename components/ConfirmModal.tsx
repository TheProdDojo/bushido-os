import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title = 'Are you sure?',
    message = 'This action cannot be undone.',
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'danger'
}) => {
    if (!isOpen) return null;

    const isDanger = variant === 'danger';

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" />

            {/* Modal */}
            <div
                className="relative bg-[#1a1a22] border border-[rgba(255,255,255,0.08)] rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-scale-in overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Top accent bar */}
                <div className={`h-1 w-full ${isDanger ? 'bg-gradient-to-r from-[#ef4444] to-[#b91c1c]' : 'bg-gradient-to-r from-amber-500 to-amber-600'}`} />

                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-7 h-7 rounded-lg flex items-center justify-center text-[#6b6762] hover:text-white hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>

                {/* Content */}
                <div className="px-6 pt-6 pb-2 flex flex-col items-center text-center">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${isDanger ? 'bg-[rgba(239,68,68,0.1)]' : 'bg-[rgba(245,158,11,0.1)]'}`}>
                        <AlertTriangle className={`w-6 h-6 ${isDanger ? 'text-[#ef4444]' : 'text-amber-500'}`} />
                    </div>
                    <h3 className="text-lg font-semibold text-[#f5f0e6] mb-2">{title}</h3>
                    <p className="text-sm text-[#a8a4a0] leading-relaxed">{message}</p>
                </div>

                {/* Actions */}
                <div className="px-6 py-5 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-[#a8a4a0] bg-[#111118] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] hover:text-white transition-all"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={() => { onConfirm(); onClose(); }}
                        className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all ${isDanger
                                ? 'bg-[#ef4444] hover:bg-[#dc2626] shadow-[0_0_15px_rgba(239,68,68,0.25)]'
                                : 'bg-amber-500 hover:bg-amber-600 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                            }`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};
