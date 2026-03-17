
import React from 'react';
import { Cpu, Zap, Activity, Brain } from 'lucide-react';

export const NeuralEngineStatus: React.FC = () => {
    return (
        <div className="bg-[#1a1a22] border border-[#2a2a35] rounded-xl p-6 mb-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#2a2a35]/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none"></div>

            <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#E63946]/10 rounded-lg">
                        <Cpu className="w-6 h-6 text-[#E63946]" />
                    </div>
                    <div>
                        <h3 className="text-[#f5f0e6] font-bold text-lg">Neural Engine Status</h3>
                        <p className="text-xs text-[#6b6762]">BushidoOS Hosted Intelligence • Ronin Tier</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-medium text-emerald-500">Operational</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Visualizer Cards for Models */}
                <ModelCard
                    name="DeepSeek R1"
                    role="Strategy Core"
                    icon={<Brain className="w-4 h-4 text-purple-400" />}
                    status="Active"
                    load="Low"
                />
                <ModelCard
                    name="Gemini 3 Flash"
                    role="Research Agent"
                    icon={<Zap className="w-4 h-4 text-amber-400" />}
                    status="Active"
                    load="High"
                />
                <ModelCard
                    name="Gemini 2.5 Pro"
                    role="Multi-Modal"
                    icon={<Activity className="w-4 h-4 text-blue-400" />}
                    status="Standby"
                    load="Idle"
                />
            </div>
        </div>
    );
};

const ModelCard: React.FC<{ name: string; role: string; icon: React.ReactNode; status: string; load: string }> = ({ name, role, icon, status, load }) => (
    <div className="bg-[#0d0d12] border border-[#2a2a35] rounded-lg p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                {icon}
                <span className="text-[#f5f0e6] text-sm font-medium">{name}</span>
            </div>
            <span className="text-[10px] text-[#6b6762] uppercase tracking-wider">{role}</span>
        </div>
        <div className="mt-2 h-1 w-full bg-[#2a2a35] rounded-full overflow-hidden">
            <div
                className={`h-full rounded-full ${load === 'High' ? 'bg-amber-500 w-[80%]' : load === 'Low' ? 'bg-emerald-500 w-[20%]' : 'bg-blue-500 w-[0%]'}`}
            ></div>
        </div>
        <div className="flex justify-between text-[10px] text-[#6b6762] mt-1">
            <span>Status: {status}</span>
            <span>Load: {load}</span>
        </div>
    </div>
);
