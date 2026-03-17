import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, ArrowUp } from 'lucide-react';

interface KickstartInputProps {
    onKickstart: (idea: string) => void;
    onRoast?: (idea: string) => Promise<void>;
}

const SUGGESTIONS = [
    "A marketplace for vintage watch collectors in Japan",
    "AI-powered meal planner for college students",
    "SaaS for tracking carbon footprint in supply chains",
    "Mobile app for on-demand car washes in Dubai"
];

export const KickstartInput: React.FC<KickstartInputProps> = ({ onKickstart, onRoast }) => {
    const [idea, setIdea] = useState('');
    const [placeholder, setPlaceholder] = useState('');
    const [suggestionIndex, setSuggestionIndex] = useState(0);
    const [charIndex, setCharIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isActive, setIsActive] = useState(false);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognitionRef = useRef<any>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Typewriter Effect logic
    useEffect(() => {
        const currentText = SUGGESTIONS[suggestionIndex];
        let timeout: ReturnType<typeof setTimeout>;

        if (isDeleting) {
            timeout = setTimeout(() => {
                setPlaceholder(currentText.substring(0, charIndex - 1));
                setCharIndex(charIndex - 1);
            }, 30);
        } else {
            timeout = setTimeout(() => {
                setPlaceholder(currentText.substring(0, charIndex + 1));
                setCharIndex(charIndex + 1);
            }, 60);
        }

        if (!isDeleting && charIndex === currentText.length) {
            setTimeout(() => setIsDeleting(true), 2000);
        } else if (isDeleting && charIndex === 0) {
            setIsDeleting(false);
            setSuggestionIndex((prev) => (prev + 1) % SUGGESTIONS.length);
        }

        return () => clearTimeout(timeout);
    }, [charIndex, isDeleting, suggestionIndex]);

    // Voice-to-text setup
    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'en-US';

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            recognitionRef.current.onresult = (event: any) => {
                let transcript = '';
                for (let i = 0; i < event.results.length; i++) {
                    transcript += event.results[i][0].transcript;
                }
                setIdea(transcript);
            };

            recognitionRef.current.onend = () => {
                setIsRecording(false);
            };

            recognitionRef.current.onerror = () => {
                setIsRecording(false);
            };
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    const toggleVoiceInput = () => {
        if (!recognitionRef.current) {
            alert('Voice input is not supported in this browser.');
            return;
        }

        if (isRecording) {
            recognitionRef.current.stop();
            setIsRecording(false);
        } else {
            recognitionRef.current.start();
            setIsRecording(true);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (idea.trim()) {
            onKickstart(idea);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (idea.trim()) {
                onKickstart(idea);
            }
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto">
            {/* Typewriter hint */}
            <p className="text-[#6b6762] text-xs mb-3 text-center transition-opacity duration-500" style={{ opacity: idea ? 0 : 1 }}>
                <span className="text-[#a8a4a0]">Try: </span>
                <span className="text-[#E63946]">
                    {placeholder}
                    <span className="animate-pulse">|</span>
                </span>
            </p>

            {/* Input Card - Seamless Glass Design */}
            <div className={`relative transition-all duration-500 ${isActive ? 'scale-[1.02]' : 'scale-100'}`}>
                {/* Soft ambient glow behind */}
                <div className={`absolute -inset-4 bg-[#E63946] opacity-0 blur-3xl transition-opacity duration-700 ${isActive ? 'opacity-10' : 'opacity-0'}`}></div>

                <div className={`
                    glass-card p-4 transition-all duration-300 border
                    ${isActive
                        ? 'border-[rgba(230,57,70,0.15)] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] bg-[#1a1a22]/80'
                        : 'border-white/5 bg-[#1a1a22]/40 hover:bg-[#1a1a22]/60 hover:border-white/10'
                    }
                `}>
                    <form onSubmit={handleSubmit}>
                        <textarea
                            ref={textareaRef}
                            value={idea}
                            onChange={(e) => setIdea(e.target.value)}
                            onFocus={() => setIsActive(true)}
                            onBlur={() => setIsActive(false)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask BushidoOS to forge a strategy for..."
                            className="w-full bg-transparent text-[#f5f0e6] placeholder-[#6b6762] text-lg leading-relaxed resize-none focus:outline-none focus:ring-0 border-none p-2"
                            rows={3}
                        />

                        {/* Input Actions */}
                        <div className="flex items-center justify-between mt-2 px-2">
                            {/* Left - Character count */}
                            <span className={`text-xs text-[#6b6762] transition-opacity duration-300 ${idea ? 'opacity-100' : 'opacity-0'}`}>
                                {idea.length} chars
                            </span>

                            {/* Right Actions */}
                            <div className="flex items-center gap-1">
                                {/* Voice Input */}
                                <button
                                    type="button"
                                    onClick={toggleVoiceInput}
                                    className={`p-2 rounded-full transition-all duration-300 ${isRecording
                                        ? 'bg-[rgba(230,57,70,0.1)] text-[#E63946] animate-pulse'
                                        : 'text-[#6b6762] hover:text-[#f5f0e6] hover:bg-white/5'
                                        }`}
                                    title={isRecording ? 'Stop recording' : 'Voice input'}
                                >
                                    {isRecording ? (
                                        <MicOff className="w-4 h-4" />
                                    ) : (
                                        <Mic className="w-4 h-4" />
                                    )}
                                </button>

                                {/* Roast Button */}
                                {onRoast && (
                                    <button
                                        type="button"
                                        onClick={() => idea.trim() && onRoast(idea)}
                                        disabled={!idea.trim()}
                                        className={`p-2 rounded-xl transition-all duration-300 ${idea.trim()
                                            ? 'text-red-400 hover:text-red-300 hover:bg-white/5 opacity-100'
                                            : 'text-zinc-600 opacity-0 pointer-events-none'
                                            }`}
                                        title="Roast my idea (Critique)"
                                    >
                                        <span className="text-lg">🔥</span>
                                    </button>
                                )}

                                {/* Submit */}
                                <button
                                    type="submit"
                                    disabled={!idea.trim()}
                                    className={`p-2 rounded-xl transition-all duration-500 transform ${idea.trim()
                                        ? 'bg-[#E63946] text-[#f5f0e6] shadow-lg translate-x-0 opacity-100 rotate-0'
                                        : 'bg-transparent text-[#6b6762] translate-x-4 opacity-0 -rotate-45 pointer-events-none'
                                        }`}
                                    title="Forge Strategy"
                                >
                                    <ArrowUp className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            {/* Quick Suggestions - Stealthed */}
            <div className={`mt-6 flex flex-wrap justify-center gap-2 transition-all duration-500 ${isActive || idea ? 'opacity-0 translate-y-4 pointer-events-none' : 'opacity-100 translate-y-0'
                }`}>
                {SUGGESTIONS.slice(0, 3).map((s) => (
                    <button
                        key={s}
                        onClick={() => {
                            setIdea(s);
                            setIsActive(true);
                            // Focus textarea after minimal delay to ensure state update
                            setTimeout(() => textareaRef.current?.focus(), 10);
                        }}
                        className="px-4 py-2 rounded-full bg-white/5 border border-white/5 text-[#a8a4a0] text-xs hover:bg-white/10 hover:text-[#f5f0e6] transition-all"
                    >
                        {s.length > 30 ? s.substring(0, 30) + '...' : s}
                    </button>
                ))}
            </div>
        </div>
    );
};
