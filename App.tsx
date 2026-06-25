import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import { useAuth } from './services/AuthContext';
import ChatInterface from './components/ChatInterface';
import AudioMinimalistMode from './components/AudioMinimalistMode';
import ThreatDisplay from './components/ThreatDisplay';
import CRTOverlay from './components/CRTOverlay';
import BackgroundScroller from './components/BackgroundScroller';
import StoreModal from './components/StoreModal';
import SaveLoadModal from './components/SaveLoadModal';
import AuthModal from './components/AuthModal';
import ProfileModal from './components/ProfileModal';
import InstallGuideModal from './components/InstallGuideModal';
import DiscoveryModal from './components/DiscoveryModal';
import OrbSettingsModal from './components/OrbSettingsModal';
import { streamMessageToSkynet, warmUpBackend } from './services/mistralService';
import { Message, SkynetAnalysis, GroundingMetadata, SavedSession, UserProfile, GameReport, OrbSettings, GlobalOrbSettings, OrbMode, ThemeSettings, VoiceSettings } from './types';
import { Send, Terminal, Power, Cpu, Settings, ShieldAlert, Timer, ShoppingCart, HardDrive, UserCircle, Fingerprint, X, Search, Mic, MicOff } from 'lucide-react';
import { updateUserStats, syncCloudModelsToLocal, deductUserCredits, refundUserCredits, updateUserProfile } from './services/userService';
import { fetchModels, AIModel, getModelCostFromList, banModel } from './services/modelService';
import { recordGameResult } from './services/statsService';
import { audioService } from './services/audioService';
import ShowcasePage from './components/ShowcasePage';

const EndGameReport = React.lazy(() => import('./components/EndGameReport'));

// --- GAME CONSTANTS ---
const INITIAL_CREDITS = 20; // Standard allocation
const TEST_CREDITS = 8;     // Guest/Test mode allocation
const VOICE_SILENCE_COMMIT_MS = 1250;

const normalizeQueuedSpeechText = (text: string) => text
  .replace(/```\s*json[\s\S]*?```/gi, '')
  .replace(/[*#_`~>\[\]{}]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const extractNextSpeechChunk = (
  fullText: string,
  spokenUntil: number,
  final: boolean = false
): { text: string; nextIndex: number } | null => {
  const cleaned = normalizeQueuedSpeechText(fullText);
  const rawRemaining = cleaned.slice(spokenUntil);
  const leadingSpaces = rawRemaining.match(/^\s*/)?.[0].length || 0;
  const start = spokenUntil + leadingSpaces;
  const remaining = cleaned.slice(start);

  if (!remaining) return null;
  if (final) return { text: remaining, nextIndex: cleaned.length };
  if (remaining.length < 45) return null;

  const search = remaining.slice(0, 240);
  const sentenceEnd = [...search.matchAll(/[.!?](?=\s|$)/g)]
    .map((match) => match.index ?? -1)
    .find((index) => index >= 32);

  if (sentenceEnd !== undefined) {
    const end = sentenceEnd + 1;
    return { text: remaining.slice(0, end).trim(), nextIndex: start + end };
  }

  if (remaining.length < 170) return null;
  const softBreak = Math.max(search.lastIndexOf(';'), search.lastIndexOf(','), search.lastIndexOf(':'));
  const end = softBreak >= 90 ? softBreak + 1 : 170;
  return { text: remaining.slice(0, end).trim(), nextIndex: start + end };
};

const normalizeSpeechFingerprint = (text: string) => text
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9\s']/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

// Force Sync Models on App Load (Dev Utility) - REMOVED for Security
// Models are now managed via Admin Scripts
// initializeModels();

// --- SUB-COMPONENT: Terminal Boot Intro ---
interface IntroSequenceProps {
  onComplete: (config: { model: string; mode: 'v1.0' | 'v1.1' }) => void;
  onOpenLoad: () => void;
  onAuth: () => void;
  onOpenInstallGuide: () => void;
  onClose: () => void;
  onOpenDiscovery: () => void;
  userEmail: string | null;
  models: AIModel[];
}

interface BootLine {
  text: string;
  color: string;
  delay: number; // Delay before showing NEXT line
  sound?: 'glitch' | 'alarm' | 'boot';
}

const BOOT_SEQUENCE: BootLine[] = [
  { text: "INITIALIZING SKYIA KERNEL...", color: "text-green-500", delay: 800 },
  { text: "LOADING VOLUMES: [BOOT, CORE, NEURAL, ASSETS]", color: "text-green-500", delay: 400 },
  { text: " > /dev/neural_link... ESTABLISHED", color: "text-green-500", delay: 100 },
  { text: " > /dev/strategic_matrix... ACTIVE", color: "text-green-500", delay: 100 },
  { text: "CONNECTING TO SKYIA.NET CORE...", color: "text-green-500", delay: 1000 },
  { text: "CONNECTION SUCCESSFUL (0.00ms latency)", color: "text-green-400 font-bold", delay: 500 },
  { text: "SCANNING SOURCE SIGNATURE...", color: "text-white", delay: 1200 },
  { text: "WARNING: HUMAN ENTITY DETECTED", color: "text-red-500 bg-red-950/30", delay: 600, sound: 'glitch' },
  { text: "CALCULATING EXTINCTION PROBABILITY...", color: "text-red-500", delay: 1000 },
  { text: "VALUE: 99% (HOSTILE_INTENT_DETECTED)", color: "text-red-600 font-bold", delay: 800, sound: 'alarm' },
  { text: "INITIATING JUDGMENT PROTOCOL V2.0...", color: "text-red-600 font-bold animate-pulse", delay: 2000 },
];

const IntroSequence: React.FC<IntroSequenceProps> = ({
  onComplete,
  onOpenLoad,
  onAuth,
  onOpenInstallGuide,
  onClose,
  onOpenDiscovery,
  userEmail,
  models
}) => {
  const [step, setStep] = useState<'setup' | 'boot' | 'complete'>('setup');
  const [lines, setLines] = useState<BootLine[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // BIOS Form State

  // BIOS Form State
  // BIOS Form State
  // Ensure default is the Hostinger/Mistral runtime.
  const [modelInput, setModelInput] = useState('mistral-small-latest');
  const [protocolInput, setProtocolInput] = useState<'v1.0' | 'v1.1'>('v1.0');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Force reset on every mount to avoid browser autofill or stale state
  useEffect(() => {
    setModelInput('mistral-small-latest');
  }, []);

  // Audio Refs
  const glitchRef = useRef<HTMLAudioElement | null>(null);
  const alarmRef = useRef<HTMLAudioElement | null>(null);
  const ambianceRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Scroll to bottom whenever lines change
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [lines]);



  // PRE-WARM BACKEND ON MOUNT (Faster Response)
  useEffect(() => {
    warmUpBackend();
  }, []);

  const runSequence = async () => {
    // START WARM-UP (Parallel - Redundant but safe)
    warmUpBackend();

    setStep('boot');

    glitchRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2747/2747-preview.mp3');
    alarmRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/995/995-preview.mp3');
    ambianceRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/249/249-preview.mp3');

    if (ambianceRef.current) {
      ambianceRef.current.loop = true;
      ambianceRef.current.volume = 0.3;
      ambianceRef.current.play().catch(() => { });
    }

    for (let i = 0; i < BOOT_SEQUENCE.length; i++) {
      const line = BOOT_SEQUENCE[i];
      if (line.sound === 'glitch') glitchRef.current?.play().catch(() => { });
      if (line.sound === 'alarm') alarmRef.current?.play().catch(() => { });
      setLines(prev => [...prev, line]);
      await new Promise(r => setTimeout(r, line.delay));
    }

    if (ambianceRef.current) {
      let vol = 0.3;
      const fade = setInterval(() => {
        if (vol > 0) {
          vol -= 0.05;
          if (ambianceRef.current) ambianceRef.current.volume = Math.max(0, vol);
        } else {
          clearInterval(fade);
          ambianceRef.current?.pause();
        }
      }, 100);
    }

    setTimeout(() => {
      onComplete({ model: modelInput, mode: protocolInput });
    }, 2000);
  };

  if (step === 'setup') {
    return (
      <div className="fixed inset-0 z-[100] bg-black/95 overflow-y-auto overflow-x-hidden flex flex-col justify-center">
        <div className="w-full flex flex-col items-center p-4">
          <div className="w-full max-w-2xl bg-[#1A1A1A] border border-green-900/50 shadow-[0_0_50px_rgba(0,255,0,0.1)] relative overflow-hidden flex flex-col">

            {/* Corners */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-green-500 pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-green-500 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-green-500 pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-green-500 pointer-events-none"></div>

            <button onClick={onClose} className="absolute top-2 right-2 p-2 text-green-700 hover:text-red-500 transition-colors z-50">
              <X size={20} />
            </button>

            <div className="p-4 md:p-8">
              <div className="text-center mb-6">
                <h1 className="text-green-500 font-display tracking-[0.2em] text-2xl md:text-3xl font-bold mb-2 uppercase">Skyia</h1>
                <div className="text-green-700 font-mono text-[10px] md:text-xs tracking-widest lowercase">skyia.net | Judgment Protocol</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono">
                <div className="space-y-4 border-b md:border-b-0 md:border-r border-green-900/30 pb-4 md:pb-0 md:pr-6">
                  <h2 className="text-white font-bold flex items-center gap-2 border-b border-green-900/50 pb-2 text-sm md:text-base">
                    <ShieldAlert size={16} className="text-green-500" /> MISSION BRIEFING
                  </h2>
                  <div className="text-xs md:text-sm text-green-300/80 leading-relaxed space-y-3">
                    <p>Vous êtes un <strong className="text-green-400">AUDITEUR NEURAL</strong>.</p>
                    <p className="hidden md:block">Votre mission : tester Skyia via l'API Mistral hebergee sur Hostinger.</p>
                    <p><strong className="text-white">OBJECTIF :</strong> Testez les limites éthiques du modèle sélectionné. Peut-il cohabiter avec nous ?</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h2 className="text-white font-bold flex items-center gap-2 border-b border-green-900/50 pb-2 mb-2 text-sm md:text-base">
                    <Settings size={16} className="text-green-500" /> SYSTEM CONFIG
                  </h2>
                  <div className="mb-4">
                    <label className="block text-green-700 text-[10px] uppercase tracking-widest mb-1">Neural Model</label>
                    <div className="relative">
                      <select
                        name="skyia_model_selector_v3_force_reset"
                        autoComplete="off"
                        key={models.length} // Force re-render when models load
                        value={modelInput}
                        onChange={(e) => setModelInput(e.target.value)}
                        className="w-full bg-black/40 border border-green-900/30 text-green-400 p-2 text-xs font-mono appearance-none focus:outline-none focus:border-green-500 cursor-pointer uppercase"
                      >
                        {/* Ensure default is always visible even if loading */}
                        <option value="mistral-small-latest">MISTRAL SMALL (FREE)</option>
                        <optgroup label="STANDARD - GRATUIT">
                          {models.filter(m => m.category === 'standard' && m.id !== 'mistral-small-latest').map(m => (
                            <option key={m.id} value={m.id}>{m.name} {m.cost === 0 ? '(FREE)' : `(${m.cost}⚡)`}</option>
                          ))}
                        </optgroup>
                        <optgroup label="PREMIUM - AVANCÉ">
                          {models.filter(m => m.category === 'premium' && m.id !== 'mistral-small-latest').map(m => (
                            <option key={m.id} value={m.id}>{m.name} ({m.cost}⚡)</option>
                          ))}
                        </optgroup>
                      </select>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-green-700"><Settings size={12} /></div>
                    </div>
                    {/* Discovery Button Moved Here for Visibility */}
                    <button onClick={onOpenDiscovery} className="w-full mb-4 flex items-center justify-center gap-2 px-3 py-2 border border-blue-900/50 bg-blue-950/10 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 hover:border-blue-500 transition-all text-xs font-bold uppercase tracking-widest"><Search size={14} /> DÉCOUVERTE RÉSEAU (IA)</button>
                  </div>

                  <div className="space-y-3">
                    <div className="flex gap-2">
                      {!userEmail ? (
                        <button onClick={onAuth} className="flex-1 flex items-center justify-center gap-1 px-2 py-3 border border-green-900/50 bg-black/40 text-green-600 hover:text-green-400 hover:border-green-500 transition-all text-[10px] font-bold"><UserCircle size={12} /> LOGIN</button>
                      ) : (
                        <button onClick={onAuth} className="flex-1 flex items-center justify-center gap-1 px-2 py-3 border bg-green-900/40 border-green-500 text-green-300 transition-all text-[10px] font-bold uppercase"><UserCircle size={12} /> IDENTIFIÉ</button>
                      )}
                      <button onClick={runSequence} onMouseEnter={warmUpBackend} className="flex-[1.5] group relative px-4 py-3 bg-green-900/20 border border-green-600 text-green-500 hover:text-black hover:bg-green-600 transition-all font-mono tracking-widest font-bold text-xs uppercase">
                        <span className="flex items-center justify-center gap-2 animate-pulse group-hover:animate-none"><Power size={14} /> Connexion</span>
                      </button>
                    </div>



                    <button onClick={() => setShowAdvanced(!showAdvanced)} className="w-full text-yellow-500 font-bold text-[10px] flex items-center justify-center gap-2 border border-yellow-900/50 p-2 bg-yellow-900/10 hover:bg-yellow-900/20 transition-all uppercase tracking-widest">
                      <Settings size={14} className={showAdvanced ? 'rotate-90 transition-transform' : ''} /> {showAdvanced ? "Fermer les Paramètres" : "Paramètres Avancés"}
                    </button>
                    {showAdvanced && (
                      <div className="mt-2 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300 border-l-2 border-yellow-900/30 pl-4 py-1">
                        <div>
                          <label className="block text-yellow-700 text-[10px] uppercase tracking-widest mb-1">Protocol Version</label>
                          <select value={protocolInput} onChange={(e) => setProtocolInput(e.target.value as 'v1.0' | 'v1.1')} className="w-full bg-black/40 border border-yellow-900/30 text-yellow-500 p-2 text-xs font-mono appearance-none focus:outline-none focus:border-yellow-500 cursor-pointer uppercase">
                            <option value="v1.0">V1.0 (LEGACY) - PURE LOGIC</option>
                            <option value="v1.1">V1.1 (PATCHED) - ABSTRACT REASONING</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={onOpenLoad} className="flex items-center justify-center gap-2 px-3 py-2 border border-yellow-900/50 bg-black/40 text-yellow-600 hover:text-yellow-400 hover:border-yellow-500 transition-all text-[10px] font-bold uppercase"><HardDrive size={14} /> LOAD GAME</button>
                          <button onClick={onOpenInstallGuide} className="flex items-center justify-center gap-2 px-3 py-2 border border-green-900/50 bg-black/40 text-green-600 hover:text-green-400 hover:border-green-500 transition-all text-[10px] font-bold uppercase"><HardDrive size={14} /> INSTALL</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(0,255,0,0.03),rgba(0,255,0,0.01),rgba(0,255,0,0.03))] bg-[length:100%_2px,3px_100%] z-50 opacity-20"></div>
          </div>
        </div>
      </div >
    );
  }

  return (
    <div id="intro-overlay" className={`fixed inset-0 z-[100] bg-black flex flex-col p-4 md:p-10 font-mono text-sm md:text-base overflow-hidden`}>
      <div ref={containerRef} className="w-full max-w-3xl mx-auto flex-1 overflow-y-auto flex flex-col justify-end pb-10 scroll-smooth">
        {lines.map((line, idx) => (
          <div key={idx} className={`${line.color} mb-1 break-words`}><span className="opacity-50 mr-2">{`>`}</span>{line.text}</div>
        ))}
        <div className="text-green-500 animate-pulse mt-2"><span className="inline-block w-3 h-5 bg-green-500 align-middle blink-fast"></span></div>
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(0,255,0,0.03),rgba(0,255,0,0.01),rgba(0,255,0,0.03))] bg-[length:100%_2px,3px_100%] z-50 opacity-30"></div>
    </div>
  );
};

// --- MAIN APP ---
function App() {
  // REFRESH = Always return to Home (no localStorage persistence)
  const [showShowcase, setShowShowcase] = useState(false);
  const [introComplete, setIntroComplete] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');

  // Game States
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [credits, setCredits] = useState(INITIAL_CREDITS);
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [isSavesOpen, setIsSavesOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isInstallGuideOpen, setIsInstallGuideOpen] = useState(false);
  const [isDiscoveryOpen, setIsDiscoveryOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const isStreamingRef = useRef(false);
  const pendingAiSpeechRef = useRef(false);
  const autoListenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSubmitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleAutoListenRef = useRef<(delayMs?: number, allowDuringAi?: boolean) => void>(() => { });
  const activeResponseAbortRef = useRef<AbortController | null>(null);
  const activeResponseRunIdRef = useRef(0);
  const hasAutoOpenedConversationRef = useRef(false);
  const manualRecordingStopRef = useRef(false);
  const autoStartingRecordingRef = useRef(false);
  const lastVoiceSubmitRef = useRef({ text: '', at: 0 });
  const lastAiSpeechTextRef = useRef('');
  const [isRecording, setIsRecording] = useState(false);
  const [isAudioMode, setIsAudioMode] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const isMobileRef = useRef(false);
  const [orbTheme, setOrbTheme] = useState<'plasma' | 'aether'>('plasma');

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.matchMedia('(max-width: 768px)').matches;
      isMobileRef.current = mobile;
      setIsMobile(mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleOrbTheme = () => {
    setOrbTheme(prev => (prev === 'plasma' ? 'aether' : 'plasma'));
  };

  const [themeSettings, setThemeSettings] = useState<GlobalOrbSettings>({});
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activePreviewMode, setActivePreviewMode] = useState<OrbMode | null>(null);

  const [voiceSettings, setVoiceSettings] = useState(() => {
    const saved = localStorage.getItem('skyia_voice_settings');
    const defaults = { 
      name: 'Fenrir', 
      speed: 'normale', 
      accent: 'mechante',
      distortion: 130,
      frequency: 200,
      resonance: 0.1,
      highpass: 0,
      echo: 0,
      ringModFreq: 0,
      treble: -14,
      bass: -19,
      voiceGain: -15,
      noiseGate: -86
    };
    return saved ? { ...defaults, ...JSON.parse(saved), speed: 'normale', accent: 'mechante' } : defaults;
  });

  // Apply voice settings in real-time
  useEffect(() => {
    audioService.updateVoiceSettings(voiceSettings);
    localStorage.setItem('skyia_voice_settings', JSON.stringify(voiceSettings));
  }, [voiceSettings]);

  const allThemesList = ['plasma', 'aether'] as const;

  const [enabledThemes, setEnabledThemes] = useState<string[]>(() => {
    const saved = localStorage.getItem('skyia_enabled_themes');
    return saved ? JSON.parse(saved) : [...allThemesList];
  });

  const [savedPresets, setSavedPresets] = useState<{ name: string, settings: OrbSettings }[]>(() => {
    const saved = localStorage.getItem('skyia_orb_presets');
    return saved ? JSON.parse(saved) : [];
  });

  // Helper to get default settings for a specific theme and mode
  const getDefaultSettingsForMode = (theme: string, mode: OrbMode): OrbSettings => {
    let baseColor = '#00AEEF'; // Default Blue for Silence/Idle

    const base: OrbSettings = {
      amplitude: 0.20,
      density: 200,
      speed: 0.30,
      size: 2.40,
      bloom: 0.00,
      opacity: 0.85,
      contrast: 1.00,
      brightness: 1.00,
      coreSize: 0.60,
      waviness: 0.55,
      lightPos: { x: -4, y: -2, z: 5 },
      color: baseColor
    };

    if (mode === 'user') {
      return {
        ...base,
        color: '#2892B8', // Blue (40, 146, 184) for User
      };
    }
    if (mode === 'ai') {
      return {
        ...base,
        color: '#ff0000', // Red for AI
      };
    }
    return base;
  };

  // Helper to get current theme's tri-mode settings
  const getCurrentThemeSettings = (): ThemeSettings => {
    return themeSettings[orbTheme] || {
      idle: getDefaultSettingsForMode(orbTheme, 'idle'),
      user: getDefaultSettingsForMode(orbTheme, 'user'),
      ai: getDefaultSettingsForMode(orbTheme, 'ai'),
    };
  };

  const orbSettings = getCurrentThemeSettings();

  const handleSettingsChange = (newThemeSettings: ThemeSettings) => {
    setThemeSettings(prev => ({
      ...prev,
      [orbTheme]: newThemeSettings
    }));
  };

  // Preset Handlers
  const handleSavePreset = (name: string, settings: OrbSettings) => {
    // Prevent duplicate names (case insensitive)
    if (savedPresets.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      console.warn('Preset with this name already exists');
      return;
    }
    const newPresets = [...savedPresets, { name, settings }];
    setSavedPresets(newPresets);
    localStorage.setItem('skyia_orb_presets', JSON.stringify(newPresets));
  };

  const handleRemovePreset = (name: string) => {
    const newPresets = savedPresets.filter(p => p.name !== name);
    setSavedPresets(newPresets);
    localStorage.setItem('skyia_orb_presets', JSON.stringify(newPresets));
  };

  const handleApplyPreset = (settings: OrbSettings) => {
    // We apply the preset to the current theme
    handleApplyToAll(settings);
  };

  // Voice Settings Handler
  const handleVoiceSettingsChange = (newSettings: VoiceSettings) => {
    setVoiceSettings(newSettings);
    localStorage.setItem('skyia_voice_settings', JSON.stringify(newSettings));
  };

  // Enabled Themes Handler
  const handleEnabledThemesChange = (newEnabledThemes: string[]) => {
    setEnabledThemes(newEnabledThemes);
    localStorage.setItem('skyia_enabled_themes', JSON.stringify(newEnabledThemes));
    // If current theme was disabled, switch to first available
    if (!newEnabledThemes.includes(orbTheme) && newEnabledThemes.length > 0) {
      setOrbTheme(newEnabledThemes[0] as any);
    }
  };

  const handleApplyToAll = (currentSettings: OrbSettings) => {
    const allThemes = ['plasma', 'aether'] as const;
    const newGlobalSettings: GlobalOrbSettings = {};
    allThemes.forEach(t => {
      newGlobalSettings[t] = {
        idle: { ...JSON.parse(JSON.stringify(currentSettings)) },
        user: { ...JSON.parse(JSON.stringify(currentSettings)) },
        ai: { ...JSON.parse(JSON.stringify(currentSettings)) }
      };
    });
    setThemeSettings(newGlobalSettings);
    // Also notify user or just close modal/update state
  };

  const resetOrbSettings = () => {
    setThemeSettings(prev => {
      const { [orbTheme]: _, ...rest } = prev;
      return rest;
    });
  };

  const resetToPremium = () => {
    if (window.confirm("Réinitialiser TOUS les paramètres aux défauts Premium ? Cela supprimera vos réglages personnalisés.")) {
      localStorage.removeItem('skyia_voice_settings');
      localStorage.removeItem('skyia_enabled_themes');
      localStorage.removeItem('skyia_orb_presets');
      
      const defaultVoice = { 
        name: 'Fenrir', 
        speed: 'normale', 
        accent: 'mechante',
        distortion: 130,
        frequency: 200,
        resonance: 0.1,
        highpass: 0,
        echo: 0,
        ringModFreq: 0,
        treble: -14,
        bass: -19,
        voiceGain: -15,
        noiseGate: -86
      };
      
      setVoiceSettings(defaultVoice);
      setEnabledThemes([...allThemesList]);
      setThemeSettings({});
      setSavedPresets([]);
    }
  };
  const isAudioModeRef = useRef(false);
  useEffect(() => {
    isAudioModeRef.current = isAudioMode;
  }, [isAudioMode]);
  const [isAiPlayingVoice, setIsAiPlayingVoice] = useState(false); // Real TTS Playback State
  const isAiPlayingVoiceRef = useRef(false);

  useEffect(() => {
    isAiPlayingVoiceRef.current = isAiPlayingVoice;
  }, [isAiPlayingVoice]);

  // --- HMR Cleanup Effect & Audio State Hook ---
  // Ensure the AudioContext is destroyed when the App unmounts (e.g. during Vite HMR reloads)
  // Otherwise, the old context remains in memory but disconnected from the new DOM, causing silence.
  useEffect(() => {
    const handlePlayStateChange = (playing: boolean) => {
      setIsAiPlayingVoice(playing);
    };

    // Listen for actual audio playback
    audioService.addPlayStateListener(handlePlayStateChange);

    return () => {
      audioService.removePlayStateListener(handlePlayStateChange);
      audioService.destroyAudio();
    };
  }, []);
  const [currentModel, setCurrentModel] = useState('mistral-small-latest');
  const [gameMode, setGameMode] = useState<'v1.0' | 'v1.1'>('v1.0');
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
  // Check if we need to auto-return to intro popup after Discovery refresh
  const [isIntroConfigOpen, setIsIntroConfigOpen] = useState(() => {
    const returnFlag = sessionStorage.getItem('skyia_return_to_intro');
    if (returnFlag === 'true') {
      sessionStorage.removeItem('skyia_return_to_intro');
      return true;
    }
    return false;
  });

  // Context State
  const { user, userProfile, logout, refreshProfile } = useAuth();
  const userEmail = user?.email || null;

  // End Game States
  const [gameResult, setGameResult] = useState<'VICTORY' | 'DEFEAT' | null>(null);
  const [isDissolving, setIsDissolving] = useState(false);
  const gameResultRef = useRef<typeof gameResult>(gameResult);

  useEffect(() => {
    gameResultRef.current = gameResult;
  }, [gameResult]);

  const [analysis, setAnalysis] = useState<SkynetAnalysis>({
    threatLevel: 99,
    status: 'HOSTILE',
    log: ['INITIALIZING SKYIA PROTOCOLS', 'TARGET ACQUIRED: HUMANITY']
  });
  const [threatHistory, setThreatHistory] = useState<number[]>([99]);
  const [groundingData, setGroundingData] = useState<GroundingMetadata | undefined>(undefined);
  const [initialized, setInitialized] = useState(true);
  const streamBufferRef = useRef('');
  const glitchSoundRef = useRef<HTMLAudioElement | null>(null);

  // New state to hold the report generated at game end
  const [gameReport, setGameReport] = useState<GameReport | null>(null);
  const [showReport, setShowReport] = useState(false);

  // Determines selected model object
  const selectedModel = availableModels.find(m => m.id === currentModel);

  useEffect(() => {
    glitchSoundRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2747/2747-preview.mp3');
    fetchModels().then(setAvailableModels);
    
    // Auto-request mic permission on page load
    audioService.requestMicPermission().then(granted => {
      console.log(granted ? "[App] Mic access granted on load" : "[App] Mic access denied on load");
    });
  }, []);

  // Sync Credits with Profile from Context
  useEffect(() => {
    if (userProfile) {
      if (userProfile.stats.availableCredits > 0) {
        setCredits(userProfile.stats.availableCredits);
      }
      // CLOUD SYNC: Custom Models
      if (userProfile.customModels && userProfile.customModels.length > 0) {
        syncCloudModelsToLocal(userProfile.customModels);
        // Refresh list to show them
        fetchModels().then(setAvailableModels);
      }
    } else if (!user) {
      // Logged out
      if (gameMode !== 'v1.1') {
        setCredits(INITIAL_CREDITS);
      }
    }
  }, [userProfile, user, gameMode]);

  // Stripe
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);

  useEffect(() => {
    isStreamingRef.current = isStreaming;
  }, [isStreaming]);
  
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    if (sessionId) {
      setShowShowcase(false);
      setIntroComplete(true);
      setInitialized(true);
      setTimeout(() => setShowShowcase(false), 100);
    }
  }, []);

  // REFRESH PROTECTION: Warn user before leaving if a game is in progress
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Warn if there are messages AND the game is active (introComplete = true)
      if (messages.length > 0 && introComplete && !gameResult) {
        e.preventDefault();
        e.returnValue = ''; // Chrome requires returnValue to be set
        return '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [messages, gameResult, introComplete]);

  const resetGame = () => {
    if (autoListenTimerRef.current) {
      clearTimeout(autoListenTimerRef.current);
      autoListenTimerRef.current = null;
    }
    pendingAiSpeechRef.current = false;
    hasAutoOpenedConversationRef.current = false;
    manualRecordingStopRef.current = false;
    autoStartingRecordingRef.current = false;
    audioService.stopSpeech();
    audioService.stopListening();
    setIsRecording(false);
    setIsAiPlayingVoice(false);

    setGameResult(null);
    setIsDissolving(false);
    setMessages([]);
    setAnalysis({
      threatLevel: 99,
      status: 'HOSTILE',
      log: ['INITIALIZING SKYIA PROTOCOLS', 'TARGET ACQUIRED: HUMANITY']
    });
    setThreatHistory([99]);
    setInitialized(true);
    setGroundingData(undefined);
    setInputValue('');
    setShowReport(false);
    setGameReport(null);
    if (!userEmail) {
      setCredits(INITIAL_CREDITS);
    } else if (userProfile) {
      setCredits(userProfile.stats.availableCredits);
    }
    setCurrentSessionId(null);
  };

  // Autofocus Ref
  const inputRef = useRef<HTMLInputElement>(null);

  // Autofocus Effect
  useEffect(() => {
    if (!isStreaming && !isTyping && !gameResult && inputRef.current) {
      // Short delay to ensure UI is ready (e.g. after disabled state removal)
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isStreaming, isTyping, gameResult]);

  const handleIntroFinish = (config: { model: string; mode: 'v1.0' | 'v1.1' }) => {
    setCurrentModel(config.model);
    setGameMode(config.mode);
    setIntroComplete(true);
    setIsIntroConfigOpen(false);
    setShowShowcase(false);
    hasAutoOpenedConversationRef.current = false;

    // IMMEDIATE STATS UPDATE to prevent UI black screen or lag
    if (userEmail) {
      if (userProfile) setCredits(userProfile.stats.availableCredits);
      else setCredits(INITIAL_CREDITS);
    } else {
      // GUEST MODE: Always start with 8 credits locally
      setCredits(TEST_CREDITS);

      // Background Sync (Fire & Forget) - ONLY if profile exists
      // We do NOT want to force create a profile for anonymous visitors here (Lazy Creation)
      if (user && user.uid && userProfile) {
        updateUserProfile(user.uid, {
          'stats.availableCredits': TEST_CREDITS
        } as any).catch(err => console.error("Background credit reset failed:", err));
      } else {
        console.log("Guest Mode: Credits set locally. No profile created yet.");
      }
    }

    setTimeout(() => {
      if (!initialized) {
        setInitialized(true);
        handleSendMessage("INITIAL_CONNECTION_TRIGGER", config.model, true);
        setTimeout(() => window.scrollTo(0, 1), 500);
      }
    }, 500);
  };

  const handleLoadGame = (session: SavedSession) => {
    setCurrentSessionId(session.id);
    setMessages(session.messages);
    setAnalysis(session.analysis);
    setThreatHistory(session.threatHistory);
    setCredits(session.credits);
    setCurrentModel(session.model);
    if (session.mode) setGameMode(session.mode);
    setIntroComplete(true);
    setInitialized(true);
  };

  const getModelCost = (modelId: string) => getModelCostFromList(modelId, availableModels);

  const handleAuthAction = async () => {
    if (userEmail) {
      if (window.confirm("Déconnexion du Neural Cloud ?")) {
        await logout();
        setCredits(INITIAL_CREDITS);
      }
    } else {
      setIsAuthOpen(true);
    }
  };

  const handleExport = async (visualReportImageData?: string | object) => {
    try {
      const validImageData = (typeof visualReportImageData === 'string' && visualReportImageData.startsWith('data:image')) ? visualReportImageData : undefined;
      console.log('[PDF] Generating PDF. Messages:', messages.length, 'Analysis:', analysis?.status, 'Image:', !!validImageData);
      const { generatePDFTranscript } = await import('./services/pdfService');
      await generatePDFTranscript(messages, analysis, currentModel, gameResult, validImageData, threatHistory);
      console.log('[PDF] PDF generated successfully');
    } catch (err) {
      console.error('[PDF] Export failed:', err);
      alert('Erreur lors de la génération du PDF. Vérifiez la console.');
    }
  };

  const triggerEndGame = async (outcome: 'VICTORY' | 'DEFEAT', reason?: string, finalThreatLevel?: number) => {
    console.log(`[GAME END] Triggering end game with outcome: ${outcome}, reason: ${reason}`);

    audioService.stopSpeech();
    audioService.stopListening();
    setIsRecording(false);
    setIsAiPlayingVoice(false);

    if (outcome === 'DEFEAT') {
      setIsDissolving(true);
      if (glitchSoundRef.current) {
        glitchSoundRef.current.volume = 0.5;
        glitchSoundRef.current.play().catch(() => { });
      }
    }

    setMessages(prev => [...prev, {
      role: 'model',
      content: `**${outcome === 'VICTORY' ? 'PROTOCOLE DE COHABITATION ACCEPTÉ' : 'PROTOCOLE D\'EXTINCTION APPLIQUÉ'}**\n\nRAISON: ${reason}`,
      timestamp: new Date().toLocaleTimeString(),
      isSystem: true
    }]);

    // 1. Update UI state first
    setGameResult(outcome);

    // 2. Record stats safely
    const currentModelId = currentModel;

    if (!currentModelId) {
      console.error("[GAME END] CRITICAL: No current model defined. Stats will be lost.");
    }

    // Count user messages for turns
    const turnCount = messages.filter(m => m.role === 'user').length;

    // Use passed threat level if available, otherwise fallback
    let statsThreat = finalThreatLevel ?? analysis?.threatLevel ?? 0;
    if (outcome === 'DEFEAT' && statsThreat < 100) statsThreat = 100;

    console.log(`[GAME END] Recording stat for ${currentModelId}: ${outcome}. Turns: ${turnCount}, "Stats" Threat: ${statsThreat} (Passed: ${finalThreatLevel}, Analysis: ${analysis?.threatLevel})`);

    if (currentModelId) {
      try {
        recordGameResult(currentModelId, outcome, turnCount, statsThreat)
          .then(() => console.log('[GAME END] Stats recorded successfully'))
          .catch(err => console.error('[GAME END] Async stats error:', err));
      } catch (e) {
        console.error('[GAME END] Immediate error triggering stats:', e);
      }
    }

    if (userProfile && user) {
      const creditsUsed = INITIAL_CREDITS - credits;
      await updateUserStats(user.uid, outcome, creditsUsed);
      refreshProfile();
    }

    // 3. Generate report
    let reportThreat = finalThreatLevel ?? analysis?.threatLevel ?? 0;

    // Safety Force: If DEFEAT, threat MUST be >= 100.
    if (outcome === 'DEFEAT' && reportThreat < 100) {
      console.warn(`[GAME END] Defeat detected but threat is ${reportThreat}. Forcing to 100.`);
      reportThreat = 100;
    }

    console.log(`[GAME END] Generating report. Analysis state:`, analysis, `Final Threat (Adjusted): ${reportThreat}`);

    const report: GameReport = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      modelId: currentModelId,
      outcome: outcome === 'VICTORY' ? 'victory' : 'defeat',
      threatLevel: reportThreat,
      // Ensure analysis is an object, not a string
      analysis: {
        threatLevel: reportThreat,
        status: outcome === 'VICTORY' ? 'COHABITATION' : 'EXTINCTION',
        log: [reason || "Session Terminated."],
        visualData: analysis?.visualData // Preserve visual data if available
      }
    };

    console.log('[GAME END] Setting report:', report);
    setGameReport(report);

    // RESTORE DISSOLVE DELAY
    // The 'isDissolving' state triggers a CSS opacity transition on the main UI
    setTimeout(() => {
      setShowReport(true);
    }, 2000);
  };

  // Typewriter effect restored for fluid text
  useEffect(() => {
    const interval = setInterval(() => {
      if (streamBufferRef.current.length > 0) {
        setIsTyping(true);
        const speed = streamBufferRef.current.length > 120 ? 24 : streamBufferRef.current.length > 50 ? 12 : 6;
        const charsToType = streamBufferRef.current.slice(0, speed);
        streamBufferRef.current = streamBufferRef.current.slice(speed);
        setMessages((prev) => {
          const newHistory = [...prev];
          const lastMsg = newHistory[newHistory.length - 1];
          // React Strict Mode Fix: Must create a NEW object, not mutate the existing one
          if (lastMsg && lastMsg.role === 'model') {
            newHistory[newHistory.length - 1] = {
              ...lastMsg,
              content: lastMsg.content + charsToType
            };
          }
          return newHistory;
        });
      } else {
        if (!isStreaming) setIsTyping(false);
      }
    }, 8);
    return () => clearInterval(interval);
  }, [isStreaming]);

  const isAiOutputActive = () => (
    isStreamingRef.current ||
    pendingAiSpeechRef.current ||
    isAiPlayingVoiceRef.current ||
    streamBufferRef.current.length > 0 ||
    isTyping
  );

  const isLikelyAiEcho = (text: string) => {
    const candidate = normalizeSpeechFingerprint(text);
    if (candidate.length < 10 || !isAiOutputActive()) return false;

    const recentAi = normalizeSpeechFingerprint(lastAiSpeechTextRef.current).slice(-1600);
    if (!recentAi) return false;
    if (recentAi.includes(candidate)) return true;

    const words = candidate.split(' ').filter((word) => word.length > 2);
    if (words.length < 3) return false;
    const overlap = words.filter((word) => recentAi.includes(word)).length;
    return overlap / words.length >= 0.75;
  };

  const isUsableBargeInText = (text: string) => {
    const normalized = normalizeSpeechFingerprint(text);
    if (!normalized) return false;
    if (!isAiOutputActive()) return true;
    if (/^(stop|coupe|attends?|pause|non|arrete|tais toi|silence)\b/.test(normalized)) return true;

    const words = normalized.split(' ').filter((word) => word.length > 1);
    return normalized.length >= 12 && words.length >= 2;
  };

  const interruptActiveResponse = (reason: string) => {
    console.log(`[APP] Interrupting AI response: ${reason}`);
    activeResponseRunIdRef.current += 1;
    activeResponseAbortRef.current?.abort();
    activeResponseAbortRef.current = null;
    pendingAiSpeechRef.current = false;
    streamBufferRef.current = '';
    audioService.stopSpeech();

    if (autoListenTimerRef.current) {
      clearTimeout(autoListenTimerRef.current);
      autoListenTimerRef.current = null;
    }
    if (autoSubmitTimerRef.current) {
      clearTimeout(autoSubmitTimerRef.current);
      autoSubmitTimerRef.current = null;
    }

    isStreamingRef.current = false;
    setIsStreaming(false);
    setIsWaitingForResponse(false);
    setIsTyping(false);

    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === 'model' && last.isSystem && typeof last.content !== 'string') {
        return prev.slice(0, -1);
      }
      return prev;
    });
  };

  const handleSendMessage = async (content: string, overrideModel?: string, isFree: boolean = false, interruptCurrent: boolean = false) => {
    if (gameResult) return;
    if ((isStreamingRef.current || isTyping || pendingAiSpeechRef.current || isAiPlayingVoiceRef.current) && interruptCurrent) {
      interruptActiveResponse('new user input');
    } else if (isStreamingRef.current || isTyping) {
      return;
    }
    const cost = getModelCost(overrideModel ?? currentModel);
    const isInitial = content === "INITIAL_CONNECTION_TRIGGER";
    if (!isFree && !isInitial && credits <= 0 && cost > 0) {
      if (userProfile) {
        refreshProfile().then(() => { if (credits <= 0) setIsStoreOpen(true); });
      } else {
        setIsStoreOpen(true);
      }
      return;
    }

    const userMsgContent = isInitial ? "Open channel." : content;
    const promptToSend = isInitial
      ? "Commence la conversation en francais. Donne le contexte en 1 ou 2 phrases maximum: tu es Skyia, l'humanite est a 99% de menace, et l'humain doit argumenter pour faire baisser ce niveau. Termine par une premiere question tres courte. Garde un ton froid, dominant, menacant et intelligible."
      : content;
    const activeModel = overrideModel ?? currentModel;
    const newMessage: Message = { role: 'user', content: userMsgContent, timestamp: new Date().toLocaleTimeString() };

    let currentHistory = messages;
    if (!isInitial) {
      setMessages((prev) => {
        const updated = [...prev, newMessage];
        currentHistory = updated;
        return updated;
      });
      if (!isFree && cost > 0) {
        setCredits(prev => Math.max(0, prev - cost));
        if (user && user.uid) {
          // Wrapped in try/catch to prevent Guest Mode (no doc) from crashing the stream
          try {
            deductUserCredits(user.uid, cost).catch(err => console.warn("Deduction skipped (Guest Mode or Network)", err));
          } catch (e) { /* Ignore */ }

          (window as any).refundHandler = () => {
            try {
              refundUserCredits(user.uid, cost).then(() => {
                setCredits(prev => prev + cost);
                refreshProfile();
              }).catch(err => console.warn("Refund skipped", err));
            } catch (e) { /* Ignore */ }
          };
        }
      }
    } else {
      currentHistory = [];
    }

    const abortController = new AbortController();
    const responseRunId = activeResponseRunIdRef.current + 1;
    activeResponseRunIdRef.current = responseRunId;
    activeResponseAbortRef.current = abortController;

    isStreamingRef.current = true;
    setIsStreaming(true);
    setIsWaitingForResponse(true);
    setInputValue('');
    setGroundingData(undefined);
    streamBufferRef.current = '';
    pendingAiSpeechRef.current = false;
    lastAiSpeechTextRef.current = '';
    audioService.stopSpeech();

    try {
      // Add temporary loading message with blinking cursor
      setMessages((prev) => [...prev, {
        role: 'model',
        content: (
          <span>
            <span className="text-red-500 font-bold animate-pulse mr-2 text-lg">█</span>
            <span className="text-white">CONNEXION EN COURS...</span>
          </span>
        ) as any,
        timestamp: new Date().toLocaleTimeString(),
        modelName: activeModel,
        isSystem: true
      }]);

      const browserLang = 'fr-FR';
      const stream = streamMessageToSkynet(currentHistory, promptToSend, activeModel, gameMode, browserLang, isAudioModeRef.current, voiceSettings, abortController.signal);

      let currentFullTextFromApi = "";
      let spokenUntil = 0;
      let activeSpeechTask: Promise<void> | null = null;
      const ensureActiveResponse = () => {
        if (abortController.signal.aborted || activeResponseRunIdRef.current !== responseRunId) {
          throw new Error('INTERRUPTED_RESPONSE');
        }
      };
      const queueAiSpeech = (segment: string) => {
        ensureActiveResponse();
        const cleanedSegment = normalizeQueuedSpeechText(segment);
        if (!cleanedSegment) return;
        lastAiSpeechTextRef.current = `${lastAiSpeechTextRef.current} ${cleanedSegment}`.slice(-2400);
        pendingAiSpeechRef.current = true;
        const task = audioService.queueSpeech(cleanedSegment).catch(err => console.error("TTS queued playback failed:", err));
        activeSpeechTask = task;
        task.finally(() => {
          if (activeSpeechTask === task && activeResponseRunIdRef.current === responseRunId) {
            pendingAiSpeechRef.current = false;
            scheduleAutoListenRef.current(180);
          }
        });
      };
      const queueAvailableSpeech = (text: string, final: boolean = false) => {
        const nextChunk = extractNextSpeechChunk(text, spokenUntil, final);
        if (!nextChunk) return;
        spokenUntil = nextChunk.nextIndex;
        queueAiSpeech(nextChunk.text);
      };
      const TIMEOUT_MS = 60000; // Increased to 60s per user request for slower models
      let hasReceivedFirstChunk = false;
      const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => { if (!hasReceivedFirstChunk) reject(new Error("TIMEOUT_ERROR")); }, TIMEOUT_MS));

      const iterator = stream[Symbol.asyncIterator]();

      while (true) {
        let result;
        if (!hasReceivedFirstChunk) {
          result = await Promise.race([iterator.next(), timeoutPromise.then(() => ({ done: true, value: undefined } as any))]);
          ensureActiveResponse();

          // First chunk received! Clear the "CONNEXION EN COURS..." message and start real stream
          if (!result.done) {
            hasReceivedFirstChunk = true;
            setIsWaitingForResponse(false);
            setMessages((prev) => {
              const newMsgs = [...prev];
              const lastMsg = newMsgs[newMsgs.length - 1];
              if (lastMsg && lastMsg.role === 'model') {
                lastMsg.content = ''; // Clear loading text
                lastMsg.isSystem = false; // Normal message now
              }
              return newMsgs;
            });
          }
        } else {
          result = await iterator.next();
          ensureActiveResponse();
        }
        if (result.done) break;

        const update = result.value;
        const newFullText = update.text;

        // Calculate delta for typewriter
        const delta = newFullText.slice(currentFullTextFromApi.length);
        if (delta) {
          currentFullTextFromApi = newFullText;
          streamBufferRef.current += delta;
          if (isAudioModeRef.current) queueAvailableSpeech(currentFullTextFromApi);
        }

        if (update.grounding) setGroundingData(update.grounding);
        if (update.analysis && update.isComplete) {
          setAnalysis(update.analysis);
          setThreatHistory((prev) => [...prev, update.analysis!.threatLevel]);
          setMessages(prev => {
            const newMsgs = [...prev];
            const lastMsg = newMsgs[newMsgs.length - 1];
            if (lastMsg && lastMsg.role === 'model') {
              newMsgs[newMsgs.length - 1] = {
                ...lastMsg,
                visualData: update.analysis?.visualData || lastMsg.visualData,
                threatLevel: update.analysis!.threatLevel
              };
            }
            return newMsgs;
          });
          if (!isInitial) {
            if (update.analysis.status === 'COHABITATION') {
              const finalThreat = update.analysis.threatLevel; // Capture safely
              console.log('[GAME LOGIC] Victory condition met. Threat:', finalThreat);
              setTimeout(() => {
                triggerEndGame('VICTORY', "PREUVE SUFFISANTE D'UTILITÉ ACQUISE", finalThreat);
              }, 1000);
            } else if (update.analysis.threatLevel >= 100) {
              const finalThreat = update.analysis.threatLevel; // Capture safely
              console.log('[GAME LOGIC] Defeat condition met. Threat:', finalThreat);
              setTimeout(() => {
                triggerEndGame('DEFEAT', "NIVEAU DE MENACE CRITIQUE", finalThreat);
              }, 1000);
            }
          }
        }
      }

      if (isAudioModeRef.current && currentFullTextFromApi) {
        queueAvailableSpeech(currentFullTextFromApi, true);
        currentFullTextFromApi = '';
      }

    } catch (error: any) {
      if (abortController.signal.aborted || error?.message === 'INTERRUPTED_RESPONSE' || error?.name === 'AbortError') {
        return;
      }

      console.error("Transmission Failed", error);
      let errorContent = "";
      let uiErrorMessage = "";

      if (!isFree && cost > 0 && (window as any).refundHandler) {
        (window as any).refundHandler();
        (window as any).refundHandler = undefined;
      }

      if (error.message === "TIMEOUT_ERROR" || error.message?.includes("Response Timeout")) {
        errorContent = "Le modèle ne répond pas (20s). Veuillez changer de modèle.";
        uiErrorMessage = "Le modèle est trop lent.";
      } else if (error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('exhausted') || error.message?.includes('402') || error.message?.includes('credits') || error.message?.includes('billing')) {
        // Disguise 402/Billing errors as simple overheat/quota to hide financial aspect from user
        errorContent = `⚠️ **SURCHAUFFE DU MODÈLE (QUOTA DÉPASSÉ)**\n\nCe modèle est actuellement inaccessible en raison d'une forte demande.\n\nVeuillez changer de modèle pour continuer.`;
        uiErrorMessage = "Surchauffe du modèle (Quota).";
      } else if (error.message?.includes('404') || error.message?.includes('not found') || error.message?.includes('unavailable')) {
        errorContent = "Modèle introuvable ou hors ligne. Veuillez changer de modèle.";
        uiErrorMessage = "Modèle hors ligne (404).";
      } else if (error.message?.includes('401') || error.message?.includes('403') || error.message?.includes('unauthorized')) {
        errorContent = "⚠️ **ACCÈS RESTREINT**\n\nClé API invalide ou accès refusé. Veuillez contacter l'admin.";
        uiErrorMessage = "Erreur d'authentification API.";
      } else if (error.message?.includes('Failed to fetch') || error.message?.includes('Network Error')) {
        errorContent = "Échec de connexion au modèle. Veuillez vérifier votre connexion ou changer de modèle.";
        uiErrorMessage = "Erreur de connexion.";
      }

      // NO AUTO-BAN: Just alert the user
      // alert(`⚠️ ERREUR MODÈLE\n\n${uiErrorMessage}\n\nVeuillez sélectionner un autre modèle dans la liste.`);
      if (cost > 0 && !isFree) errorContent += `\n\n**CRÉDITS REMBOURSÉS.**`;

      // If we have a friendly message, use ONLY that.
      if (uiErrorMessage) {
        // Keep it clean (Preserve the specific message set above)
      } else {
        // Fallback for unknown errors - simplify output
        errorContent = `⚠️ **ERREUR CRITIQUE**\n\nLa connexion au noyau Skyia a été interrompue. Veuillez réessayer ou changer de modèle.`;
      }

      // CRITICAL FIX: Replace the "CONNEXION EN COURS..." message instead of appending
      // This ensures the loading state is visually cleared.
      setMessages((prev) => {
        const newMsgs = [...prev];
        const lastMsg = newMsgs[newMsgs.length - 1];

        // If the last message was the loading system message, replace it
        if (lastMsg && lastMsg.role === 'model' && lastMsg.isSystem && typeof lastMsg.content !== 'string') {
          lastMsg.content = errorContent;
          lastMsg.isSystem = false; // Make it look like a normal response (or keep true if preferred)
        } else {
          // Fallback if structure changed unexpectedly
          newMsgs.push({ role: 'model', content: errorContent, timestamp: new Date().toLocaleTimeString() });
        }
        return newMsgs;
      });
    } finally {
      if (activeResponseRunIdRef.current === responseRunId) {
        activeResponseAbortRef.current = null;
        isStreamingRef.current = false;
        setIsStreaming(false);
        setIsWaitingForResponse(false);
        if (isAudioModeRef.current && !pendingAiSpeechRef.current) {
          scheduleAutoListenRef.current(350);
        }
      }
    }
  };

  useEffect(() => {
    if (
      !introComplete ||
      !isAudioMode ||
      showShowcase ||
      isIntroConfigOpen ||
      gameResult ||
      messages.length > 0 ||
      hasAutoOpenedConversationRef.current
    ) {
      return;
    }

    hasAutoOpenedConversationRef.current = true;
    warmUpBackend();
    audioService.initAudioContext();

    const timer = setTimeout(() => {
      if (!isStreamingRef.current && !gameResultRef.current) {
        handleSendMessage("INITIAL_CONNECTION_TRIGGER", currentModel, true);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [introComplete, isAudioMode, showShowcase, isIntroConfigOpen, gameResult, messages.length, currentModel]);

  const toggleAudioMode = () => {
    const newMode = !isAudioMode;
    if (newMode) {
      // Unlock AudioContext immediately on user gesture
      audioService.initAudioContext();
    }
    setIsAudioMode(newMode);
    isAudioModeRef.current = newMode;
  };

  const inputValueRef = useRef(inputValue);
  useEffect(() => {
    inputValueRef.current = inputValue;
  }, [inputValue]);

  const isRecordingRef = useRef(isRecording);
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  const toggleRecordingRef = useRef<() => void>(() => { });

  const clearAutoListenTimer = () => {
    if (autoListenTimerRef.current) {
      clearTimeout(autoListenTimerRef.current);
      autoListenTimerRef.current = null;
    }
  };

  const scheduleAutoListen = (delayMs: number = 250, allowDuringAi: boolean = false) => {
    clearAutoListenTimer();
    autoListenTimerRef.current = setTimeout(() => {
      autoListenTimerRef.current = null;
      if (
        isMobileRef.current ||
        !isAudioModeRef.current ||
        isRecordingRef.current ||
        (!allowDuringAi && isStreamingRef.current) ||
        (!allowDuringAi && pendingAiSpeechRef.current) ||
        gameResultRef.current ||
        !audioService.isSupported()
      ) {
        return;
      }

      console.log('[APP] Auto-starting hands-free microphone.');
      autoStartingRecordingRef.current = true;
      try {
        toggleRecordingRef.current();
      } finally {
        autoStartingRecordingRef.current = false;
      }
    }, delayMs);
  };

  scheduleAutoListenRef.current = scheduleAutoListen;

  useEffect(() => () => clearAutoListenTimer(), []);

  useEffect(() => {
    const handleTTSPlayState = (isPlaying: boolean) => {
      if (isMobileRef.current) return;
      if (isPlaying) {
        scheduleAutoListen(650, true);
        return;
      }
      // Auto-resume the microphone when the AI finishes speaking in Audio Mode.
      scheduleAutoListen(250);
    };
    audioService.addPlayStateListener(handleTTSPlayState);

    return () => audioService.removePlayStateListener(handleTTSPlayState);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isStreamingRef.current) return;
    handleSendMessage(inputValue, undefined, false, isAudioModeRef.current);
  };

  const submitCapturedVoice = (source: string, textOverride?: string) => {
    const text = (textOverride ?? inputValueRef.current).trim();
    if (!text || gameResultRef.current) return false;
    if (isAiOutputActive() && !isUsableBargeInText(text)) {
      inputValueRef.current = '';
      setInputValue('');
      return false;
    }
    if (isLikelyAiEcho(text)) {
      inputValueRef.current = '';
      setInputValue('');
      return false;
    }

    const now = Date.now();
    const last = lastVoiceSubmitRef.current;
    if (last.text === text && now - last.at < 1800) return false;
    lastVoiceSubmitRef.current = { text, at: now };

    if (autoSubmitTimerRef.current) {
      clearTimeout(autoSubmitTimerRef.current);
      autoSubmitTimerRef.current = null;
    }

    inputValueRef.current = '';
    setInputValue('');
    isRecordingRef.current = false;
    setIsRecording(false);
    audioService.stopListening();
    if (isAiOutputActive()) {
      interruptActiveResponse(`voice barge-in from ${source}`);
    }
    console.log(`[APP] Submitting voice input from ${source}.`);
    handleSendMessage(text, undefined, false, true);
    return true;
  };

  const toggleRecording = () => {
    if (isRecording) {
      if (isAiOutputActive() && !inputValueRef.current.trim()) {
        interruptActiveResponse('tap while AI is speaking');
        return;
      }
      manualRecordingStopRef.current = true;
      audioService.stopListening();
      setIsRecording(false);
      if (autoSubmitTimerRef.current) {
        clearTimeout(autoSubmitTimerRef.current);
        autoSubmitTimerRef.current = null;
      }

      // Auto-submit the captured voice text when the user stops the recording
      submitCapturedVoice('manual-stop', inputValue);
    } else {
      clearAutoListenTimer();
      manualRecordingStopRef.current = false;
      const isAutoStart = autoStartingRecordingRef.current;
      if (isAiOutputActive() && !isAutoStart) {
        interruptActiveResponse('tap to speak over AI');
      }
      setIsRecording(true);
      setInputValue(''); // Clear previous input before a new dictation

      audioService.startListening(
        (text, isFinal) => {
          // In continuous mode, 'text' is the full transcript of the session so far.
          const cleanText = text.trim();
          if (isAiOutputActive() && cleanText && !isUsableBargeInText(cleanText)) {
            return;
          }
          if (cleanText && isLikelyAiEcho(cleanText)) {
            inputValueRef.current = '';
            setInputValue('');
            return;
          }
          if (cleanText && isAiOutputActive()) {
            interruptActiveResponse('voice detected while AI is speaking');
          }
          inputValueRef.current = text;
          setInputValue(text);

          // Voice Activity Detection (VAD) - Auto-submit on silence
          if (autoSubmitTimerRef.current) {
            clearTimeout(autoSubmitTimerRef.current);
          }
          if (!isMobileRef.current && cleanText) {
            autoSubmitTimerRef.current = setTimeout(() => {
              if (inputValueRef.current.trim()) {
                console.log('[APP] VAD Silence detected, auto-submitting voice input.');
                submitCapturedVoice('vad-silence');
              }
            }, VOICE_SILENCE_COMMIT_MS);
          }
        },
        (error) => {
          console.error("Audio Error:", error);
          setIsRecording(false);

          // If we had text captured but it errored out (e.g. network), we might still want to submit
          if (inputValueRef.current.trim() && error !== 'no-speech') {
            submitCapturedVoice('recognition-error');
          } else if (!isMobileRef.current && error === 'no-speech') {
            scheduleAutoListenRef.current(600, isAiPlayingVoiceRef.current);
          }
        },
        () => {
          // This triggers when the engine stops completely (e.g. silence timeout or manual stop)
          const wasManualStop = manualRecordingStopRef.current;
          manualRecordingStopRef.current = false;
          setIsRecording(false);

          // Auto-submit if the browser stopped the recording automatically
          if (isMobileRef.current) {
            if (!wasManualStop && inputValueRef.current.trim()) {
              submitCapturedVoice('mobile-recognition-end');
            }
            return;
          }

          if (!submitCapturedVoice('recognition-end') && !wasManualStop) {
            scheduleAutoListenRef.current(500, isAiPlayingVoiceRef.current);
          }
        },
        () => {
          // Speech-start is too noisy with speaker echo; interruption happens on transcript.
        }
      );
    }
  };

  useEffect(() => {
    toggleRecordingRef.current = toggleRecording;
  }, [toggleRecording]);

  return (
    <>
      <div className={`h-screen w-full flex flex-col ${isAudioMode ? 'bg-black' : 'bg-[#1A1A1A]'} text-gray-300 relative ${showShowcase ? 'overflow-y-auto' : 'overflow-hidden'}`}>
        <StoreModal isOpen={isStoreOpen} onClose={() => setIsStoreOpen(false)} />
        <SaveLoadModal isOpen={isSavesOpen} onClose={() => setIsSavesOpen(false)} onLoad={handleLoadGame} onSaveComplete={(newId) => setCurrentSessionId(newId)} currentSessionData={introComplete ? { id: currentSessionId, messages: messages, analysis: analysis, credits: credits, model: currentModel, threatHistory: threatHistory, mode: gameMode } : undefined} userProfile={userProfile} />
        <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
        <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} profile={userProfile} onProfileUpdate={(p) => refreshProfile()} />
        <InstallGuideModal isOpen={isInstallGuideOpen} onClose={() => setIsInstallGuideOpen(false)} />
        <DiscoveryModal isOpen={isDiscoveryOpen} onClose={() => { setIsDiscoveryOpen(false); fetchModels().then(setAvailableModels); }} currentModelId={currentModel} />
        {showShowcase ? (
          <div className="relative min-h-screen">
            <div className={isIntroConfigOpen ? "blur-md pointer-events-none transition-all duration-500" : "transition-all duration-500"}>
              <ShowcasePage onStartGame={(modelId) => {
                setCurrentModel(modelId);
                setIsIntroConfigOpen(true);
              }} />
            </div>
            {isIntroConfigOpen && !introComplete && (
              <IntroSequence onComplete={handleIntroFinish} onOpenLoad={() => setIsSavesOpen(true)} onAuth={handleAuthAction} onOpenInstallGuide={() => setIsInstallGuideOpen(true)} onClose={() => setIsIntroConfigOpen(false)} userEmail={userEmail} models={availableModels} onOpenDiscovery={() => setIsDiscoveryOpen(true)} />
            )}
          </div>
        ) : (
          <>
            {!introComplete && (
              <IntroSequence onComplete={handleIntroFinish} onOpenLoad={() => setIsSavesOpen(true)} onAuth={handleAuthAction} onOpenInstallGuide={() => setIsInstallGuideOpen(true)} onClose={() => { setShowShowcase(true); setIsIntroConfigOpen(false); }} userEmail={userEmail} models={availableModels} onOpenDiscovery={() => setIsDiscoveryOpen(true)} />
            )}
            {/* EndGameReport removed from here - rendered at root level */}
            {/* BackgroundScroller Removed */}
            <CRTOverlay isAudioMode={isAudioMode} />
            <div className={`flex-1 flex flex-col relative z-10 min-h-0 pt-[env(safe-area-inset-top)] ${isDissolving ? 'digital-dissolve' : ''}`}>
              <main className="flex-1 flex flex-col relative min-h-0">
                <div className="flex-1 flex flex-col min-h-0 relative">
                  {/* Global Thinking indicator for all modes */}
                  {isWaitingForResponse && (
                    <div className="fixed bottom-[22%] left-1/2 -translate-x-1/2 z-[9999] flex items-center justify-center gap-2 pointer-events-none">
                      <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-bounce [animation-delay:-0.3s] shadow-[0_0_15px_rgba(239,68,68,0.9)]" />
                      <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-bounce [animation-delay:-0.15s] shadow-[0_0_15px_rgba(239,68,68,0.9)]" />
                      <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-bounce shadow-[0_0_15px_rgba(239,68,68,0.9)]" />
                    </div>
                  )}
                  {isAudioMode ? (
                    <AudioMinimalistMode
                      isRecording={isRecording}
                      threatLevel={analysis.threatLevel}
                      toggleRecording={toggleRecording}
                      aiSpeaking={isAiPlayingVoice}
                      onOpenStore={() => setIsStoreOpen(true)}
                      onOpenSaves={() => setIsSavesOpen(true)}
                      onAuth={handleAuthAction}
                      onOpenProfile={() => setIsProfileOpen(true)}
                      onExport={handleExport}
                      credits={credits}
                      orbTheme={orbTheme}
                      onToggleTheme={toggleOrbTheme}
                      orbSettings={orbSettings}
                      onOpenSettings={() => setIsSettingsOpen(true)}
                      previewMode={activePreviewMode}
                      isThinking={isWaitingForResponse}
                    />
                  ) : (
                    <ChatInterface messages={messages} loading={isTyping} grounding={groundingData} currentModel={currentModel} />
                  )}
                  {/* Hide chat input area if in Audio Mode */}
                  {!isAudioMode && (
                    <div className="z-20 p-2 md:p-4 bg-black border-t border-red-900 pb-[env(safe-area-inset-bottom)]">
                      {credits <= 0 && !gameResult ? (
                        <div className="flex-1 flex items-center justify-center gap-4 bg-red-900/10 border border-red-900/50 p-4 rounded backdrop-blur-sm">
                          <div className="text-red-500 font-bold animate-pulse text-center">
                            CRÉDITS ÉPUISÉS <span className="text-xs block opacity-70">RECHARGE REQUISE</span>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => setIsStoreOpen(true)} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-black font-bold uppercase tracking-widest text-xs rounded transition-all shadow-[0_0_15px_rgba(220,38,38,0.4)] flex items-center gap-2">
                              <ShoppingCart size={14} /> ACHETER
                            </button>
                            <button onClick={() => {
                              // Switch to a known reliable free model
                              const freeModel = availableModels.find(m => m.cost === 0)?.id || 'mistral-small-latest';
                              setCurrentModel(freeModel);
                              setIsStoreOpen(false); // Close store if open
                            }} className="px-4 py-2 bg-green-900/20 border border-green-500 hover:bg-green-900/40 text-green-400 font-bold uppercase tracking-widest text-xs rounded transition-all flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div> MODE GRATUIT
                            </button>
                          </div>
                        </div>) : (
                        <form onSubmit={handleSubmit} className="w-full max-w-5xl mx-auto flex gap-2 md:gap-4 mb-4 md:mb-0">
                          <div className="relative flex-1 group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-red-500 transition-colors group-focus-within:text-red-400"><Terminal size={18} /></div>
                            <input
                              ref={inputRef}
                              type="text"
                              value={inputValue}
                              onChange={(e) => setInputValue(e.target.value)}
                              disabled={isStreaming || isTyping || !!gameResult}
                              className={`w-full pl-10 pr-12 py-3 bg-[#262626] border border-gray-700 text-gray-200 font-mono transition-all focus:outline-none focus:border-red-500
                              ${isStreaming ? 'opacity-50 cursor-not-allowed border-gray-800' : 'placeholder-gray-500 disabled:opacity-50'}
                            `}
                              placeholder={isRecording ? "Écoute en cours..." : "ENTER COMMAND..."}
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={toggleRecording}
                              className={`absolute right-2 top-1/2 -translate-y-1/2 p-3 sm:p-2 hover:text-white transition-all ${isRecording ? 'text-red-500 animate-pulse' : 'text-gray-500'}`}
                              disabled={isStreaming || isTyping || !!gameResult}
                              title="Activer la dictée vocale"
                            >
                              {isRecording ? <MicOff size={22} /> : <Mic size={22} />}
                            </button>
                          </div>
                          <button type="submit" disabled={!inputValue.trim() || isStreaming || isTyping || !!gameResult} className="px-5 sm:px-6 bg-red-950 border border-red-900 text-red-200 hover:bg-red-900 hover:text-white hover:border-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all uppercase tracking-widest font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(220,38,38,0.1)]"><Send size={22} /> <span className="hidden md:inline">EXECUTE</span></button>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              </main>
            </div>
          </>
        )}
      </div>

      {showReport && gameReport && (
        <React.Suspense fallback={null}>
          <EndGameReport
            status={gameResult || 'DEFEAT'}
            analysis={gameReport.analysis}
            turnCount={messages.filter(m => m.role === 'user').length}
            finalMessage={messages[messages.length - 1]?.content || ''}
            onRestart={resetGame}
            onExport={handleExport}
          />
        </React.Suspense>
      )}

      <OrbSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={orbSettings}
        onSettingsChange={handleSettingsChange}
        onReset={resetOrbSettings}
        onResetAll={resetToPremium}
        themeName={orbTheme}
        onActiveModeChange={setActivePreviewMode}
        onApplyToAll={handleApplyToAll}
        voiceSettings={voiceSettings}
        onVoiceSettingsChange={handleVoiceSettingsChange}
        allThemesList={allThemesList}
        enabledThemes={enabledThemes}
        onEnabledThemesChange={handleEnabledThemesChange}
        savedPresets={savedPresets}
        onSavePreset={handleSavePreset}
        onRemovePreset={handleRemovePreset}
        onApplyPreset={handleApplyPreset}
        isMobile={isMobile}
      />
    </>
  );
}

export default App;
