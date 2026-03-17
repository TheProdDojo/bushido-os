import React, { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const styles = {
    success: 'bg-slate-900 border-l-4 border-emerald-500 text-white',
    error: 'bg-red-50 border-l-4 border-red-500 text-red-900',
    info: 'bg-white border-l-4 border-indigo-500 text-slate-800',
    warning: 'bg-yellow-50 border-l-4 border-yellow-500 text-yellow-900'
  }[toast.type];

  return (
    <div className={`${styles} px-4 py-3 rounded-r shadow-lg shadow-slate-300/50 flex items-center gap-3 min-w-[320px] max-w-md animate-fade-in-up pointer-events-auto transition-all`}>
      <span className="text-lg">
        {toast.type === 'success' && <span className="text-emerald-400">✓</span>}
        {toast.type === 'error' && <span className="text-red-500">✕</span>}
        {toast.type === 'info' && <span className="text-indigo-500">ℹ</span>}
        {toast.type === 'warning' && <span className="text-yellow-500">⚠</span>}
      </span>
      <p className="text-sm font-medium flex-1">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className={`text-lg leading-none p-1 rounded hover:bg-black/5 ${toast.type === 'success' ? 'text-white/60 hover:text-white' : 'text-slate-400 hover:text-slate-600'}`}
      >
        &times;
      </button>
    </div>
  );
};