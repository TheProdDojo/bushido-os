import React from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { StageType, STAGE_CONFIG } from '../types';

interface AuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditContent: string;
  stage: StageType;
}

export const AuditModal: React.FC<AuditModalProps> = ({ isOpen, onClose, auditContent, stage }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4 text-center sm:p-0">
        
        {/* Backdrop */}
        <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={onClose}>
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"></div>
        </div>

        {/* Modal Panel */}
        <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full border-4 border-slate-100">
          
          {/* Header */}
          <div className="bg-slate-900 px-6 py-5 border-b border-slate-800 flex justify-between items-center relative overflow-hidden">
             {/* Decorative blob */}
             <div className="absolute top-0 right-0 -mt-10 -mr-10 w-32 h-32 bg-indigo-500 rounded-full blur-3xl opacity-20"></div>

             <div className="flex items-center gap-4 relative z-10">
                <div className="p-3 bg-white/10 rounded-xl text-white">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div>
                    <h3 className="text-2xl font-bold text-white tracking-tight">
                        VC Audit Report
                    </h3>
                    <p className="text-sm text-slate-400 font-medium">Critique for: <span className="text-white">{STAGE_CONFIG[stage].label}</span></p>
                </div>
            </div>
            <button 
                onClick={onClose} 
                className="p-2 text-slate-400 hover:text-white rounded-full transition-colors relative z-10"
                aria-label="Close audit"
            >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
          </div>
          
          {/* Body */}
          <div className="p-8 bg-white max-h-[70vh] overflow-y-auto">
             <div className="prose prose-slate max-w-none">
                 <MarkdownRenderer content={auditContent} />
             </div>
          </div>

          {/* Footer */}
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between items-center">
             <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">AI Analysis by Gemini Pro</span>
             <button 
                onClick={onClose}
                className="px-6 py-2 bg-slate-900 hover:bg-black text-white font-bold rounded-lg shadow-lg transition-all transform active:scale-95"
            >
                Acknowledge
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};