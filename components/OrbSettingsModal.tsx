import React, { useState, useEffect, useRef } from 'react';
import { Settings, X, RotateCcw, GripHorizontal, Mic, Zap, Volume2 } from 'lucide-react';
import { OrbSettings, ThemeSettings, OrbMode } from '../types';

interface OrbSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: ThemeSettings;
    onSettingsChange: (settings: ThemeSettings) => void;
    onReset: () => void;
    themeName: string;
    onActiveModeChange?: (mode: OrbMode | null) => void;
    onApplyToAll?: (settings: OrbSettings) => void;
    voiceSettings?: any;
    onVoiceSettingsChange?: (settings: any) => void;
    allThemesList?: readonly string[];
    enabledThemes?: string[];
    onEnabledThemesChange?: (themes: string[]) => void;
    savedPresets?: { name: string, settings: OrbSettings }[];
    onSavePreset?: (name: string, settings: OrbSettings) => void;
    onRemovePreset?: (name: string) => void;
    onApplyPreset?: (settings: OrbSettings) => void;
    isMobile?: boolean;
    onResetAll?: () => void;
}

const OrbSettingsModal: React.FC<OrbSettingsModalProps> = ({
    isOpen,
    onClose,
    settings,
    onSettingsChange,
    onReset,
    themeName,
    onActiveModeChange,
    onApplyToAll,
    voiceSettings,
    onVoiceSettingsChange,
    allThemesList = [],
    enabledThemes = [],
    onEnabledThemesChange,
    savedPresets = [],
    onSavePreset,
    onRemovePreset,
    onApplyPreset,
    isMobile = false,
    onResetAll
}) => {
    const [position, setPosition] = useState({ x: isMobile ? 0 : 20, y: isMobile ? 0 : 20 });
    const [presetName, setPresetName] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [activeMode, setActiveMode] = useState<OrbMode>('idle');
    const dragStartPos = useRef({ x: 0, y: 0 });
    const modalRef = useRef<HTMLDivElement>(null);

    const currentModeSettings = settings[activeMode];

    useEffect(() => {
        if (!isOpen) {
            onActiveModeChange?.(null);
            return;
        }
        onActiveModeChange?.(activeMode);
    }, [isOpen, activeMode, onActiveModeChange]);

    useEffect(() => {
        if (!isOpen) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            const dx = e.clientX - dragStartPos.current.x;
            const dy = e.clientY - dragStartPos.current.y;
            setPosition(prev => ({ x: prev.x + dx, y: prev.y + dy }));
            dragStartPos.current = { x: e.clientX, y: e.clientY };
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!isDragging) return;
            const touch = e.touches[0];
            const dx = touch.clientX - dragStartPos.current.x;
            const dy = touch.clientY - dragStartPos.current.y;
            setPosition(prev => ({ x: prev.x + dx, y: prev.y + dy }));
            dragStartPos.current = { x: touch.clientX, y: touch.clientY };
        };

        const handleUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleUp);
            window.addEventListener('touchmove', handleTouchMove, { passive: false });
            window.addEventListener('touchend', handleUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleUp);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleUp);
        };
    }, [isDragging, isOpen]);

    if (!isOpen) return null;

    const handleMouseDown = (e: React.MouseEvent) => {
        if (isMobile) return; // Disable dragging via header on mobile if we use centering
        setIsDragging(true);
        dragStartPos.current = { x: e.clientX, y: e.clientY };
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        setIsDragging(true);
        const touch = e.touches[0];
        dragStartPos.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleSliderChange = (key: keyof OrbSettings | string, value: any) => {
        const newModeSettings = { ...currentModeSettings };

        if (typeof key === 'string' && key.startsWith('lightPos.')) {
            const axis = key.split('.')[1] as keyof OrbSettings['lightPos'];
            newModeSettings.lightPos = {
                ...newModeSettings.lightPos,
                [axis]: value
            };
        } else {
            (newModeSettings as any)[key] = value;
        }

        const updatedSettings = { ...settings };
        updatedSettings[activeMode] = newModeSettings;
        onSettingsChange(updatedSettings);
    };

    const SettingRow = ({ label, value, min, max, step, onChange }: any) => (
        <div className="flex flex-col gap-2 mb-4">
            <div className="flex justify-between items-center">
                <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500">{label}</label>
                <span className="text-[10px] font-mono text-cyan-500 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                    {typeof value === 'number' ? value.toFixed(2) : value}
                </span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
        </div>
    );

    const ColorRow = ({ label, value, onChange }: any) => (
        <div className="flex items-center justify-between mb-3">
            <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500">{label}</label>
            <div className="flex items-center gap-3">
                <input
                    type="color"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer p-0 overflow-hidden"
                />
            </div>
        </div>
    );

    const ModeTab = ({ mode, label, icon: Icon }: { mode: OrbMode, label: string, icon: any }) => (
        <button
            onClick={() => setActiveMode(mode)}
            className={`flex-1 flex flex-col items-center gap-1 py-3 transition-all border-b-2 ${activeMode === mode ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5' : 'border-transparent text-gray-600 hover:text-gray-400'}`}
        >
            <Icon size={14} />
            <span className="text-[9px] font-mono uppercase tracking-widest font-bold">{label}</span>
        </button>
    );

    return (
        <div
            className={`fixed ${isMobile ? 'inset-0 items-center justify-center p-4' : ''} flex z-[100] pointer-events-none`}
            style={!isMobile ? { left: `${position.x}px`, top: `${position.y}px` } : undefined}
        >
            <div
                ref={modalRef}
                className={`${isMobile ? 'w-full max-w-md max-h-[85vh]' : 'w-80'} bg-black/95 border border-cyan-500/30 rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col pointer-events-auto backdrop-blur-xl overflow-hidden`}
            >
                {/* Header/Grabber */}
                <div
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleTouchStart}
                    className="px-4 py-3 border-b border-white/10 bg-white/5 flex items-center justify-between cursor-grab active:cursor-grabbing select-none"
                >
                    <div className="flex items-center gap-3">
                        <GripHorizontal size={14} className="text-gray-600" />
                        <h2 className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-white">Config : {themeName.toUpperCase()}</h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onReset}
                            className="text-gray-500 hover:text-white transition-colors"
                            title="Réinitialiser tout le thème"
                        >
                            <RotateCcw size={14} />
                        </button>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-white transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Mode Selector */}
                <div className="flex border-b border-white/5">
                    <ModeTab mode="idle" label="Silence" icon={Volume2} />
                    <ModeTab mode="user" label="Utilisateur" icon={Mic} />
                    <ModeTab mode="ai" label="IA (Voix)" icon={Zap} />
                </div>

                {/* Content */}
                <div className="p-5 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    <div className="mb-6">
                        <h3 className="text-[9px] font-mono text-cyan-800 uppercase tracking-widest mb-3 border-b border-cyan-900/20 pb-1">Réaction & Mouvement</h3>
                        <SettingRow
                            label="Amplitude Audio"
                            value={currentModeSettings.amplitude}
                            min={0.0} max={0.4} step={0.01}
                            onChange={(val: number) => handleSliderChange('amplitude', val)}
                        />
                        <SettingRow
                            label="Densité (Points)"
                            value={currentModeSettings.density}
                            min={0} max={400} step={1}
                            onChange={(val: number) => handleSliderChange('density', Math.round(val))}
                        />
                        <SettingRow
                            label="Vitesse"
                            value={currentModeSettings.speed}
                            min={0.0} max={0.6} step={0.01}
                            onChange={(val: number) => handleSliderChange('speed', val)}
                        />
                        <SettingRow
                            label="Ondulations (Waviness)"
                            value={currentModeSettings.waviness}
                            min={0.1} max={1.0} step={0.01}
                            onChange={(val: number) => handleSliderChange('waviness', val)}
                        />
                    </div>

                    <div className="mb-6">
                        <h3 className="text-[9px] font-mono text-cyan-800 uppercase tracking-widest mb-3 border-b border-cyan-900/20 pb-1">Rendu & Optique</h3>
                        <SettingRow
                            label="Diamètre (Taille)"
                            value={currentModeSettings.size}
                            min={1.0} max={5.4} step={0.05}
                            onChange={(val: number) => handleSliderChange('size', val)}
                        />
                        <SettingRow
                            label="Luminosité (Bloom)"
                            value={currentModeSettings.bloom}
                            min={-0.1} max={0.1} step={0.005}
                            onChange={(val: number) => handleSliderChange('bloom', val)}
                        />
                        <SettingRow
                            label="Opacité Globale"
                            value={currentModeSettings.opacity}
                            min={0.7} max={1.0} step={0.01}
                            onChange={(val: number) => handleSliderChange('opacity', val)}
                        />
                        <SettingRow
                            label="Contraste"
                            value={currentModeSettings.contrast}
                            min={0.1} max={2.0} step={0.05}
                            onChange={(val: number) => handleSliderChange('contrast', val)}
                        />
                        <SettingRow
                            label="Luminosité Orbe"
                            value={currentModeSettings.brightness}
                            min={0.0} max={2.0} step={0.05}
                            onChange={(val: number) => handleSliderChange('brightness', val)}
                        />
                        <SettingRow
                            label="Taille du Cœur Neural"
                            value={currentModeSettings.coreSize}
                            min={0.0} max={1.2} step={0.01}
                            onChange={(val: number) => handleSliderChange('coreSize', val)}
                        />
                    </div>

                    <div className="mb-6">
                        <h3 className="text-[9px] font-mono text-cyan-800 uppercase tracking-widest mb-3 border-b border-cyan-900/20 pb-1">Direction Lumière</h3>
                        <SettingRow
                            label="Axe X (Horiz.)"
                            value={currentModeSettings.lightPos.x}
                            min={-20} max={12} step={1}
                            onChange={(val: number) => handleSliderChange('lightPos.x', val)}
                        />
                        <SettingRow
                            label="Axe Y (Vert.)"
                            value={currentModeSettings.lightPos.y}
                            min={-20} max={16} step={1}
                            onChange={(val: number) => handleSliderChange('lightPos.y', val)}
                        />
                        <SettingRow
                            label="Axe Z (Prof.)"
                            value={currentModeSettings.lightPos.z}
                            min={-20} max={30} step={1}
                            onChange={(val: number) => handleSliderChange('lightPos.z', val)}
                        />
                    </div>

                    <div className="mb-2">
                        <h3 className="text-[9px] font-mono text-cyan-800 uppercase tracking-widest mb-3 border-b border-cyan-900/20 pb-1">Palettes de Couleurs</h3>
                        <ColorRow
                            label="Couleur Principale"
                            value={currentModeSettings.color}
                            onChange={(val: string) => handleSliderChange('color', val)}
                        />
                    </div>

                    {/* V31 Voice Settings */}
                    {voiceSettings && onVoiceSettingsChange && (
                        <div className="mb-6 border-t border-cyan-900/30 pt-4">
                            <h3 className="text-[9px] font-mono text-cyan-800 uppercase tracking-widest mb-3 border-b border-cyan-900/20 pb-1">Profil Vocal IA</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center pr-2">
                                    <span className="text-[10px] font-mono uppercase text-gray-400">Voix Base</span>
                                    <select
                                        value={voiceSettings.name}
                                        onChange={(e) => onVoiceSettingsChange({ ...voiceSettings, name: e.target.value })}
                                        className="bg-black/40 border border-cyan-900/30 text-cyan-400 p-1 text-xs font-mono rounded"
                                    >
                                        <optgroup label="VOIX SKYIA">
                                            <option value="Charon">Charon (Grave)</option>
                                            <option value="Puck">Puck (Aigu)</option>
                                            <option value="Aoede">Aoede (Douce)</option>
                                            <option value="Kore">Kore (Calme)</option>
                                            <option value="Fenrir">Fenrir (Agressif)</option>
                                            <option value="Leda">Leda (Énergétique)</option>
                                            <option value="Orus">Orus (Ferme)</option>
                                            <option value="Zephyr">Zephyr (Doux)</option>
                                        </optgroup>
                                    </select>
                                </div>
                                <div className="flex justify-between items-center pr-2">
                                    <span className="text-[10px] font-mono uppercase text-gray-400">Vitesse</span>
                                    <select
                                        value={voiceSettings.speed}
                                        onChange={(e) => onVoiceSettingsChange({ ...voiceSettings, speed: e.target.value })}
                                        className="bg-black/40 border border-cyan-900/30 text-cyan-400 p-1 text-xs font-mono rounded"
                                    >
                                        <option value="très lente">Très Lente</option>
                                        <option value="lente">Lente</option>
                                        <option value="normale">Normale</option>
                                        <option value="rapide">Rapide</option>
                                        <option value="très rapide">Très Rapide</option>
                                    </select>
                                </div>
                                <div className="space-y-4 pt-4 border-t border-cyan-900/10">

                                    <SettingRow
                                        label="Distortion Robotique"
                                        value={voiceSettings.distortion}
                                        min={0} max={260} step={1}
                                        onChange={(val: number) => onVoiceSettingsChange({ ...voiceSettings, distortion: val })}
                                    />
                                    <SettingRow
                                        label="Fréquence Résonance"
                                        value={voiceSettings.frequency}
                                        min={0} max={400} step={1}
                                        onChange={(val: number) => onVoiceSettingsChange({ ...voiceSettings, frequency: val })}
                                    />
                                    <SettingRow
                                        label="Niveau de Métal (Q)"
                                        value={voiceSettings.resonance}
                                        min={0.0} max={0.2} step={0.01}
                                        onChange={(val: number) => onVoiceSettingsChange({ ...voiceSettings, resonance: val })}
                                    />
                                    <SettingRow
                                        label="Filtre Passe-Haut (Hz)"
                                        value={voiceSettings.highpass ?? 0}
                                        min={-1000} max={1000} step={10}
                                        onChange={(val: number) => onVoiceSettingsChange({ ...voiceSettings, highpass: val })}
                                    />
                                    <SettingRow
                                        label="Écho / Délai (ms)"
                                        value={voiceSettings.echo ?? 0}
                                        min={-100} max={100} step={1}
                                        onChange={(val: number) => onVoiceSettingsChange({ ...voiceSettings, echo: val })}
                                    />
                                    <SettingRow
                                        label="Modulation Anneau (Hz)"
                                        value={voiceSettings.ringModFreq ?? 0}
                                        min={-100} max={100} step={1}
                                        onChange={(val: number) => onVoiceSettingsChange({ ...voiceSettings, ringModFreq: val })}
                                    />
                                    <SettingRow
                                        label="Clarté Aigus (dB)"
                                        value={voiceSettings.treble ?? 0}
                                        min={-28} max={0} step={1}
                                        onChange={(val: number) => onVoiceSettingsChange({ ...voiceSettings, treble: val })}
                                    />
                                    <SettingRow
                                        label="Profondeur Graves (dB)"
                                        value={voiceSettings.bass ?? 0}
                                        min={-38} max={0} step={1}
                                        onChange={(val: number) => onVoiceSettingsChange({ ...voiceSettings, bass: val })}
                                    />
                                    <SettingRow
                                        label="Loudness Voix (dB)"
                                        value={voiceSettings.voiceGain ?? 0}
                                        min={-30} max={0} step={1}
                                        onChange={(val: number) => onVoiceSettingsChange({ ...voiceSettings, voiceGain: val })}
                                    />
                                    <SettingRow
                                        label="Noise Gate (Pureté)"
                                        value={voiceSettings.noiseGate ?? -100}
                                        min={-100} max={-72} step={1}
                                        onChange={(val: number) => onVoiceSettingsChange({ ...voiceSettings, noiseGate: val })}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* V31 Active Themes Toggle */}
                    {allThemesList && allThemesList.length > 0 && onEnabledThemesChange && (
                        <div className="mb-6 border-t border-cyan-900/30 pt-4">
                            <h3 className="text-[9px] font-mono text-cyan-800 uppercase tracking-widest mb-3 border-b border-cyan-900/20 pb-1">Thèmes Actifs</h3>
                            <div className="grid grid-cols-2 gap-2 text-[10px]">
                                {allThemesList.map(t => (
                                    <label key={t} className="flex items-center gap-2 cursor-pointer text-gray-400 hover:text-cyan-400">
                                        <input
                                            type="checkbox"
                                            checked={enabledThemes.includes(t)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    onEnabledThemesChange([...enabledThemes, t]);
                                                } else {
                                                    // Don't disable if it's the last one
                                                    if (enabledThemes.length > 1) {
                                                        onEnabledThemesChange(enabledThemes.filter(th => th !== t));
                                                    }
                                                }
                                            }}
                                            className="accent-cyan-600 rounded-sm bg-black border-cyan-900"
                                        />
                                        <span className="uppercase">{t}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* V31 Style Presets */}
                    {onSavePreset && onApplyPreset && (
                        <div className="mb-2 border-t border-cyan-900/30 pt-4">
                            <h3 className="text-[9px] font-mono text-cyan-800 uppercase tracking-widest mb-3 border-b border-cyan-900/20 pb-1">Styles Sauvegardés</h3>

                            <div className="flex gap-2 mb-3">
                                <div className="flex-1 relative">
                                    <input
                                        type="text"
                                        placeholder="Nom du style..."
                                        value={presetName}
                                        onChange={e => setPresetName(e.target.value)}
                                        className={`w-full bg-black/40 border ${savedPresets.some(p => p.name.toLowerCase() === presetName.toLowerCase().trim()) && presetName.trim() ? 'border-red-500/50' : 'border-cyan-900/30'} text-cyan-400 p-1.5 text-[10px] font-mono rounded`}
                                    />
                                    {savedPresets.some(p => p.name.toLowerCase() === presetName.toLowerCase().trim()) && presetName.trim() && (
                                        <div className="absolute -top-3 left-0 text-[8px] text-red-500 font-mono uppercase tracking-tighter">Nom déjà utilisé</div>
                                    )}
                                </div>
                                <button
                                    onClick={() => {
                                        if (presetName.trim()) {
                                            onSavePreset(presetName.trim(), currentModeSettings);
                                            setPresetName('');
                                        }
                                    }}
                                    disabled={!presetName.trim() || savedPresets.some(p => p.name.toLowerCase() === presetName.toLowerCase().trim())}
                                    className="px-3 bg-cyan-900/40 border border-cyan-500 hover:bg-cyan-500/50 text-[9px] uppercase font-bold text-cyan-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    Sauver
                                </button>
                            </div>

                            <div className="space-y-2">
                                {savedPresets.map((preset, idx) => (
                                    <div key={idx} className="flex items-center justify-between border border-white/5 bg-white/5 p-2 rounded group">
                                        <span className="text-[10px] text-gray-300 font-bold uppercase">{preset.name}</span>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => onApplyPreset(preset.settings)}
                                                className="px-2 py-1 bg-green-900/40 border border-green-500 hover:bg-green-500/50 text-[9px] uppercase font-bold text-green-300 rounded"
                                            >
                                                Appliquer
                                            </button>
                                            {onRemovePreset && (
                                                <button
                                                    onClick={() => onRemovePreset(preset.name)}
                                                    className="p-1 px-2 bg-red-900/20 border border-red-900/50 text-red-500 hover:bg-red-500 hover:text-white rounded transition-colors"
                                                    title="Supprimer ce style"
                                                >
                                                    <X size={10} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {savedPresets.length === 0 && (
                                    <div className="text-[9px] text-gray-500 italic text-center py-2">Aucun style sauvegardé</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-white/5 bg-white/5 flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-4">
                        <button
                            onClick={() => onApplyToAll?.(currentModeSettings)}
                            className="flex items-center gap-2 text-[9px] font-mono font-bold uppercase tracking-widest text-cyan-500 hover:text-cyan-400 transition-colors"
                            title="Appliquer ces réglages à TOUS les modes et thèmes"
                        >
                            <Zap size={10} /> Appliquer Partout
                        </button>
                        <button
                            onClick={onClose}
                            className="px-4 py-1.5 bg-cyan-600/20 border border-cyan-500/50 hover:bg-cyan-500/30 text-cyan-400 text-[10px] font-mono font-bold uppercase tracking-widest rounded transition-all"
                        >
                            Fermer
                        </button>
                    </div>
                    
                    {onResetAll && (
                        <button
                            onClick={onResetAll}
                            className="w-full py-2 bg-red-950/30 border border-red-500/30 hover:bg-red-900/40 text-red-500 text-[10px] font-mono font-bold uppercase tracking-[0.2em] rounded transition-all mt-1 hover:border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.1)] flex items-center justify-center gap-2"
                        >
                            <RotateCcw size={12} /> Restaurer Configuration Premium
                        </button>
                    )}
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; } .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }` }} />
        </div>
    );
};

export default OrbSettingsModal;
