import React, { useMemo, useState } from 'react';
import { useAudioVisualizer, useMicVisualizer } from '../hooks/useAudioVisualizer';
import { Mic, MicOff, Battery, UserCircle, PlusCircle, Radio, Save, ShieldAlert, Activity, Palette, Settings, Menu, X } from 'lucide-react';
import ThreeOrb from './ThreeOrb';
import { OrbMode, ThemeSettings } from '../types';

interface AudioMinimalistModeProps {
    isRecording: boolean;
    threatLevel: number;
    toggleRecording: () => void;
    aiSpeaking?: boolean;
    onOpenStore: () => void;
    onOpenSaves: () => void;
    onAuth: () => void;
    onOpenProfile: () => void;
    onExport: () => void;
    credits: number;
    orbTheme: 'plasma' | 'aether';
    onToggleTheme: () => void;
    orbSettings: ThemeSettings;
    onOpenSettings: () => void;
    previewMode?: OrbMode | null;
    isThinking?: boolean;
}

const AudioMinimalistMode: React.FC<AudioMinimalistModeProps> = ({
    isRecording,
    threatLevel,
    toggleRecording,
    aiSpeaking = false,
    onOpenStore,
    onOpenSaves,
    onAuth,
    onOpenProfile,
    onExport,
    credits,
    orbTheme,
    onToggleTheme,
    orbSettings,
    onOpenSettings,
    previewMode = null,
    isThinking = false
}) => {
    const { volume, isActive } = useAudioVisualizer();
    const micVolume = useMicVisualizer(isRecording);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // The final volume is either the real AI audio volume, or the real user mic volume
    const activeVolume = aiSpeaking ? volume : (isRecording ? micVolume : 0);

    // Dynamic color for threat level
    const getThreatColor = (level: number) => {
        if (level < 40) return 'rgba(34, 197, 94, 0.8)'; // Green
        if (level < 75) return 'rgba(234, 179, 8, 0.8)'; // Yellow/Orange
        return 'rgba(239, 68, 68, 0.8)'; // Red
    };

    const threatColor = useMemo(() => getThreatColor(threatLevel), [threatLevel]);

    return (
        <div className="flex-1 flex flex-col items-center justify-center bg-black relative z-10 w-full h-full overflow-hidden">
            
            {/* Thinking Indicator Removed from here and moved to App.tsx for global visibility */}

            {/* The 3D WebGL Orb */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <ThreeOrb activeVolume={activeVolume} aiSpeaking={aiSpeaking} isRecording={isRecording} theme={orbTheme} settings={orbSettings} previewMode={previewMode} />
            </div>

            {/* Clickable Overlay to toggle recording without interfering with 3D canvas */}
            <div
                className="absolute inset-0 z-20 cursor-pointer"
                onClick={toggleRecording}
                title="Tap to speak/stop"
            />

            {/* HIGH-TECH THREAT INDICATOR */}
            <div className="absolute bottom-32 sm:bottom-28 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-3 w-64">
                <div className="flex items-center justify-between w-full px-1">
                    <div className="flex items-center gap-2">
                        <Activity size={10} className="text-red-500 animate-pulse" />
                        <span className="text-[9px] font-mono font-bold tracking-[0.2em] text-red-700 uppercase">Threat Level</span>
                    </div>
                    <span className="text-[11px] font-mono font-bold" style={{ color: threatColor, textShadow: `0 0 8px ${threatColor}` }}>
                        {threatLevel}%
                    </span>
                </div>

                <div className="h-1.5 w-full bg-red-950/20 rounded-full border border-red-900/10 overflow-hidden relative backdrop-blur-sm">
                    {/* Shadow/Glow under the bar */}
                    <div
                        className="h-full transition-all duration-1000 ease-out relative"
                        style={{
                            width: `${threatLevel}%`,
                            background: `linear-gradient(90deg, transparent, ${threatColor})`,
                            boxShadow: `0 0 15px ${threatColor}`
                        }}
                    >
                        {/* Scanning light effect inside the bar */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-20 animate-scan"></div>
                    </div>
                </div>

                {/* Subtitle status */}
                <span className="text-[8px] font-mono tracking-[0.3em] text-red-900/40 uppercase animate-pulse">
                    Analyzing neural patterns...
                </span>
            </div>

            {/* Mobile Hamburger Button */}
            <div className="absolute top-6 right-6 sm:hidden z-40">
                <button
                    onClick={(e) => { e.stopPropagation(); setIsMenuOpen(true); }}
                    className="p-3 bg-white/5 border border-white/10 rounded-full text-white/70 hover:text-white backdrop-blur-md transition-all shadow-lg"
                >
                    <Menu size={24} />
                </button>
            </div>

            {/* Mobile Fullscreen Menu Overlay */}
            {isMenuOpen && (
                <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col sm:hidden p-8 animate-in fade-in duration-200">
                    <div className="flex justify-between items-center mb-12">
                        <div className="text-green-500 font-mono tracking-widest text-xs uppercase flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${credits < 5 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
                            {credits}% PWR
                        </div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); }}
                            className="p-2 text-gray-400 hover:text-white"
                        >
                            <X size={28} />
                        </button>
                    </div>
                    
                    <div className="flex-1 flex flex-col justify-center gap-6">
                        <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onOpenStore(); }} className="flex items-center gap-4 text-gray-300 hover:text-white p-4 border border-white/5 bg-white/5 rounded-2xl active:scale-95 transition-all">
                            <Activity size={24} className="text-green-400" />
                            <span className="font-mono uppercase tracking-widest text-sm">Gestion Énergie</span>
                        </button>

                        <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onOpenSaves(); }} className="flex items-center gap-4 text-gray-300 hover:text-white p-4 border border-white/5 bg-white/5 rounded-2xl active:scale-95 transition-all">
                            <Activity size={24} className="rotate-90 text-yellow-400" />
                            <span className="font-mono uppercase tracking-widest text-sm">Sauvegardes</span>
                        </button>

                        <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onToggleTheme(); }} className="flex items-center gap-4 text-gray-300 hover:text-white p-4 border border-white/5 bg-white/5 rounded-2xl active:scale-95 transition-all">
                            <Palette size={24} className="text-purple-400" />
                            <span className="font-mono uppercase tracking-widest text-sm">Thème ({orbTheme})</span>
                        </button>

                        <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onOpenSettings(); }} className="flex items-center gap-4 text-gray-300 hover:text-white p-4 border border-white/5 bg-white/5 rounded-2xl active:scale-95 transition-all">
                            <Settings size={24} className="text-cyan-400" />
                            <span className="font-mono uppercase tracking-widest text-sm">Architecture Orbe</span>
                        </button>

                        <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onOpenProfile(); }} className="flex items-center gap-4 text-gray-300 hover:text-white p-4 border border-white/5 bg-white/5 rounded-2xl active:scale-95 transition-all">
                            <UserCircle size={24} className="text-blue-400" />
                            <span className="font-mono uppercase tracking-widest text-sm">Profil</span>
                        </button>

                        <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onExport(); }} className="flex items-center gap-4 text-gray-300 hover:text-white p-4 border border-white/5 bg-white/5 rounded-2xl active:scale-95 transition-all">
                            <PlusCircle size={24} className="rotate-45 text-green-500" />
                            <span className="font-mono uppercase tracking-widest text-sm">Exporter</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Desktop Subtle Management Bar */}
            <div className="absolute bottom-4 sm:bottom-8 left-0 right-0 z-30 hidden sm:flex items-center justify-center gap-6 px-4 py-2 pb-8">
                <button
                    onClick={(e) => { e.stopPropagation(); onOpenStore(); }}
                    className="flex items-center gap-2 group hover:text-green-400 transition-colors p-2"
                >
                    <div className={`w-3 h-3 rounded-full ${credits < 5 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} style={{ boxShadow: credits < 5 ? '0 0 8px rgba(239, 68, 68, 0.5)' : '0 0 8px rgba(34, 197, 94, 0.5)' }} />
                    <span className="text-[11px] font-mono font-bold text-gray-400 group-hover:text-gray-300 uppercase tracking-widest">{credits}% PWR</span>
                </button>

                <div className="h-6 w-[1px] bg-white/5 mx-1" />

                <button
                    onClick={(e) => { e.stopPropagation(); onOpenSaves(); }}
                    className="text-gray-600 hover:text-white transition-colors p-3"
                    title="Saves/Load"
                >
                    <Activity className="w-[22px] h-[22px] rotate-90" />
                </button>

                <button
                    onClick={(e) => { e.stopPropagation(); onToggleTheme(); }}
                    className="text-gray-600 hover:text-white transition-colors p-3 group relative"
                    title={`Theme: ${orbTheme}`}
                >
                    <Palette className="w-[22px] h-[22px]" />
                    <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/80 text-[8px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        {orbTheme.toUpperCase()}
                    </span>
                </button>

                <button
                    onClick={(e) => { e.stopPropagation(); onOpenSettings(); }}
                    className="text-gray-600 hover:text-cyan-400 transition-colors p-3"
                    title="Orb Architecture"
                >
                    <Settings className="w-[22px] h-[22px]" />
                </button>

                <div className="h-6 w-[1px] bg-white/5 mx-1" />

                <button
                    onClick={(e) => { e.stopPropagation(); onOpenProfile(); }}
                    className="text-gray-600 hover:text-white transition-colors p-3"
                    title="Profile"
                >
                    <UserCircle className="w-[22px] h-[22px]" />
                </button>

                <button
                    onClick={(e) => { e.stopPropagation(); onExport(); }}
                    className="text-gray-600 hover:text-green-500 transition-colors p-3"
                    title="Export Transcript"
                >
                    <PlusCircle className="w-[20px] h-[20px] rotate-45" />
                </button>
            </div>

            {/* Background is pure black via bg-black class on the main container */}

            <style>{`
                @keyframes scan {
                    from { transform: translateX(-100%); }
                    to { transform: translateX(400%); }
                }
                .animate-scan {
                    animation: scan 3s linear infinite;
                }
            `}</style>
        </div>
    );
};

export default AudioMinimalistMode;
