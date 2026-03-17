import React, { useState, useRef, useEffect } from 'react';
import { chatWithPersona } from '../services/ai/aiService';

interface InterviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    personaContent: string;
    personaImage?: string;
    personaName: string;
    aiConfig: AIConfig;
}

// Update imports and component logic 
import { AIConfig } from '../services/ai/types';

export const InterviewModal: React.FC<InterviewModalProps> = ({ isOpen, onClose, personaContent, personaImage, personaName, aiConfig }) => {
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant', text: string }[]>([
        { role: 'assistant', text: `Hi there! I'm ${personaName}. What would you like to know about my experience?` }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isTyping) return;

        const userMsg = input.trim();
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setInput('');
        setIsTyping(true);

        try {
            // Prepare history excluding the initial greeting if needed, or keeping it
            // Map to aiService expected format if strictly needed, but here simple object works if roles align.
            // Pass dummy config {} as AIConfig
            const response = await chatWithPersona(
                personaContent,
                messages.map(m => ({ ...m, role: m.role as any, id: Math.random().toString(), timestamp: Date.now() })),
                userMsg,
                aiConfig
            );
            setMessages(prev => [...prev, { role: 'assistant', text: response }]);
        } catch (error) {
            console.error("Interview failed", error);
            setMessages(prev => [...prev, { role: 'assistant', text: "(Breaking Character) Sorry, I got distracted. Can you repeat that?" }]);
        } finally {
            setIsTyping(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>

            {/* Modal Window */}
            <div className="relative bg-white w-full max-w-lg md:rounded-2xl shadow-2xl flex flex-col h-full md:h-[600px] overflow-hidden animate-fade-in-up">

                {/* Header */}
                <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 overflow-hidden border border-indigo-200">
                            {personaImage ? (
                                <img src={personaImage} alt={personaName} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-lg">👤</div>
                            )}
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">{personaName || "Target User"}</h3>
                            <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Online & Ready to Chat
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full"
                        aria-label="Close interview"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`
                            max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm
                            ${msg.role === 'user'
                                    ? 'bg-indigo-600 text-white rounded-br-none'
                                    : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none'}
                        `}>
                                {msg.text}
                            </div>
                        </div>
                    ))}

                    {isTyping && (
                        <div className="flex justify-start">
                            <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-none border border-slate-100 shadow-sm flex gap-1">
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></span>
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef}></div>
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white border-t border-slate-100">
                    <form onSubmit={handleSend} className="relative">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask about their pain points, budget, or habits..."
                            className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm"
                            disabled={isTyping}
                            autoFocus
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isTyping}
                            className="absolute right-2 top-2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                            aria-label="Send message"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </button>
                    </form>
                </div>

            </div>
        </div>
    );
};