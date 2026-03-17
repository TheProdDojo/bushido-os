import React, { useEffect, useRef, useState } from 'react';
import { decodeAudioData } from '../services/audioUtils';

interface AudioPlayerProps {
  base64Audio: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ base64Audio, isOpen, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>(0);

  useEffect(() => {
    if (isOpen && base64Audio) {
      initAudio();
    }
    return () => stopAudio();
  }, [isOpen, base64Audio]);

  const initAudio = async () => {
    if (!base64Audio) return;

    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new Ctx({ sampleRate: 24000 });
      audioContextRef.current = ctx;

      const buffer = await decodeAudioData(base64Audio, ctx);
      
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      
      source.connect(analyser);
      analyser.connect(ctx.destination);
      
      sourceNodeRef.current = source;
      analyserRef.current = analyser;

      source.start();
      setIsPlaying(true);
      
      source.onended = () => {
          setIsPlaying(false);
      };
      
      visualize();

    } catch (e) {
      console.error("Audio playback error", e);
    }
  };

  const stopAudio = () => {
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch(e){}
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    cancelAnimationFrame(animationFrameRef.current);
    setIsPlaying(false);
  };

  const visualize = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const analyser = analyserRef.current;
    
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;
        ctx.fillStyle = `rgb(99, 102, 241)`; // Indigo-500
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };

    draw();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-up">
        <div className="bg-slate-900 text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-6 border border-slate-700">
            <div className="flex flex-col">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Strategy Brief</span>
                <span className="text-sm font-medium">Gemini Podcast • 2 min</span>
            </div>

            <canvas ref={canvasRef} width="100" height="30" className="opacity-80"></canvas>

            <div className="flex items-center gap-3">
                 <button 
                    onClick={stopAudio} // In a real app this would be toggle pause
                    className="w-10 h-10 bg-white text-slate-900 rounded-full flex items-center justify-center hover:bg-slate-200 transition-colors"
                 >
                     {isPlaying ? (
                        <div className="w-3 h-3 bg-slate-900 rounded-sm"></div>
                     ) : (
                        <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                     )}
                 </button>
                 <button 
                    onClick={onClose}
                    className="p-2 text-slate-400 hover:text-white transition-colors"
                 >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
            </div>
        </div>
    </div>
  );
};
