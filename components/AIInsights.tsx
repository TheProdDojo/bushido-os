import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, Sparkles, PanelRightClose } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ChatMessage } from '../types';

interface AIInsightsProps {
    isOpen: boolean;
    onClose: () => void;
    messages: ChatMessage[];
    onSendMessage: (message: string) => void;
    isLoading: boolean;
}

export const AIInsights: React.FC<AIInsightsProps> = ({
    isOpen,
    onClose,
    messages,
    onSendMessage,
    isLoading,
}) => {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input on open
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 200);
        }
    }, [isOpen]);

    const handleSend = () => {
        if (!input.trim() || isLoading) return;
        onSendMessage(input);
        setInput('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!isOpen) return null;

    return (
        <aside className="w-[380px] h-full bg-[#111118] border-l border-zinc-800/60 flex flex-col shrink-0 transition-all duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white leading-tight">Bushido AI</h3>
                        <p className="text-[10px] text-zinc-500">Strategic Assistant</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    title="Close chat"
                >
                    <PanelRightClose className="w-4 h-4" />
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-default">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-zinc-600 p-8">
                        <Sparkles className="w-10 h-10 mb-3 text-red-500/20" />
                        <p className="text-sm font-sans">Ready to assist with your strategy.</p>
                        <p className="text-xs mt-1.5 text-zinc-700">Ask about market trends, user personas, or refinement.</p>
                    </div>
                ) : (
                    messages.map((msg, idx) => (
                        <div key={idx} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            {/* Avatar */}
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user'
                                ? 'bg-zinc-800'
                                : 'bg-red-900/20 text-red-400'
                                }`}>
                                {msg.role === 'user' ? <User className="w-3.5 h-3.5 text-zinc-400" /> : <Bot className="w-3.5 h-3.5" />}
                            </div>

                            {/* Message Bubble */}
                            <div className={`flex-1 max-w-[85%] rounded-2xl px-4 py-3 text-sm ${msg.role === 'user'
                                ? 'bg-zinc-800 text-zinc-100 rounded-tr-none'
                                : 'bg-white/[0.03] text-zinc-300 rounded-tl-none border border-white/5'
                                }`}>
                                <MarkdownRenderer content={msg.text} />
                            </div>
                        </div>
                    ))
                )}

                {isLoading && (
                    <div className="flex gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-red-900/20 text-red-400 flex items-center justify-center shrink-0">
                            <Bot className="w-3.5 h-3.5" />
                        </div>
                        <div className="bg-white/[0.03] rounded-2xl rounded-tl-none px-4 py-3 border border-white/5">
                            <div className="flex gap-1.5 items-center h-5">
                                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce"></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 border-t border-white/5 shrink-0">
                <div className="relative">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask about your strategy..."
                        className="w-full bg-zinc-900/80 text-zinc-200 text-sm rounded-xl pl-4 pr-12 py-3 border border-zinc-800 focus:border-red-500/40 focus:ring-1 focus:ring-red-500/20 outline-none resize-none min-h-[46px] max-h-[120px] font-sans"
                        rows={1}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className={`absolute right-2 bottom-2 p-2 rounded-lg transition-all ${input.trim() && !isLoading
                            ? 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20'
                            : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                            }`}
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </aside>
    );
};
