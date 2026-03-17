import React, { useState, useEffect } from 'react';
import { Artifact, StageType } from '../types';

interface EditModalProps {
  artifact: Artifact | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, newTitle: string, newContent: string) => void;
}

export const EditModal: React.FC<EditModalProps> = ({ artifact, isOpen, onClose, onSave }) => {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (artifact) {
      setContent(artifact.content);
      setTitle(artifact.title);
    }
  }, [artifact]);

  if (!isOpen || !artifact) return null;

  const renderIcon = () => {
    switch (artifact.type) {
        case StageType.MARKET_ANALYSIS:
            return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
        case StageType.USER_PERSONA:
            return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
        case StageType.SOLUTION_CONCEPT:
            return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>;
        case StageType.PRODUCT_SPEC:
            return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
        case StageType.EXECUTION_ROADMAP:
            return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
        default:
            return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4 text-center sm:p-0">
        
        {/* Backdrop */}
        <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={onClose}>
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"></div>
        </div>

        {/* Modal Panel */}
        <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full border border-slate-200">
          
          {/* Header */}
          <div className="bg-white px-6 py-4 border-b border-slate-100 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    {renderIcon()}
                </div>
                <div>
                    <h3 className="text-xl font-bold text-slate-800">
                        Edit {artifact.type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                    </h3>
                    <p className="text-xs text-slate-500">Make changes to the strategy artifact. Downstream dependencies may need regeneration.</p>
                </div>
            </div>
            <button 
                onClick={onClose} 
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                aria-label="Close modal"
            >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
          </div>
          
          {/* Body */}
          <div className="p-6 bg-slate-50/50 space-y-6">
            <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Title</label>
                <input 
                    type="text" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700"
                />
            </div>
            <div className="flex-1">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Content (Markdown)
                </label>
                <textarea 
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full h-[50vh] p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-mono text-sm leading-relaxed text-slate-700 resize-none"
                />
            </div>
          </div>

          {/* Footer */}
          <div className="bg-white px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
            <button 
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:bg-slate-50 font-medium rounded-lg transition-colors"
            >
                Cancel
            </button>
            <button 
                onClick={() => onSave(artifact.id, title, content)}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-lg shadow-indigo-200 transition-all transform active:scale-95"
            >
                Save Changes
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};